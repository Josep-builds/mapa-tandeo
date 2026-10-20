import type { Reading } from "./types";

/** Builds one reading per minute starting at `startTs`, from a pressure array. */
export function minuteReadings(startTs: number, pressures: number[]): Reading[] {
  return pressures.map((pressure_bar, i) => ({
    ts: new Date(startTs + i * 60_000),
    pressure_bar,
  }));
}
