export interface Reading {
  ts: Date;
  pressure_bar: number;
}

export interface SupplyEvent {
  start: Date;
  end: Date;
  minutes: number;
}

export interface DetectEventsOptions {
  on: number;
  off: number;
  minMinutes: number;
  maxGapMinutes: number;
}

export interface DetectEventsResult {
  events: SupplyEvent[];
  usableHours: number;
}

export interface BlockWeekStat {
  block_id: string;
  week_start: string;
  usable_hours: number;
  events: number;
  verified: boolean;
  is_simulated: boolean;
}

export interface Flag {
  block_id: string;
  week_start: string;
  reason: string;
  score: number | null;
}

export interface PipaPriorityInput {
  block_id: string;
  sector: number;
  usable_hours: number;
  verified: boolean;
}
