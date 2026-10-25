// Deterministic simulated logger feed + seed for Mapa de Tandeo.
// Run with: npx tsx scripts/simulate.ts
//
// Generates ~40 study blocks (4 sectors of an invented Iztapalapa grid) and
// ~10 comparison blocks (an invented "Colonia de comparación"), simulates
// four weeks of 1-minute pressure readings per device, runs them through the
// ml module (event detection, isolation forest, two-logger check), and
// upserts only the resulting blocks + block_week_stats + flags (never raw
// minute data) to Supabase via the service-role key. A 3-day slice of one
// block's real minute data is written to public/sample/sample_block.csv for
// the CSV-upload demo.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { mulberry32, randomInRange, randomInt, randomNormal } from "../src/lib/rng";
import {
  blockWeekStats,
  detectEvents,
  extractDeviceDayFeatures,
  isolationForest,
  twoLoggerCheck,
  type BlockWeekStat,
  type Flag,
  type Reading,
} from "../src/lib/ml";
import { mean } from "../src/lib/ml/stats";
import { loadEnvLocal } from "./loadEnv";

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------- constants ----------

const SEED = 20260105;
const ON_THRESHOLD = 0.6;
const OFF_THRESHOLD = 0.5;
const MIN_MINUTES = 10;
const MAX_GAP_MINUTES = 3;
const MINUTES_PER_DAY = 1440;
const DAYS_PER_WEEK = 7;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * DAYS_PER_WEEK;
const WEEK_STARTS = ["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"];

const SECTOR_PROFILES: Record<number, { windowsPerWeek: [number, number]; durationHours: [number, number]; pressure: [number, number] }> = {
  1: { windowsPerWeek: [2, 3], durationHours: [4, 6], pressure: [0.7, 1.2] },
  2: { windowsPerWeek: [2, 2], durationHours: [3, 5], pressure: [0.6, 1.0] },
  3: { windowsPerWeek: [1, 2], durationHours: [3, 5], pressure: [0.5, 0.9] },
  4: { windowsPerWeek: [1, 1], durationHours: [2, 3], pressure: [0.3, 0.6] },
};

// Nominal expected hours/day per group, used only as the feature-engineering
// baseline for the isolation forest's "deviation from sector median" input —
// not the published figure (that comes from the live computation below).
const NOMINAL_HOURS_PER_DAY: Record<string, number> = {
  "1": 5, "2": 4, "3": 3, "4": 1.5, comparison: 11.5,
};

const TWO_LOGGER_BLOCKS = ["IZT-S1-B01", "IZT-S2-B01", "IZT-S3-B01", "IZT-S4-B01"];
const TAMPERED_BLOCK = "IZT-S4-B01";
const TAMPERED_DEVICE = `${TAMPERED_BLOCK}-D2`;
const BOOSTER_PUMP_BLOCK = "IZT-S2-B05";
const SAMPLE_CSV_BLOCK = "IZT-S1-B05";
const SAMPLE_CSV_WEEK_INDEX = 3;

// ---------- street names ----------
// Invented Iztapalapa-style street names, always shown with a "(simulado)"
// suffix at display time (see src/lib/format.ts) — never real addresses.

const MAIN_STREETS = [
  "Calle 5", "Calle 7", "Calle 12", "Calle 18", "Calle 23", "Calle Minerva",
  "Calle Rosas", "Calle Lirio", "Andador Girasol", "Calle Fresno",
  "Calle Tulipán", "Calle Jacarandas", "Calle Azucenas", "Privada Violeta",
  "Calle Lago de Términos", "Calle Amapola",
];

const CROSS_STREETS = [
  "Av. Tláhuac", "Eje 5 Sur", "Av. Ermita Iztapalapa", "Calzada Ermita",
  "Av. Guadalupe", "Av. Constitución", "Eje 6 Sur", "Periférico Oriente",
  "Av. La Turba", "Av. Jalisco", "Av. Telecomunicaciones", "Calle 9",
];

