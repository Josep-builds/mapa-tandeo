import { median } from "./stats";

/** Median comparison-colonia hours divided by median study-colonia hours. */
export function inequalityRatio(comparisonHours: number[], studyHours: number[]): number {
  const studyMedian = median(studyHours);
  if (studyMedian === 0) return Infinity;
  return median(comparisonHours) / studyMedian;
}
