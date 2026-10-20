/**
 * Cross-check between loggers on the same block: if two devices disagree on
 * daily usable hours by more than 30% (relative to the larger value), the
 * block's data is not trustworthy enough to stand on its own.
 */
export function twoLoggerCheck(hoursByDevice: number[]): boolean {
  if (hoursByDevice.length < 2) return true;

  for (let i = 0; i < hoursByDevice.length; i++) {
    for (let j = i + 1; j < hoursByDevice.length; j++) {
      const a = hoursByDevice[i];
      const b = hoursByDevice[j];
      const base = Math.max(a, b, Number.EPSILON);
      if (Math.abs(a - b) / base > 0.3) return false;
    }
  }
  return true;
}
