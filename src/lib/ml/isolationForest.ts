import { mulberry32 } from "../rng";
import { detectEvents } from "./detectEvents";
import { autocorrelationLag1, mean, stddev } from "./stats";
import type { Reading } from "./types";

const EULER_GAMMA = 0.5772156649015329;

/** Average path length of an unsuccessful BST search over n points. */
function c(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + EULER_GAMMA) - (2 * (n - 1)) / n;
}

type ITreeNode =
  | { type: "external"; size: number }
  | { type: "internal"; feature: number; splitValue: number; left: ITreeNode; right: ITreeNode };

function buildTree(data: number[][], depth: number, maxDepth: number, rng: () => number): ITreeNode {
  if (depth >= maxDepth || data.length <= 1) {
    return { type: "external", size: data.length };
  }

  const numFeatures = data[0].length;
  const feature = Math.floor(rng() * numFeatures);
  const values = data.map((d) => d[feature]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { type: "external", size: data.length };
  }

  const splitValue = min + rng() * (max - min);
  const left = data.filter((d) => d[feature] < splitValue);
  const right = data.filter((d) => d[feature] >= splitValue);
  if (left.length === 0 || right.length === 0) {
    return { type: "external", size: data.length };
  }

  return {
    type: "internal",
    feature,
    splitValue,
    left: buildTree(left, depth + 1, maxDepth, rng),
    right: buildTree(right, depth + 1, maxDepth, rng),
  };
}

function pathLength(point: number[], node: ITreeNode, depth: number): number {
  if (node.type === "external") {
    return depth + c(node.size);
  }
  return point[node.feature] < node.splitValue
    ? pathLength(point, node.left, depth + 1)
    : pathLength(point, node.right, depth + 1);
}

export interface IsolationForestOptions {
  numTrees?: number;
  subsampleSize?: number;
  seed?: number;
  threshold?: number;
}

export interface IsolationForestResult {
  scores: number[];
  flags: boolean[];
}

/**
 * Fit-and-score isolation forest: 100 trees over subsamples of 256 points by
 * default, seeded for reproducibility. Returns an anomaly score in (0, 1] per
 * input row — scores above `threshold` are flagged.
 */
export function isolationForest(data: number[][], options: IsolationForestOptions = {}): IsolationForestResult {
  const { numTrees = 100, subsampleSize = 256, seed = 42, threshold = 0.62 } = options;
  if (data.length === 0) return { scores: [], flags: [] };

  const rng = mulberry32(seed);
  const effectiveSubsampleSize = Math.min(subsampleSize, data.length);
  const maxDepth = Math.ceil(Math.log2(Math.max(effectiveSubsampleSize, 2)));

  const trees: ITreeNode[] = [];
  for (let t = 0; t < numTrees; t++) {
    const indices = data.map((_, i) => i);
    // Partial Fisher-Yates shuffle to draw a subsample without replacement.
    for (let i = 0; i < effectiveSubsampleSize; i++) {
      const j = i + Math.floor(rng() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const subsample = indices.slice(0, effectiveSubsampleSize).map((i) => data[i]);
    trees.push(buildTree(subsample, 0, maxDepth, rng));
  }

  const normalizer = c(effectiveSubsampleSize);
  const scores = data.map((point) => {
    const avgPath = mean(trees.map((tree) => pathLength(point, tree, 0)));
    return normalizer === 0 ? 0 : 2 ** (-avgPath / normalizer);
  });
  const flags = scores.map((s) => s > threshold);

  return { scores, flags };
}

/**
 * Feature vector per device-day, in the fixed order the module documents:
 * mean, std, max, fraction of minutes above the on-threshold, number of
 * supply events, lag-1 autocorrelation, and deviation from the sector's
 * median usable hours that week.
 */
export function extractDeviceDayFeatures(
  dayReadings: Reading[],
  onThreshold: number,
  sectorMedianHours: number,
): number[] {
  const pressures = dayReadings.map((r) => r.pressure_bar);
  const { events, usableHours } = detectEvents(dayReadings, {
    on: onThreshold,
    off: onThreshold - 0.1,
    minMinutes: 10,
    maxGapMinutes: 3,
  });

  return [
    mean(pressures),
    stddev(pressures),
    pressures.length === 0 ? 0 : Math.max(...pressures),
    pressures.length === 0 ? 0 : pressures.filter((p) => p >= onThreshold).length / pressures.length,
    events.length,
    autocorrelationLag1(pressures),
    usableHours - sectorMedianHours,
  ];
}
