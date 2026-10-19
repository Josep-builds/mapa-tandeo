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
