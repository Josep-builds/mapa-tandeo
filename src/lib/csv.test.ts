import { describe, expect, it } from "vitest";
import { MAX_CSV_ROWS, parseAndValidateCsv } from "./csv";

describe("parseAndValidateCsv", () => {
  it("accepts a well-formed file", () => {
    const csv = "timestamp,pressure_bar\n2026-01-01T00:00:00Z,0.8\n2026-01-01T00:01:00Z,0.9\n";
    const result = parseAndValidateCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.readings).toHaveLength(2);
  });

  it("normalizes header casing and surrounding whitespace", () => {
    const csv = "Timestamp, Pressure_Bar\n2026-01-01T00:00:00Z, 0.8\n";
    const result = parseAndValidateCsv(csv);
    expect(result.ok).toBe(true);
  });

  it("rejects a file missing the required columns, with a clear message", () => {
    const csv = "timestamp,pressure\n2026-01-01T00:00:00Z,0.8\n";
    const result = parseAndValidateCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("timestamp");
  });

  it("rejects an invalid date", () => {
    const result = parseAndValidateCsv("timestamp,pressure_bar\nnot-a-date,0.5\n");
    expect(result.ok).toBe(false);
  });

  it("rejects negative pressure", () => {
    const result = parseAndValidateCsv("timestamp,pressure_bar\n2026-01-01T00:00:00Z,-1\n");
    expect(result.ok).toBe(false);
  });

  it("rejects pressure above 10 bar", () => {
    const result = parseAndValidateCsv("timestamp,pressure_bar\n2026-01-01T00:00:00Z,10.5\n");
    expect(result.ok).toBe(false);
  });

  it("rejects more than the row cap", () => {
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, () => "2026-01-01T00:00:00Z,0.5").join("\n");
    const result = parseAndValidateCsv(`timestamp,pressure_bar\n${rows}\n`);
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the byte cap", () => {
    const bigValue = "x".repeat(1_100_000);
    const result = parseAndValidateCsv(`timestamp,pressure_bar\n${bigValue}\n`);
    expect(result.ok).toBe(false);
  });
});
