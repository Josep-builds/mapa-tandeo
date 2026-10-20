import Papa from "papaparse";
import { z } from "zod";

export const MAX_CSV_BYTES = 1_000_000;
export const MAX_CSV_ROWS = 5000;

const RowSchema = z.object({
  timestamp: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Fecha inválida"),
  pressure_bar: z.coerce
    .number("La presión debe ser un número")
    .min(0, "La presión no puede ser negativa")
    .max(10, "La presión no puede ser mayor a 10 bar"),
});

export interface ParsedReading {
  ts: Date;
  pressure_bar: number;
}

export type ParseResult = { ok: true; readings: ParsedReading[] } | { ok: false; error: string };

/** Strict CSV validation: the whole file is rejected on any violation — never a partial accept. */
export function parseAndValidateCsv(text: string): ParseResult {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) {
    return { ok: false, error: "El archivo pesa más de 1 MB." };
  }

  // Real exports vary in header casing/spacing ("Timestamp", " Pressure_Bar ") —
  // normalize so those still match our two expected columns.
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (parsed.errors.length > 0) {
    return { ok: false, error: `Error al leer el CSV: ${parsed.errors[0].message}` };
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return { ok: false, error: "El archivo no tiene filas." };
  }
  if (rows.length > MAX_CSV_ROWS) {
    return { ok: false, error: `El archivo tiene ${rows.length} filas; el máximo es ${MAX_CSV_ROWS}.` };
  }

  const headers = new Set(parsed.meta.fields ?? []);
  if (!headers.has("timestamp") || !headers.has("pressure_bar")) {
    return { ok: false, error: "El archivo debe tener las columnas 'timestamp' y 'pressure_bar'." };
  }

  const readings: ParsedReading[] = [];
  for (let i = 0; i < rows.length; i++) {
    const result = RowSchema.safeParse(rows[i]);
    if (!result.success) {
      return { ok: false, error: `Fila ${i + 2}: ${result.error.issues[0].message}.` };
    }
    readings.push({ ts: new Date(result.data.timestamp), pressure_bar: result.data.pressure_bar });
  }

  return { ok: true, readings };
}