function pickDistinct<T>(rng: () => number, pool: T[], n: number): T[] {
  const copy = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = randomInt(rng, 0, copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}

function generateStreetLabel(rng: () => number, used: Set<string>): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const main = MAIN_STREETS[randomInt(rng, 0, MAIN_STREETS.length)];
    const [crossA, crossB] = pickDistinct(rng, CROSS_STREETS, 2);
    const label = `${main} entre ${crossA} y ${crossB}`;
    if (!used.has(label)) {
      used.add(label);
      return label;
    }
  }
  // Pool exhausted after 10 tries (unlikely at this scale) — accept a repeat.
  const main = MAIN_STREETS[randomInt(rng, 0, MAIN_STREETS.length)];
  const [crossA, crossB] = pickDistinct(rng, CROSS_STREETS, 2);
  return `${main} entre ${crossA} y ${crossB}`;
}

// ---------- blocks ----------

interface BlockDef {
  id: string;
  colonia: string;
  sector: number;
  label: string;
  street_label: string;
  lat: number;
  lng: number;
  grp: "study" | "comparison";
  is_simulated: true;
}

function buildStudyBlocks(rng: () => number, usedStreetLabels: Set<string>): BlockDef[] {
  const quadrants: Record<number, [number, number]> = { 1: [0, 0], 2: [1, 0], 3: [0, 1], 4: [1, 1] };
  const baseLat = 19.35;
  const baseLng = -99.06;
  const quadSize = 0.005;
  const blocks: BlockDef[] = [];

  for (let sector = 1; sector <= 4; sector++) {
    const [qx, qy] = quadrants[sector];
    for (let i = 0; i < 10; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      // Jitter stays small relative to the row/col step so adjacent blocks
      // never land close enough to overlap on the map.
      const lat = baseLat + qy * quadSize + row * (quadSize / 5) + randomInRange(rng, -0.0001, 0.0001);
      const lng = baseLng + qx * quadSize + col * (quadSize / 2) + randomInRange(rng, -0.0001, 0.0001);
      const id = `IZT-S${sector}-B${String(i + 1).padStart(2, "0")}`;
      blocks.push({
        id,
        colonia: "Iztapalapa (simulado)",
        sector,
        label: `Manzana ${i + 1}, Sector ${sector}`,
        street_label: generateStreetLabel(rng, usedStreetLabels),
        lat,
        lng,
        grp: "study",
        is_simulated: true,
      });
    }
  }
  return blocks;
}

function buildComparisonBlocks(rng: () => number, usedStreetLabels: Set<string>): BlockDef[] {
  const baseLat = 19.4;
  const baseLng = -99.17;
  const blocks: BlockDef[] = [];
  for (let i = 0; i < 10; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lat = baseLat + row * 0.002 + randomInRange(rng, -0.0002, 0.0002);
    const lng = baseLng + col * 0.004 + randomInRange(rng, -0.0002, 0.0002);
    blocks.push({
      id: `CMP-B${String(i + 1).padStart(2, "0")}`,
      colonia: "Colonia de comparación (simulado)",
      sector: 0,
      label: `Manzana ${i + 1}`,
      street_label: generateStreetLabel(rng, usedStreetLabels),
      lat,
      lng,
      grp: "comparison",
      is_simulated: true,
    });
  }
  return blocks;
}

// ---------- pressure generators ----------

