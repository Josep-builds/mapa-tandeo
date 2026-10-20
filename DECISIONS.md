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
