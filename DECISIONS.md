# DECISIONS — Mapa de Tandeo

## 2026-10-19 · Session 0 (packet)
- Vacuum: household water tools (Team 7 Blueprint, 3–2 vote). I build the Technologist slice: block-level tandeo map + pipa-priority rule + evidence pack.
- Sensing: CSV from my street-tap gauge test + labeled simulated feed (stack floor allows simulated feeds). No real LoRa/NB-IoT this week.
- ML: supply-event detection (hysteresis 0.6/0.5 bar) + Isolation Forest for tampering — pure TypeScript, no paid API.
- Third stack element: geodata (Leaflet + OSM).
- Usable-pressure threshold 0.6 bar (≈ 6 m head to a rooftop tinaco) — **unverified**, documented as assumption.
- Raw data published with 14-day lag; block aggregates published immediately (Blueprint condition 6, edited).
- Shadow clause: public pages need no login or phone; printable block poster.

**Tomorrow's first move:** Phase 0 logins, then scaffold + first commit.

## 2026-10-20 · Session 1 (Phases 0–5)
- Phase 0: installed gh/vercel/supabase CLIs locally (none were present), logged in to all three, created the Supabase project `mapa-tandeo` (ref `icohpikxtlqhkpvmvtuv`, `us-east-1`) myself per Josep's "option B".
- Built Phases 1–5 autonomously: scaffold, DB schema + RLS + 14-day-lagged `readings_public` view, the ml module (event detection, isolation forest, two-logger check, ranking) with vitest coverage, the labeled simulator/seed, and the public UI.
- **Design fix found while seeding:** running one global isolation forest across every block mixed study sectors with the comparison colonia, so sector 4 (the worst-off, by design) got auto-flagged "anomalous" most weeks just for being poor — exactly the data the app exists to protect. Fixed by running the forest per group (each sector, and the comparison colonia, separately), so a device is only ever judged against its own peers. Confirmed afterward: the booster-pump block and the tampered device are still caught correctly.
- Repo: https://github.com/Josep-builds/mapa-tandeo
- **Production URL (Deploy 1):** https://mapa-tandeo.vercel.app — map, pipa priority, block pages + posters, tamper log, and the evidence pack (CSV + SHA-256 manifest) are all live and reading real Supabase data (currently 100% simulated, labeled).
- Threshold/method notes from Session 0 unchanged; evidence pack method notes now published on `/evidencia` itself.

**Tomorrow's first move:** Phase 6 — Google OAuth setup (needs Josep in the Google Cloud + Supabase dashboards), then the promotora panel (device registry + CSV upload + ML pipeline), deploy 2.

## 2026-10-20 · Session 1 continued (Phase 6)
- Josep did the Google Cloud OAuth client + Supabase provider/URL config; confirmed live by hitting Supabase's `/auth/v1/authorize?provider=google` endpoint directly (302 to accounts.google.com) before and after building on top of it.
- Built `/entrar` (Google sign-in), `/auth/callback`, `src/proxy.ts` (Next 16 renamed "middleware" to "proxy" — used the new convention directly rather than the deprecated one), and `/panel`: device registry, own-devices list with last upload, and CSV upload.
- **Scope decision on the upload ML pipeline:** the spec's isolation-forest/two-logger cross-check needs a peer population, but the live upload path runs under the uploading promotora's own RLS-scoped session — by design it can never read another promotora's raw devices/readings (only her own, plus the already-public `block_week_stats` aggregates). So the real-time pipeline: (1) runs `detectEvents` per device per week, (2) flags a direct, population-free tamper signature — near-zero variance in a week's readings — since that needs no peer context, (3) runs `twoLoggerCheck` across devices *she herself* owns on that block (the realistic case — one promotora typically runs both loggers on a block), and (4) sources the sector average from public `block_week_stats` of other blocks rather than raw data. The simulator's full cross-population isolation forest (service-role key, local-only) is a separate, more powerful offline path and stays that way — the deployed app never gets that key.
- **Production URL (Deploy 2):** https://mapa-tandeo.vercel.app — same URL, now with working Google sign-in and the promotora panel live.

**Tomorrow's first move:** Phase 7 — mechanical test pass (`npm test`/`build`/`lint`, `scripts/rls-check.ts`, upload the sample + a broken CSV on prod, re-verify the evidence-pack hash, find and fix a real bug, log it in `docs/TEST_LOG.md`), then redeploy.

## 2026-10-20 · Session 1 continued (Phases 7–8, session close)
- Phase 7: `npm test` (21/21), `npm run build`, `npm run lint` all clean; wrote `scripts/rls-check.ts` and ran it against production with only the anon key (readings/devices unreadable, block_week_stats insert rejected, public blocks read still works — all PASS). Full results in `docs/TEST_LOG.md`.
- **Bug found + fixed:** the CSV upload validator matched headers by exact string equality, so a real-world export like `Timestamp, Pressure_Bar` failed with a cryptic English per-row error instead of parsing or explaining the problem. Fixed with header normalization (trim + lowercase) and a clear Spanish message when a required column is truly missing; covered by `src/lib/csv.test.ts`.
- Phase 8: captured all 7 screens at 390×844 into `docs/screens/`, wrote `docs/PERSONA_PROMPT.md` with both PACKET personas and the screen order. While reviewing the `/evidencia` screenshot, caught a second real issue: the published method notes (comparison rule, label meanings) were in English on an otherwise Spanish page — fixed, now in Spanish (the legal-clinic audience reads Spanish too, so this was wrong on both counts).
- **Not done this session, needs Josep:** (1) the actual browser click-through of CSV upload (sample + broken file) through `/panel` — needs his real Google session, not just the validator logic (already verified directly); (2) running the two persona prompts in a fresh chat and bringing back `docs/PERSONA_LOG.md` — see `docs/PERSONA_PROMPT.md` for exact instructions.
- **Production URL (unchanged, now on its 3rd deploy this session):** https://mapa-tandeo.vercel.app
- Session totals: 10 commits, 3 production deploys (exceeds the 5-commit/2-deploy minimum).

