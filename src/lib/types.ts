export interface Block {
  id: string;
  colonia: string;
  sector: number;
  label: string;
  lat: number;
  lng: number;
  grp: "study" | "comparison";
  is_simulated: boolean;
}

export interface BlockWeekStatRow {
  block_id: string;
  week_start: string;
  usable_hours: number;
  events: number;
  verified: boolean;
  is_simulated: boolean;
}

export interface FlagRow {
  id: number;
  block_id: string | null;
  week_start: string;
  reason: string;
  score: number | null;
}
