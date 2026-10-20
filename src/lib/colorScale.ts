/**
 * Colorblind-safe red→green scale (ColorBrewer RdYlGn) for usable hours/week.
 * Color is never the only signal — callers always pair this with the number.
 */
const STOPS: Array<{ max: number; bg: string; fg: string }> = [
  { max: 5, bg: "#d73027", fg: "#ffffff" },
  { max: 15, bg: "#fc8d59", fg: "#1a1a1a" },
  { max: 30, bg: "#fee08b", fg: "#1a1a1a" },
  { max: 60, bg: "#91cf60", fg: "#1a1a1a" },
  { max: Infinity, bg: "#1a9850", fg: "#ffffff" },
];

export function colorForHours(hours: number): { bg: string; fg: string } {
  const stop = STOPS.find((s) => hours <= s.max) ?? STOPS[STOPS.length - 1];
  return { bg: stop.bg, fg: stop.fg };
}