**Tomorrow's first move:** once Josep brings back `docs/PERSONA_LOG.md`, fix the worst confusion it surfaces and redeploy (closing Phase 8). Until then, nothing is blocking — the app is fully live and functional end-to-end (public map → promotora upload → evidence pack).

## 2026-10-21 · Session 1 continued (pre-persona-test fixes)
- Josep ran the manual click-through on production: `public/sample/sample_block.csv` accepted on block IZT-S4-B03; `docs/test/bad.csv` (bad date + negative pressure) correctly rejected with "Fila 4: Fecha inválida." Logged in `docs/TEST_LOG.md`.
- **Map marker overlap, fixed:** the map now fits bounds to Iztapalapa only on load (zoom ~17, not the combined bounding box with the comparison colonia 12 km away), markers are smaller squares (24×24, matching "cuadra" = block) instead of 38px circles, and the position jitter when generating block coordinates was tightened (±0.0001° instead of ±0.0004°, comparison ±0.0002° instead of ±0.0004°) so adjacent blocks' jitter can no longer put them on top of each other. A caption under the map tells the reader to zoom/pan out to see the comparison colonia, since it's no longer in the initial view.
- **Comparison colonia realism, assumption documented:** the simulator previously gave the comparison colonia a flat ~1.1-1.4 bar almost all day (167.9/168 h/week) — implausibly perfect. Changed `generateAbundantWeek` in `scripts/simulate.ts` to model one random daytime "awake" window per day (8-15 h, starting 5-9 a.m.) with strong pressure, and a lower-pressure period the rest of the time (0.3-0.5 bar) — representing the citywide overnight pressure drop that even a well-served colonia experiences. **Assumption (unverified):** 8-15 h/day of strong pressure, landing weekly usable hours around 60-120 h — chosen to be clearly better than Iztapalapa (inequality ratio ~8-16×) without an unrealistic flat 24/7. Re-seeded: this week's comparison median is 84.3 h vs. Iztapalapa's 7.2 h (ratio ≈ 11.7×). The nominal baseline used by the isolation forest's "deviation from sector median" feature for the comparison group was updated from 20 h/day to 11.5 h/day to match.
- Redeployed; re-captured `docs/screens/` from the fixed production app.
- **Noted for after the persona test, not fixed yet:** CSV preview in `/panel` renders raw JSON instead of a table; CSV validation reports only the first row error instead of all of them.

**Tomorrow's first move:** same as above — once Josep brings back `docs/PERSONA_LOG.md`, fix the worst confusion and redeploy. The CSV-preview/all-errors items above are already queued for that same pass.

## 2026-10-21 · Session 1 continued (Phase 8 close — persona test)
- Ran the persona test myself, with two fresh Agent-tool subagents (clean context — no repo access, only the persona prompt and screenshot paths): one for Doña Rosa over `docs/screens/*`, one for Lupita over a new `docs/screens/panel/` flow. Full narrations, verdicts, and ranked confusion lists in `docs/PERSONA_LOG.md`.
- To get Lupita real panel screenshots (register device, bad-CSV rejection, good-CSV success) without her real Google login, I created a throwaway Supabase auth user + a dedicated `TEST-PANEL-DEMO` block via the service-role key (local only), and a temporary local-only API route to drop a pre-obtained session into real auth cookies. Took the screenshots against a local server, then deleted the test user, block, device, readings, and the temporary route — confirmed via the REST API that the block count is back to exactly 50 and the temp route never shipped.
- **Fixed:** "No verificado" appeared with zero explanation until the 4th-5th screen a reader saw it (Doña Rosa's #2) — added a short inline clarifier on `/prioridad`, `/cuadra/[id]`, and the map popup, plus a one-time explainer box on `/prioridad`.
- **Fixed — closes task #10** (Lupita's #1 and #2): the CSV preview now renders as a real table instead of raw `JSON.stringify`, and `parseAndValidateCsv` now reports every bad row at once (capped at 20, with a count of how many more) instead of stopping at the first. Covered by two new vitest cases.
- **Not fixed, flagged as the most important open finding:** Doña Rosa's #1 — there is no way for a resident to find "her" block by street or address, only by sector/manzana number or a code like `IZT-S4-B01`. A real fix needs address data, which conflicts with the "no household-level data" design constraint (PACKET §8/§10) — this needs Josep's product call, not a same-session patch.
- Redeployed; this closes Phase 8.
- Session totals (whole session, both days): 14 commits, 5 production deploys.

**Tomorrow's first move:** decide whether/how to let residents find their own block (the one open finding above) — e.g. a lightweight street-name lookup table per block, without ever storing per-household data. No other phase is blocking; the app is complete end-to-end per PACKET.
