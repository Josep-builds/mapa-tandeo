import { describe, expect, it } from "vitest";
import { blockWeekStats } from "./blockWeekStats";
import { twoLoggerCheck } from "./twoLoggerCheck";

describe("twoLoggerCheck", () => {
  it("passes when two loggers agree within 30%", () => {
    expect(twoLoggerCheck([10, 12])).toBe(true);
  });

  it("fails when two loggers differ by more than 30%", () => {
    expect(twoLoggerCheck([10, 15])).toBe(false);
  });
});

describe("blockWeekStats", () => {
  it("publishes a verified block's own hours", () => {
    const { stat, flags } = blockWeekStats({
      blockId: "IZT-S1-B01",
      weekStart: "2026-01-05",
      devices: [{ deviceId: "d1", usableHours: 4, events: 2, anomalous: false, anomalyScore: 0.1 }],
      sectorAverageHours: 3,
      isSimulated: true,
    });

    expect(stat.verified).toBe(true);
    expect(stat.usable_hours).toBe(4);
    expect(flags).toHaveLength(0);
  });

  it("substitutes the sector average and flags an anomalous device", () => {
    const { stat, flags } = blockWeekStats({
      blockId: "IZT-S4-B09",
      weekStart: "2026-01-05",
      devices: [{ deviceId: "d-tampered", usableHours: 24, events: 1, anomalous: true, anomalyScore: 0.91 }],
      sectorAverageHours: 3,
      isSimulated: true,
    });

    expect(stat.verified).toBe(false);
    expect(stat.usable_hours).toBe(3);
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toContain("anomalous_device");
  });
});
