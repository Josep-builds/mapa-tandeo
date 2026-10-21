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

  it("reports every bad row, not just the first", () => {
    const csv =
      "timestamp,pressure_bar\n" +
      "2026-01-01T00:00:00Z,0.8\n" + // good
      "not-a-date,0.7\n" + // row 3: bad date
      "2026-01-01T00:02:00Z,-1\n"; // row 4: negative pressure
    const result = parseAndValidateCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Fila 3");
      expect(result.error).toContain("Fila 4");
    }
  });

  it("caps the number of reported row errors and notes how many more there were", () => {
    const rows = Array.from({ length: 25 }, () => "not-a-date,0.5").join("\n");
    const result = parseAndValidateCsv(`timestamp,pressure_bar\n${rows}\n`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.split("\n")).toHaveLength(21); // 20 row errors + the "y N más" line
      expect(result.error).toContain("5 fila(s) más");
    }
  });
});
