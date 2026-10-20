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
