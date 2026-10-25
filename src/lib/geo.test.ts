import { describe, expect, it } from "vitest";
import { haversineKm } from "./geo";

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(19.35, -99.06, 19.35, -99.06)).toBeCloseTo(0, 6);
  });

  it("matches a known distance (~1.1 km over 0.01° latitude near Mexico City)", () => {
    const d = haversineKm(19.35, -99.06, 19.36, -99.06);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });

  it("is symmetric", () => {
    const a = haversineKm(19.35, -99.06, 19.4, -99.17);
    const b = haversineKm(19.4, -99.17, 19.35, -99.06);
    expect(a).toBeCloseTo(b, 9);
  });
});
