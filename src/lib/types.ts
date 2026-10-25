export interface Block {
  id: string;
  colonia: string;
  sector: number;
  label: string;
  /** Invented street name ("Calle 5 entre Av. Tláhuac y Calle 7") — labeled
   * simulated wherever shown. Lets a resident recognize her block without
   * any household-level address data; see DECISIONS.md. */
  street_label: string;
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
