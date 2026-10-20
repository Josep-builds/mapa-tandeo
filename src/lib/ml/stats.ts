export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Pearson autocorrelation at lag 1. */
export function autocorrelationLag1(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n - 1; i++) numerator += (xs[i] - m) * (xs[i + 1] - m);
  for (let i = 0; i < n; i++) denominator += (xs[i] - m) ** 2;
  return denominator === 0 ? 0 : numerator / denominator;
}
