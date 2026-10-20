import { describe, expect, it } from "vitest";
import { inequalityRatio } from "./inequalityRatio";
import { pipaPriority } from "./pipaPriority";
import type { PipaPriorityInput } from "./types";

describe("inequalityRatio", () => {
  it("divides comparison median by study median on a known fixture", () => {
    const studyHours = [3, 5, 6, 9]; // median 5.5
    const comparisonHours = [55, 61, 65]; // median 61

    expect(inequalityRatio(comparisonHours, studyHours)).toBeCloseTo(61 / 5.5, 6);
  });
});

describe("pipaPriority", () => {
  const fixture: PipaPriorityInput[] = [
    { block_id: "IZT-S4-B01", sector: 4, usable_hours: 3, verified: true },
    { block_id: "IZT-S7-B02", sector: 7, usable_hours: 5, verified: true },
    { block_id: "IZT-S2-B03", sector: 2, usable_hours: 6, verified: true },
    { block_id: "IZT-S1-B04", sector: 1, usable_hours: 5, verified: false }, // tie on hours, unverified
    { block_id: "IZT-S9-B05", sector: 9, usable_hours: 3, verified: false }, // tie on hours, unverified
  ];

  it("ranks fewest usable hours first", () => {
    const ranked = pipaPriority(fixture);
    expect(ranked.map((r) => r.block_id)).toEqual([
      "IZT-S4-B01",
      "IZT-S9-B05",
      "IZT-S7-B02",
      "IZT-S1-B04",
      "IZT-S2-B03",
    ]);
  });

  it("breaks hour ties in favor of verified blocks, then by sector", () => {
    const ranked = pipaPriority(fixture);
    const threeHourTie = ranked.filter((r) => r.usable_hours === 3);
    expect(threeHourTie.map((r) => r.block_id)).toEqual(["IZT-S4-B01", "IZT-S9-B05"]);

    const fiveHourTie = ranked.filter((r) => r.usable_hours === 5);
    expect(fiveHourTie.map((r) => r.block_id)).toEqual(["IZT-S7-B02", "IZT-S1-B04"]);
  });
});
