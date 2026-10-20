// Security check: with only the public anon key, confirm RLS actually blocks
// what it's supposed to. Run with: npx tsx scripts/rls-check.ts
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnv";

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}

const anon = createClient(SUPABASE_URL, ANON_KEY);

let failures = 0;

function report(name: string, pass: boolean, detail: string) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}: ${detail}`);
  if (!pass) failures++;
}

async function main() {
  // 1. anon cannot read any row from `readings` (owner-scoped table).
  {
    const { data, error } = await anon.from("readings").select("*").limit(1);
    const pass = !error && (data?.length ?? 0) === 0;
    report("anon SELECT readings", pass, error ? `query errored: ${error.message}` : `${data?.length ?? 0} rows returned`);
  }

  // 2. anon cannot read any row from `devices` (owner-scoped table).
  {
    const { data, error } = await anon.from("devices").select("*").limit(1);
    const pass = !error && (data?.length ?? 0) === 0;
    report("anon SELECT devices", pass, error ? `query errored: ${error.message}` : `${data?.length ?? 0} rows returned`);
  }

  // 3. anon cannot insert into `block_week_stats` (authenticated-owner-only write).
  {
    const { error } = await anon.from("block_week_stats").insert({
      block_id: "IZT-S1-B01",
      week_start: "1970-01-01",
      usable_hours: 999,
      events: 0,
      verified: true,
      is_simulated: false,
    });
    report("anon INSERT block_week_stats", !!error, error ? `rejected: ${error.message}` : "insert succeeded (should have failed!)");
  }

  // 4. anon can still read public aggregates (sanity check the policies aren't over-broad).
  {
    const { data, error } = await anon.from("blocks").select("id").limit(1);
    const pass = !error && (data?.length ?? 0) > 0;
    report("anon SELECT blocks (should succeed)", pass, error ? error.message : `${data?.length ?? 0} rows returned`);
  }

  console.log(failures === 0 ? "\nAll RLS checks passed." : `\n${failures} RLS check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