function clip(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

function generateStudyWeek(rng: () => number, sector: number): number[] {
  const profile = SECTOR_PROFILES[sector];
  const pressures = Array.from({ length: MINUTES_PER_WEEK }, () => clip(0.2 + randomNormal(rng, 0, 0.03), 0, 10));

  const numWindows = randomInt(rng, profile.windowsPerWeek[0], profile.windowsPerWeek[1] + 1);
  const usedDays = new Set<number>();
  for (let w = 0; w < numWindows; w++) {
    let day = randomInt(rng, 0, DAYS_PER_WEEK);
    for (let attempt = 0; attempt < DAYS_PER_WEEK && usedDays.has(day); attempt++) {
      day = (day + 1) % DAYS_PER_WEEK;
    }
    usedDays.add(day);

    const durationHours = randomInRange(rng, profile.durationHours[0], profile.durationHours[1]);
    const durationMinutes = Math.round(durationHours * 60);
    const startHour = randomInRange(rng, 5, Math.max(6, 22 - durationHours));
    const startAbs = day * MINUTES_PER_DAY + Math.round(startHour * 60);

    const spikeLen = randomInt(rng, 1, 3); // 1 or 2 minutes
    for (let k = 0; k < spikeLen && startAbs + k < MINUTES_PER_WEEK; k++) {
      pressures[startAbs + k] = clip(2.4 + rng() * 0.2, 0, 10);
    }
    for (let k = spikeLen; k < durationMinutes && startAbs + k < MINUTES_PER_WEEK; k++) {
      pressures[startAbs + k] = clip(randomInRange(rng, profile.pressure[0], profile.pressure[1]) + randomNormal(rng, 0, 0.05), 0, 10);
    }
  }
  return pressures;
}

// Even a well-served colonia sees citywide pressure drop overnight (lower
// pumping demand/schedule) — modeled as one daytime "awake" window per day
// with strong pressure, and lower pressure the rest of the time. Assumption:
// awake window is 8-15 h/day starting between 5-9 a.m., which lands weekly
// usable hours around 60-120 h — clearly better than Iztapalapa but not an
// unrealistic flat 168/168. Documented in DECISIONS.md.
function generateAbundantWeek(rng: () => number): number[] {
  const pressures = new Array<number>(MINUTES_PER_WEEK);

  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    const awakeStartHour = randomInRange(rng, 5, 9);
    const awakeDurationHours = randomInRange(rng, 8, 15);
    const awakeStartMin = Math.round(awakeStartHour * 60);
    const awakeEndMin = Math.round((awakeStartHour + awakeDurationHours) * 60);

    for (let m = 0; m < MINUTES_PER_DAY; m++) {
      const abs = day * MINUTES_PER_DAY + m;
      pressures[abs] =
        m >= awakeStartMin && m < awakeEndMin
          ? clip(randomInRange(rng, 1.1, 1.4) + randomNormal(rng, 0, 0.05), 0, 10)
          : clip(randomInRange(rng, 0.3, 0.5) + randomNormal(rng, 0, 0.03), 0, 10);
    }
  }

  return pressures;
}

function generateTamperedWeek(): number[] {
  return Array(MINUTES_PER_WEEK).fill(1.5); // constant, zero variance — the injected tampered device
}

function toReadings(weekStart: string, pressures: number[]): Reading[] {
  const startMs = new Date(`${weekStart}T00:00:00.000Z`).getTime();
  return pressures.map((pressure_bar, i) => ({ ts: new Date(startMs + i * 60_000), pressure_bar }));
}

// ---------- simulation ----------

interface DeviceWeekOutcome {
  blockId: string;
  sectorKey: string;
  deviceId: string;
  week: number;
  usableHours: number;
  events: number;
}

