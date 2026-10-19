# CLAUDE.md — Build instructions for Mapa de Tandeo

You are the coding agent for this repo. Read `docs/PACKET.md` first — it is the spec. Build the whole app autonomously, feature by feature, committing after each. **Only stop and ask the human (Josep) when you need something only he can do**: a login (`gh auth login`, `vercel login`, `supabase login`), a secret value, a click in a web dashboard (Google OAuth, Supabase providers), or the mockup image. When you stop, give him the exact steps, numbered, in Spanish, then wait.

Language: UI in Spanish (Mexico). Code, comments and commits in English. Talk to Josep in Spanish.

## Ground rules (security floor — non-negotiable)
- No secrets in code or git. `.env.local` is gitignored from the first commit. Secrets go to Vercel env vars (`vercel env add`).
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may reach the browser. The service-role key is used only in `scripts/` locally and never committed.
- Supabase Auth with Google. RLS enabled on every table.
- Every form and API route validates with zod (length, type, range). CSV: max 1 MB, max 5,000 rows, `pressure_bar` between 0 and 10, valid ISO timestamps.
- Seed data is invented and labeled `is_simulated = true`. A red badge "DATOS SIMULADOS" appears on every screen that shows simulated data.
- No household-level data anywhere: no names, phones or addresses of residents. The unit is the block.
- Forbidden zone: no tips, no awareness content.

## Stack
Next.js (latest, App Router, TypeScript, `src/`), Tailwind, `@supabase/ssr` + `@supabase/supabase-js`, zod, papaparse, leaflet + react-leaflet (dynamic import, `ssr:false`), vitest. Free tiers only. Node ≥ 20.

## Phase 0 — Logins (stop here first)
Check each; for anything missing, stop and give Josep the command:
1. `gh auth status` → else `gh auth login`
2. `vercel whoami` → else `vercel login` (install with `npm i -g vercel` if needed)
3. `supabase --version` and `supabase projects list` → else `npm i -g supabase` / `supabase login`
Ask Josep: create a new Supabase project named `mapa-tandeo` (region us-east or closest) **or** let you run `supabase projects create`. Get the project ref, URL and anon key (`supabase projects api-keys --project-ref <ref>`). Write them to `.env.local` only.

## Phase 1 — Scaffold (commit 1)
- `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` (the folder already has `docs/`, `CLAUDE.md`, `DECISIONS.md`; keep them).
- `.gitignore` includes `.env*`, `!.env.example`. Create `.env.example` with variable names only.
- `git init`, `gh repo create mapa-tandeo --public --source=. --push`.
- Commit: `chore: scaffold Next.js app with packet and decisions`.

## Phase 2 — Database + RLS (commit 2)
Create `supabase/migrations/0001_init.sql` and apply with `supabase link --project-ref <ref>` + `supabase db push`.

