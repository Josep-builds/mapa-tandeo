import type { PipaPriorityInput } from "./types";

/**
 * Ranks blocks for free-pipa allocation: fewest usable hours first (most in
 * need goes first). Ties go to verified blocks before unverified ones, then
 * by sector number.
 */
export function pipaPriority(stats: PipaPriorityInput[]): PipaPriorityInput[] {
  return [...stats].sort((a, b) => {
    if (a.usable_hours !== b.usable_hours) return a.usable_hours - b.usable_hours;
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return a.sector - b.sector;
  });
}
