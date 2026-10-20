import type { BlockWeekStatRow } from "./types";

export const EVIDENCE_METHOD_NOTES = {
  usable_pressure_threshold_bar: 0.6,
  comparison_rule:
    "desigualdad = mediana de horas de la colonia de comparación ÷ mediana de horas de las cuadras de Iztapalapa",
  labels:
    "is_simulated = true marca datos inventados por el simulador etiquetado; source = real_test marca una lectura subida por una promotora.",
};

/** Deterministic CSV: fixed column order, rows sorted by block_id, so a byte-identical file is reproducible from the same data. */
export function buildBlockWeekStatsCsv(stats: BlockWeekStatRow[]): string {
  const sorted = [...stats].sort((a, b) => a.block_id.localeCompare(b.block_id));
  const header = "block_id,week_start,usable_hours,events,verified,is_simulated";
  const rows = sorted.map(
    (s) => `${s.block_id},${s.week_start},${s.usable_hours},${s.events},${s.verified},${s.is_simulated}`,
  );
  return [header, ...rows].join("\n") + "\n";
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildManifest(week: string, csv: string) {
  return {
    week_start: week,
    generated_at: new Date().toISOString(),
    files: [
      {
        name: "block_week_stats.csv",
        sha256: await sha256Hex(csv),
        bytes: new TextEncoder().encode(csv).length,
      },
    ],
    method: EVIDENCE_METHOD_NOTES,
  };
}
