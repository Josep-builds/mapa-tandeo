import { mean } from "./stats";
import { twoLoggerCheck } from "./twoLoggerCheck";
import type { BlockWeekStat, Flag } from "./types";

export interface DeviceWeekInput {
  deviceId: string;
  usableHours: number;
  events: number;
  anomalous: boolean;
  anomalyScore: number | null;
}

export interface BlockWeekStatsInput {
  blockId: string;
  weekStart: string;
  devices: DeviceWeekInput[];
  sectorAverageHours: number;
  isSimulated: boolean;
}

export interface BlockWeekStatsResult {
  stat: BlockWeekStat;
  flags: Flag[];
}

/**
 * Aggregates one block's device readings into the published weekly stat.
 * A block is "verified" only if its loggers agree with each other and none
 * was flagged anomalous; unverified blocks are published with the sector
 * average instead of their own (untrustworthy) number, with the reason
 * recorded in the public tamper log.
 */
export function blockWeekStats(input: BlockWeekStatsInput): BlockWeekStatsResult {
  const { blockId, weekStart, devices, sectorAverageHours, isSimulated } = input;

  const hoursByDevice = devices.map((d) => d.usableHours);
  const loggersAgree = twoLoggerCheck(hoursByDevice);
  const anomalousDevices = devices.filter((d) => d.anomalous);
  const verified = loggersAgree && anomalousDevices.length === 0;

  const ownHours = mean(hoursByDevice);
  const usableHours = verified ? ownHours : sectorAverageHours;
  const events = Math.round(mean(devices.map((d) => d.events)));

  const flags: Flag[] = [];
  if (!loggersAgree) {
    flags.push({ block_id: blockId, week_start: weekStart, reason: "two_logger_mismatch", score: null });
  }
  for (const d of anomalousDevices) {
    flags.push({
      block_id: blockId,
      week_start: weekStart,
      reason: `anomalous_device:${d.deviceId}`,
      score: d.anomalyScore,
    });
  }

  return {
    stat: {
      block_id: blockId,
      week_start: weekStart,
      usable_hours: usableHours,
      events,
      verified,
      is_simulated: isSimulated,
    },
    flags,
  };
}
