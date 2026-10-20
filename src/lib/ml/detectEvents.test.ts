import { describe, expect, it } from "vitest";
import { detectEvents } from "./detectEvents";
import { minuteReadings } from "./testUtils";

const OPTS = { on: 0.6, off: 0.5, minMinutes: 10, maxGapMinutes: 3 };
const START = Date.UTC(2026, 0, 1, 0, 0, 0);

describe("detectEvents", () => {
  it("detects a single sustained tandeo window with the right duration", () => {
    const low = Array(60).fill(0.2);
    const window = Array(180).fill(0.9); // 3 hours
    const pressures = [...low, ...window, ...low];
    const readings = minuteReadings(START, pressures);

    const { events, usableHours } = detectEvents(readings, OPTS);

    expect(events).toHaveLength(1);
    expect(events[0].minutes).toBe(180);
    expect(usableHours).toBeCloseTo(3, 6);
  });

  it("ignores a brief air-pocket spike that never sustains real supply", () => {
    const pressures = [...Array(60).fill(0.2), 2.5, 2.4, ...Array(60).fill(0.2)];
    const readings = minuteReadings(START, pressures);

    const { events, usableHours } = detectEvents(readings, OPTS);

    expect(events).toHaveLength(0);
    expect(usableHours).toBe(0);
  });

  it("keeps an event open across a brief dip within the gap tolerance", () => {
    const pressures = [
      ...Array(60).fill(0.1),
      ...Array(60).fill(0.9),
      ...Array(2).fill(0.3), // 2-minute dip, within maxGapMinutes = 3
      ...Array(60).fill(0.9),
      ...Array(60).fill(0.1),
    ];
    const readings = minuteReadings(START, pressures);

    const { events } = detectEvents(readings, OPTS);

    expect(events).toHaveLength(1);
    expect(events[0].minutes).toBe(122);
  });

  it("splits into two events when the dip exceeds the gap tolerance", () => {
    const pressures = [
      ...Array(60).fill(0.1),
      ...Array(60).fill(0.9),
      ...Array(10).fill(0.1), // 10-minute dip, beyond maxGapMinutes = 3
      ...Array(60).fill(0.9),
      ...Array(60).fill(0.1),
    ];
    const readings = minuteReadings(START, pressures);

    const { events } = detectEvents(readings, OPTS);

    expect(events).toHaveLength(2);
    expect(events[0].minutes).toBe(60);
    expect(events[1].minutes).toBe(60);
  });

  it("handles a booster-pump block where pressure stays high almost all day", () => {
    const pressures = Array(24 * 60).fill(1.1);
    const readings = minuteReadings(START, pressures);

    const { events, usableHours } = detectEvents(readings, OPTS);

    expect(events).toHaveLength(1);
    expect(usableHours).toBeCloseTo(24, 6);
  });
});
