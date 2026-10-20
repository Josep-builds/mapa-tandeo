import { describe, expect, it } from "vitest";
import { mulberry32 } from "../rng";
import { extractDeviceDayFeatures, isolationForest } from "./isolationForest";
import { minuteReadings } from "./testUtils";

const ON_THRESHOLD = 0.6;
const SECTOR_MEDIAN_HOURS = 3;
const START = Date.UTC(2026, 0, 1, 0, 0, 0);

function normalDeviceDay(rng: () => number) {
  const low = () => 0.2 + (rng() - 0.5) * 0.1;
  const window = () => 0.9 + (rng() - 0.5) * 0.2;
  const pressures = [
    ...Array(600).fill(0).map(low),
    ...Array(180).fill(0).map(window), // ~3h tandeo window
    ...Array(1440 - 600 - 180).fill(0).map(low),
  ];
  return minuteReadings(START, pressures);
}

function tamperedDeviceDay() {
  // Constant 1.5 bar all day, zero variance — the injected tampered device.
  return minuteReadings(START, Array(1440).fill(1.5));
}

describe("isolationForest", () => {
  it("flags the tampered constant-pressure device but not the normal ones", () => {
    const rng = mulberry32(7);
    const normalFeatures = Array.from({ length: 30 }, () =>
      extractDeviceDayFeatures(normalDeviceDay(rng), ON_THRESHOLD, SECTOR_MEDIAN_HOURS),
    );
    const tamperedFeatures = extractDeviceDayFeatures(tamperedDeviceDay(), ON_THRESHOLD, SECTOR_MEDIAN_HOURS);

    const data = [...normalFeatures, tamperedFeatures];
    const tamperedIndex = data.length - 1;

    const { flags } = isolationForest(data, { seed: 123 });

    expect(flags[tamperedIndex]).toBe(true);
    const falsePositives = flags.slice(0, tamperedIndex).filter(Boolean).length;
    expect(falsePositives).toBeLessThanOrEqual(2); // allow a small margin, not zero-tolerance
  });
});
