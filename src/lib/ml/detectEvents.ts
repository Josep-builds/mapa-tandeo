import type { DetectEventsOptions, DetectEventsResult, Reading, SupplyEvent } from "./types";

const MINUTE_MS = 60_000;

/**
 * Hysteresis-based supply-event detector: an event starts once pressure
 * reaches `on`, stays open while pressure is at or above `off`, and tolerates
 * dips below `off` for up to `maxGapMinutes` before closing. Events shorter
 * than `minMinutes` are dropped, which naturally filters out brief air-pocket
 * spikes that never sustain real supply.
 */
export function detectEvents(readings: Reading[], options: DetectEventsOptions): DetectEventsResult {
  const { on, off, minMinutes, maxGapMinutes } = options;
  const sorted = [...readings].sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const rawEvents: Array<{ start: Date; end: Date }> = [];
  let inEvent = false;
  let eventStart: Date | null = null;
  let lastOkTs: Date | null = null;

  for (const r of sorted) {
    const aboveOn = r.pressure_bar >= on;
    const aboveOff = r.pressure_bar >= off;

    if (!inEvent) {
      if (aboveOn) {
        inEvent = true;
        eventStart = r.ts;
        lastOkTs = r.ts;
      }
      continue;
    }

    if (aboveOff) {
      lastOkTs = r.ts;
      continue;
    }

    const gapMinutes = (r.ts.getTime() - (lastOkTs as Date).getTime()) / MINUTE_MS;
    if (gapMinutes > maxGapMinutes) {
      rawEvents.push({ start: eventStart as Date, end: lastOkTs as Date });
      inEvent = false;
      eventStart = null;
      lastOkTs = null;
      if (aboveOn) {
        inEvent = true;
        eventStart = r.ts;
        lastOkTs = r.ts;
      }
    }
    // else: still within the tolerated gap — stay in the event.
  }

  if (inEvent) {
    rawEvents.push({ start: eventStart as Date, end: lastOkTs as Date });
  }

  const events: SupplyEvent[] = rawEvents
    .map(({ start, end }) => ({
      start,
      end,
      minutes: (end.getTime() - start.getTime()) / MINUTE_MS + 1,
    }))
    .filter((e) => e.minutes >= minMinutes);

  const usableHours = events.reduce((sum, e) => sum + e.minutes / 60, 0);

  return { events, usableHours };
}
