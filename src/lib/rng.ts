// Deterministic PRNG (mulberry32) — used by the simulator and the isolation
// forest so results are reproducible across runs given the same seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function randomInt(rng: () => number, minInclusive: number, maxExclusive: number): number {
  return Math.floor(randomInRange(rng, minInclusive, maxExclusive));
}

// Standard normal via Box-Muller, driven by the same seeded generator.
export function randomNormal(rng: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * std;
}