async function main() {
  const rng = mulberry32(SEED);
  const usedStreetLabels = new Set<string>();
  const studyBlocks = buildStudyBlocks(rng, usedStreetLabels);
  const comparisonBlocks = buildComparisonBlocks(rng, usedStreetLabels);
  const allBlocks = [...studyBlocks, ...comparisonBlocks];

  // Keyed by group (sector "1".."4" or "comparison") — anomaly detection runs
  // per group below, so a block is only ever compared against its peers,
  // never against structurally different sectors or the comparison colonia.
  const featureMatrixByGroup = new Map<string, number[][]>();
  const featureMetaByGroup = new Map<string, Array<{ blockId: string; deviceId: string; week: number }>>();
  const deviceWeekOutcomes: DeviceWeekOutcome[] = [];
  let sampleCsvRows: Reading[] = [];

  for (let week = 0; week < WEEK_STARTS.length; week++) {
    const weekStart = WEEK_STARTS[week];

    for (const block of allBlocks) {
      const devices: Array<{ id: string; pressures: number[] }> = [];

      if (block.grp === "study") {
        if (block.id === BOOSTER_PUMP_BLOCK) {
          devices.push({ id: `${block.id}-D1`, pressures: generateAbundantWeek(rng) });
        } else {
          devices.push({ id: `${block.id}-D1`, pressures: generateStudyWeek(rng, block.sector) });
          if (TWO_LOGGER_BLOCKS.includes(block.id)) {
            const secondId = `${block.id}-D2`;
            devices.push({
              id: secondId,
              pressures: secondId === TAMPERED_DEVICE ? generateTamperedWeek() : generateStudyWeek(rng, block.sector),
            });
          }
        }
      } else {
        devices.push({ id: `${block.id}-D1`, pressures: generateAbundantWeek(rng) });
      }

      const sectorKey = block.grp === "comparison" ? "comparison" : String(block.sector);
      const nominalHoursPerDay = NOMINAL_HOURS_PER_DAY[sectorKey];

      for (const device of devices) {
        const readings = toReadings(weekStart, device.pressures);

        if (block.id === SAMPLE_CSV_BLOCK && week === SAMPLE_CSV_WEEK_INDEX && device.id === `${block.id}-D1`) {
          sampleCsvRows = readings.slice(0, 3 * MINUTES_PER_DAY); // 3-day slice, stays under the 5,000-row cap
        }

        const { events, usableHours } = detectEvents(readings, {
          on: ON_THRESHOLD,
          off: OFF_THRESHOLD,
          minMinutes: MIN_MINUTES,
          maxGapMinutes: MAX_GAP_MINUTES,
        });
        deviceWeekOutcomes.push({
          blockId: block.id,
          sectorKey,
          deviceId: device.id,
          week,
          usableHours,
          events: events.length,
        });

        const groupFeatures = featureMatrixByGroup.get(sectorKey) ?? [];
        const groupMeta = featureMetaByGroup.get(sectorKey) ?? [];
        for (let day = 0; day < DAYS_PER_WEEK; day++) {
          const dayReadings = readings.slice(day * MINUTES_PER_DAY, (day + 1) * MINUTES_PER_DAY);
          groupFeatures.push(extractDeviceDayFeatures(dayReadings, ON_THRESHOLD, nominalHoursPerDay));
          groupMeta.push({ blockId: block.id, deviceId: device.id, week });
        }
        featureMatrixByGroup.set(sectorKey, groupFeatures);
        featureMetaByGroup.set(sectorKey, groupMeta);
      }
    }
  }

  // One isolation forest per group (sector / comparison colonia): a device
  // is only ever judged anomalous relative to its own peers, so a sector
  // that's legitimately worse off never gets flagged just for being poor —
  // only a device that stands out *within* its own group (tampering,
  // distortion) does.
  const anomalousDeviceWeek = new Map<string, { anomalous: boolean; maxScore: number }>();
  for (const [groupKey, groupFeatures] of featureMatrixByGroup) {
    const groupMeta = featureMetaByGroup.get(groupKey) ?? [];
    const { scores, flags } = isolationForest(groupFeatures, {
      numTrees: 100,
      subsampleSize: 256,
      seed: SEED,
      threshold: 0.62,
    });
    groupMeta.forEach((meta, i) => {
      const key = `${meta.blockId}|${meta.deviceId}|${meta.week}`;
      const prev = anomalousDeviceWeek.get(key) ?? { anomalous: false, maxScore: 0 };
      anomalousDeviceWeek.set(key, {
        anomalous: prev.anomalous || flags[i],
        maxScore: Math.max(prev.maxScore, scores[i]),
      });
    });
  }

  // Group device-week outcomes by block+week.
  const byBlockWeek = new Map<string, DeviceWeekOutcome[]>();
  for (const outcome of deviceWeekOutcomes) {
    const key = `${outcome.blockId}|${outcome.week}`;
    const list = byBlockWeek.get(key) ?? [];
    list.push(outcome);
    byBlockWeek.set(key, list);
  }

  // First pass: raw verified status (ignoring sector-average fallback) so we
  // can compute each sector's weekly average from trustworthy blocks only.
  const rawVerified = new Map<string, { ownHours: number; verified: boolean; sectorKey: string; week: number }>();
  for (const [key, devices] of byBlockWeek) {
    const [blockId, weekStr] = key.split("|");
    const week = Number(weekStr);
    const hoursByDevice = devices.map((d) => d.usableHours);
    const loggersAgree = twoLoggerCheck(hoursByDevice);
    const anyAnomalous = devices.some((d) => anomalousDeviceWeek.get(`${d.blockId}|${d.deviceId}|${d.week}`)?.anomalous);
    rawVerified.set(key, {
      ownHours: mean(hoursByDevice),
      verified: loggersAgree && !anyAnomalous,
      sectorKey: devices[0].sectorKey,
      week,
    });
    void blockId;
  }

  const sectorWeekAverage = new Map<string, number>();
  for (const { ownHours, verified, sectorKey, week } of rawVerified.values()) {
    if (!verified) continue;
    const key = `${sectorKey}|${week}`;
    const list = sectorWeekAverage.get(key);
    sectorWeekAverage.set(key, list === undefined ? ownHours : (list + ownHours) / 2);
  }

  // Second pass: finalize each block-week's published stat + any flags.
  const stats: BlockWeekStat[] = [];
  const flagRows: Flag[] = [];
  for (const [key, devices] of byBlockWeek) {
    const [blockId, weekStr] = key.split("|");
    const week = Number(weekStr);
    const weekStart = WEEK_STARTS[week];
    const sectorKey = devices[0].sectorKey;
    const sectorAverageHours = sectorWeekAverage.get(`${sectorKey}|${week}`) ?? mean(devices.map((d) => d.usableHours));

    const { stat, flags: blockFlags } = blockWeekStats({
      blockId,
      weekStart,
      isSimulated: true,
      sectorAverageHours,
      devices: devices.map((d) => {
        const a = anomalousDeviceWeek.get(`${d.blockId}|${d.deviceId}|${d.week}`);
        return {
          deviceId: d.deviceId,
          usableHours: d.usableHours,
          events: d.events,
          anomalous: a?.anomalous ?? false,
          anomalyScore: a?.maxScore ?? null,
        };
      }),
    });

    stats.push(stat);
    flagRows.push(...blockFlags);
  }

  console.log(`Simulated ${allBlocks.length} blocks, ${stats.length} block-weeks, ${flagRows.length} flags.`);

  // ---------- write sample CSV ----------
  const sampleDir = path.resolve(process.cwd(), "public/sample");
  if (!existsSync(sampleDir)) mkdirSync(sampleDir, { recursive: true });
  const csvLines = ["timestamp,pressure_bar", ...sampleCsvRows.map((r) => `${r.ts.toISOString()},${r.pressure_bar.toFixed(3)}`)];
  writeFileSync(path.join(sampleDir, "sample_block.csv"), csvLines.join("\n") + "\n");
  console.log(`Wrote public/sample/sample_block.csv (${sampleCsvRows.length} rows).`);

  // ---------- upsert to Supabase ----------
  const { error: blocksError } = await supabase.from("blocks").upsert(allBlocks, { onConflict: "id" });
  if (blocksError) throw blocksError;

  const { error: statsError } = await supabase.from("block_week_stats").upsert(stats, { onConflict: "block_id,week_start" });
  if (statsError) throw statsError;

  // Flags only support insert — clear this run's block ids first so re-running
  // the simulator doesn't pile up stale flags from a previous anomaly pass.
  const blockIds = allBlocks.map((b) => b.id);
  const { error: clearFlagsError } = await supabase.from("flags").delete().in("block_id", blockIds);
  if (clearFlagsError) throw clearFlagsError;

  if (flagRows.length > 0) {
    const { error: flagsError } = await supabase.from("flags").insert(flagRows);
    if (flagsError) throw flagsError;
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
