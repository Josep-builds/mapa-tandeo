"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseAndValidateCsv } from "@/lib/csv";
import { blockWeekStats, detectEvents, stddev } from "@/lib/ml";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mondayOfUTC, toDateString } from "@/lib/week";

const ON_THRESHOLD = 0.6;
const OFF_THRESHOLD = 0.5;

export interface ActionState {
  ok: boolean;
  message: string;
}

const RegisterDeviceSchema = z.object({
  block_id: z.string().trim().min(1).max(32),
  label: z.string().trim().min(1).max(60),
  before_shutoff_valve: z.boolean(),
});

export async function registerDevice(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = RegisterDeviceSchema.safeParse({
    block_id: formData.get("block_id"),
    label: formData.get("label"),
    before_shutoff_valve: formData.get("before_shutoff_valve") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos del medidor." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión expiró, vuelve a entrar." };

  const { data: block } = await supabase.from("blocks").select("id").eq("id", parsed.data.block_id).maybeSingle();
  if (!block) return { ok: false, message: "Esa cuadra no existe." };

  const { error } = await supabase.from("devices").insert({
    block_id: parsed.data.block_id,
    label: parsed.data.label,
    before_shutoff_valve: parsed.data.before_shutoff_valve,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/panel");
  return { ok: true, message: "Medidor registrado." };
}

const UploadSchema = z.object({ device_id: z.string().uuid() });

export async function uploadReadings(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsedInput = UploadSchema.safeParse({ device_id: formData.get("device_id") });
  const file = formData.get("file");
  if (!parsedInput.success || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecciona un medidor y un archivo CSV." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión expiró, vuelve a entrar." };

  const { data: device } = await supabase
    .from("devices")
    .select("id, block_id")
    .eq("id", parsedInput.data.device_id)
    .maybeSingle();
  if (!device) return { ok: false, message: "Ese medidor no es tuyo o no existe." };

  const text = await file.text();
  const parsedCsv = parseAndValidateCsv(text);
  if (!parsedCsv.ok) return { ok: false, message: parsedCsv.error };

  const rows = parsedCsv.readings.map((r) => ({
    device_id: device.id,
    ts: r.ts.toISOString(),
    pressure_bar: r.pressure_bar,
    source: "real_test" as const,
  }));

  // Batches of 500; upsert so re-uploading a corrected file is safe.
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from("readings").upsert(batch, { onConflict: "device_id,ts" });
    if (error) return { ok: false, message: `Error al guardar lecturas: ${error.message}` };
  }

  const { data: block } = await supabase.from("blocks").select("id, sector, grp").eq("id", device.block_id).maybeSingle();
  if (!block) return { ok: false, message: "No se encontró la cuadra del medidor." };

  const affectedWeeks = Array.from(new Set(parsedCsv.readings.map((r) => toDateString(mondayOfUTC(r.ts)))));

  // Every device *this user* owns on the block — RLS already scopes "devices"
  // to its owner, so this can never read another promotora's logger.
  const { data: siblingDevices } = await supabase.from("devices").select("id").eq("block_id", block.id);

  for (const weekStart of affectedWeeks) {
    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    const weekEndDate = new Date(weekStartDate.getTime() + 7 * 86_400_000);

    const deviceOutcomes: Array<{
      deviceId: string;
      usableHours: number;
      events: number;
      anomalous: boolean;
      anomalyScore: number | null;
    }> = [];

    for (const d of siblingDevices ?? []) {
      const { data: weekReadings } = await supabase
        .from("readings")
        .select("ts, pressure_bar")
        .eq("device_id", d.id)
        .gte("ts", weekStartDate.toISOString())
        .lt("ts", weekEndDate.toISOString());
      if (!weekReadings || weekReadings.length === 0) continue;

      const readings = weekReadings.map((r) => ({ ts: new Date(r.ts), pressure_bar: r.pressure_bar }));
      const { events, usableHours } = detectEvents(readings, {
        on: ON_THRESHOLD,
        off: OFF_THRESHOLD,
        minMinutes: 10,
        maxGapMinutes: 3,
      });

      // A direct tamper signature that needs no peer population to judge:
      // a sensor reporting literally constant pressure all week.
      const constant = readings.length > 10 && stddev(readings.map((r) => r.pressure_bar)) < 0.01;

      deviceOutcomes.push({
        deviceId: d.id,
        usableHours,
        events: events.length,
        anomalous: constant,
        anomalyScore: constant ? 1 : null,
      });
    }

    if (deviceOutcomes.length === 0) continue;

    // Sector average from the already-public block_week_stats of *other*
    // blocks — aggregate reads are public, so this needs no elevated access.
    const { data: sectorStats } = await supabase
      .from("block_week_stats")
      .select("block_id, usable_hours, verified")
      .eq("week_start", weekStart)
      .neq("block_id", block.id);

    let sectorAverageHours = deviceOutcomes.reduce((sum, d) => sum + d.usableHours, 0) / deviceOutcomes.length;
    const verifiedPeerIds = (sectorStats ?? []).filter((s) => s.verified).map((s) => s.block_id);
    if (verifiedPeerIds.length > 0) {
      const { data: peerBlocks } = await supabase
        .from("blocks")
        .select("id")
        .eq("sector", block.sector)
        .eq("grp", block.grp)
        .in("id", verifiedPeerIds);
      const peerIdSet = new Set((peerBlocks ?? []).map((b) => b.id));
      const peerHours = (sectorStats ?? [])
        .filter((s) => peerIdSet.has(s.block_id))
        .map((s) => s.usable_hours);
      if (peerHours.length > 0) {
        sectorAverageHours = peerHours.reduce((a, b) => a + b, 0) / peerHours.length;
      }
    }

    const { stat, flags } = blockWeekStats({
      blockId: block.id,
      weekStart,
      isSimulated: false,
      sectorAverageHours,
      devices: deviceOutcomes,
    });

    const { error: statError } = await supabase
      .from("block_week_stats")
      .upsert(stat, { onConflict: "block_id,week_start" });
    if (statError) return { ok: false, message: `Error al publicar el resultado: ${statError.message}` };

    if (flags.length > 0) {
      const { error: flagError } = await supabase.from("flags").insert(flags);
      if (flagError) return { ok: false, message: `Error al publicar alertas: ${flagError.message}` };
    }
  }

  revalidatePath("/panel");
  revalidatePath(`/cuadra/${block.id}`);
  revalidatePath("/");
  revalidatePath("/prioridad");

  return { ok: true, message: `Se guardaron ${rows.length} lecturas en ${affectedWeeks.length} semana(s).` };
}