```sql
create table blocks (
  id text primary key,
  colonia text not null,
  sector int not null,
  label text not null,
  lat double precision not null,
  lng double precision not null,
  grp text not null check (grp in ('study','comparison')),
  is_simulated boolean not null default true
);
create table devices (
  id uuid primary key default gen_random_uuid(),
  block_id text not null references blocks(id),
  owner uuid not null default auth.uid() references auth.users(id),
  label text not null check (char_length(label) between 1 and 60),
  before_shutoff_valve boolean not null default false,
  created_at timestamptz not null default now()
);
create table readings (
  id bigserial primary key,
  device_id uuid not null references devices(id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users(id),
  ts timestamptz not null,
  pressure_bar real not null check (pressure_bar >= 0 and pressure_bar <= 10),
  source text not null check (source in ('simulated','real_test')),
  unique (device_id, ts)
);
create table block_week_stats (   -- written by the server after ML runs
  block_id text references blocks(id),
  week_start date not null,
  usable_hours real not null,
  events int not null,
  verified boolean not null,
  is_simulated boolean not null,
  primary key (block_id, week_start)
);
create table flags (
  id bigserial primary key,
  block_id text references blocks(id),
  week_start date not null,
  reason text not null,
  score real
);
alter table blocks enable row level security;
alter table devices enable row level security;
alter table readings enable row level security;
alter table block_week_stats enable row level security;
alter table flags enable row level security;

create policy "public read blocks" on blocks for select using (true);
create policy "public read stats" on block_week_stats for select using (true);
create policy "public read flags" on flags for select using (true);
create policy "own devices" on devices for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own readings" on readings for all using (owner = auth.uid()) with check (owner = auth.uid()
  and exists (select 1 from devices d where d.id = device_id and d.owner = auth.uid()));
-- stats/flags: writes only from authenticated owners of a device on that block
create policy "owners write stats" on block_week_stats for insert to authenticated with check (
  exists (select 1 from devices d where d.block_id = block_week_stats.block_id and d.owner = auth.uid()));
create policy "owners update stats" on block_week_stats for update to authenticated using (
  exists (select 1 from devices d where d.block_id = block_week_stats.block_id and d.owner = auth.uid()));
create policy "owners write flags" on flags for insert to authenticated with check (
  exists (select 1 from devices d where d.block_id = flags.block_id and d.owner = auth.uid()));
```
Also a public view of raw data with a 14-day lag (`readings_public`: block_id, ts, pressure_bar, source where ts < now() - interval '14 days'), created `with (security_invoker = false)` and granting select to anon — it exposes no owner or device id.

Commit: `feat(db): schema with RLS and 14-day lagged public view`.

## Phase 3 — Simulator + seed (commit 3)
`scripts/simulate.ts` (run with `npx tsx`), deterministic seeded RNG:
- ~40 study blocks in 4 sectors of an invented Iztapalapa grid (lat ≈ 19.35–19.36, lng ≈ -99.06 – -99.05), ~10 comparison blocks in an invented "Colonia de comparación" (lat ≈ 19.40, lng ≈ -99.17). IDs like `IZT-S1-B03`, `CMP-B02`. All `is_simulated = true`.
- 4 weeks of 1-minute readings per block: study blocks get 1–3 tandeo windows/week of 2–6 h with pressure 0.3–1.2 bar, sector 4 worst; comparison blocks get pressure > 1 bar most of the day. Add noise, air-pocket spikes (1–2 min to 2.5 bar at refill start), a booster-pump block, and **one tampered device** (constant 1.5 bar, zero variance) for the anomaly detector to catch.
- To save DB rows, the seed stores aggregated `block_week_stats` + `flags` for simulated blocks via the service-role key (local only, from `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`) and writes 1 sample week of minute data as `public/sample/sample_block.csv` for the upload demo.
Commit: `feat(sim): labeled simulated logger feed and seed`.

## Phase 4 — ML module + tests (commit 4)
`src/lib/ml/` in pure TypeScript, fully unit-tested with vitest (`npm test`):
- `detectEvents(readings, {on:0.6, off:0.5, minMinutes:10, maxGapMinutes:3})` → supply events (hysteresis, ignore spikes shorter than minMinutes). Returns events + usable hours.
- `isolationForest` — implement (100 trees, subsample 256, seeded). Features per device-day: mean, std, max, fraction of minutes > 0.6, number of events, lag-1 autocorrelation, and deviation from sector median hours. Score > threshold (default 0.62) → flag.
- `twoLoggerCheck` — if a block has 2 devices whose daily hours differ > 30% → unverified.
- `blockWeekStats` — unverified blocks receive the sector average (not their own number); reason logged to `flags`.
- `inequalityRatio(comparisonHours, studyHours)` = median comparison ÷ median study.
- `pipaPriority(stats)` → sectors/blocks sorted ascending by usable hours (verified first; ties by sector).
Tests: the cases in PACKET §11 items 1–3. Commit: `feat(ml): supply-event detection, isolation forest, ranking + tests`.

