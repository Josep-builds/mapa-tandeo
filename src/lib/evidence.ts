import type { BlockWeekStatRow } from "./types";

export const EVIDENCE_METHOD_NOTES = {
  usable_pressure_threshold_bar: 0.6,
  comparison_rule: "inequality_ratio = median(comparison colonia hours) / median(Iztapalapa study hours)",
  labels: "is_simulated = true marks invented data from the labeled simulator; source = real_test marks an uploaded logger reading.",
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