## Phase 5 — Public UI (commit 5) → DEPLOY 1
Pages (mobile-first, large text, high contrast, Spanish):
- `/` — map (Leaflet, OSM tiles, attribution) with blocks colored by weekly usable hours (red → green, colorblind-safe palette, plus a number label, not color alone); week selector; summary card: Iztapalapa median h/week, comparison median, **Desigualdad N×**; "DATOS SIMULADOS" badge; plain-language "¿Qué significa?" line (one sentence: hours per week with enough pressure to fill a tinaco).
- `/prioridad` — pipa-priority list (fewest hours first) with a note: "Regla pública: las pipas gratuitas van primero a las cuadras con menos horas."
- `/cuadra/[id]` — block detail: hours by week (simple bar chart, SVG), verified status, and **"Imprimir cartel"** → `/cuadra/[id]/cartel` print-optimized page (huge numbers, no jargon, date range, block ID, QR to the page).
- `/registro-de-alteraciones` — public tamper/flag log.
- `/evidencia` — download weekly evidence pack: CSV of block_week_stats for the chosen week + `manifest.json` with SHA-256 of each file (Web Crypto) and method notes (threshold 0.6 bar, comparison rule, simulated/real labels).
Deploy: `vercel link`, `vercel env add` for the two public vars (production + preview), `vercel --prod`. Commit: `feat(ui): public map, priority list, block poster, evidence pack`. Record URL in DECISIONS.md.

## Phase 6 — Auth + promotora flow (commit 6) → DEPLOY 2
**Stop and guide Josep** through Google OAuth (numbered steps in Spanish):
1. Google Cloud Console → APIs & Services → OAuth consent screen (External, app name "Mapa de Tandeo", his email) → Credentials → Create OAuth client ID → Web application.
2. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
3. Supabase Dashboard → Authentication → Providers → Google: paste Client ID + Secret, enable.
4. Supabase → Authentication → URL Configuration: Site URL = Vercel prod URL; add redirect URLs `http://localhost:3000/**` and `https://<prod-domain>/**`.
Then build: `/entrar` (Sign in with Google), `/auth/callback` route, middleware refreshing the session, `/panel` (protected): register device (block select, label, checkbox "Instalado antes de la llave de paso" — if unchecked, the block is shown "no verificado"), upload CSV (papaparse client-side preview → zod-validated server action → insert in batches of 500 → run ML for that device/week → upsert `block_week_stats` + `flags`), list own devices and last upload. Sign out button.
Deploy `vercel --prod`. Commit: `feat(auth): Google sign-in, device registry and CSV upload with ML pipeline`.

## Phase 7 — Mechanical test pass (commit 7) → redeploy
- `npm test`, `npm run build`, `npm run lint` all green.
- `scripts/rls-check.ts`: with the anon key, try to select from `readings` and `devices` (must return 0 rows / error); try inserting into `block_week_stats` as anon (must fail). Print PASS/FAIL.
- Upload `public/sample/sample_block.csv` and a broken CSV (negative pressure, bad date, 6,000 rows) on prod; confirm rejection messages.
- Verify evidence-pack hash: recompute with `sha256sum` and compare.
- **Find at least one real bug**, fix it, write it in `docs/TEST_LOG.md` (what, how found, fix, commit hash), redeploy.

## Phase 8 — Persona test support
Take screenshots of each screen (ask Josep, or use Playwright `npx playwright screenshot` against prod at 390×844) into `docs/screens/`. Write `docs/PERSONA_PROMPT.md` with the two persona prompts from PACKET §11 and the screen order, so Josep can paste them into a fresh chat. After he brings back the log, fix the worst confusion, redeploy, and add it to `docs/PERSONA_LOG.md`.

## Session Close (every session)
Update `DECISIONS.md` (decisions made, why, tomorrow's first move), commit, push. Minimum totals: 5+ commits, 2+ production deploys.

## When Josep needs to act — always say exactly:
- what to do, numbered, with the exact URL or command;
- what to paste back to you (e.g., "pégame el project ref", never "pégame la service key en el chat" — secrets go into `.env.local` or `vercel env add`, which he runs himself or you run interactively).
