# TEST_LOG — Mapa de Tandeo

## Session 1 (Phase 7 — mechanical test pass)

### Automated
- `npm test` (vitest): 21/21 passing (ml module + CSV validation).
- `npm run build`: clean, all routes compile.
- `npm run lint`: clean.
- `npx tsx scripts/rls-check.ts` against production Supabase, with only the anon key:
  - PASS — anon SELECT `readings` → 0 rows.
  - PASS — anon SELECT `devices` → 0 rows.
  - PASS — anon INSERT `block_week_stats` → rejected by RLS.
  - PASS — anon SELECT `blocks` → succeeds (public aggregate, as intended).

### Manual, against production (https://mapa-tandeo.vercel.app)
- `/cuadra/NOPE` → 404.
- `/api/evidencia/csv` with no `week` param → 400, clear Spanish error.
- `/api/evidencia/csv?week=not-a-date` → 400, clear Spanish error.
- `/api/evidencia/csv?week=2099-01-01` (valid format, no data yet) → 200, header-only CSV, no crash.
- `/api/evidencia/manifest?week=2026-01-26` → downloaded, recomputed `sha256sum` locally, matches the manifest's hash exactly.
- Re-confirmed Google OAuth is still wired after the Phase 6 redeploy (`/auth/v1/authorize?provider=google` → 302 to accounts.google.com).

### Bug found, fixed, and covered by a regression test
**What:** `parseAndValidateCsv` (the CSV upload validator used by the promotora panel) matched column headers by exact string equality. A CSV with headers like `Timestamp, Pressure_Bar` (very plausible from a real export — different capitalization, stray spaces) failed with a raw, English, not-useful-to-Lupita message: `"Fila 2: Invalid input: expected string, received undefined."` — giving no hint that the actual problem was the header spelling.

**How found:** While testing CSV edge cases for this phase, after confirming bad-date/negative-pressure/over-range/row-cap/byte-cap all gave correct Spanish messages, I tried a header with different case and spacing as one more realistic variant a promotora might actually upload.

**Fix:** `src/lib/csv.ts` now normalizes headers (`trim().toLowerCase()`) via Papa.parse's `transformHeader`, so case/whitespace differences no longer break parsing, and added an explicit check that returns a clear Spanish message (`"El archivo debe tener las columnas 'timestamp' y 'pressure_bar'."`) when a column is genuinely missing, instead of a cryptic per-row zod error.

**Regression coverage:** `src/lib/csv.test.ts` — 8 cases including the header-normalization case and the missing-column case.

**Commit:** see `fix(csv): normalize header casing/whitespace, clear missing-column message` in this session's history.

### Known limitation, not a bug
The CSV-upload ML pipeline (`src/app/panel/actions.ts`) deliberately cannot run a full cross-population isolation forest in production, because it runs under the uploading promotora's own RLS-scoped session (by design — she can never read another promotora's raw devices/readings). It instead: runs `detectEvents` per device/week, flags a direct population-free tamper signature (near-zero variance across a week), runs `twoLoggerCheck` across devices *she herself* owns on the block, and sources the sector average from the already-public `block_week_stats` of other blocks. This is documented in `DECISIONS.md` under Phase 6.

### Manual click-through, done by Josep in production (2026-10-21)
- Uploaded `public/sample/sample_block.csv` via `/panel` to device on block **IZT-S4-B03** → accepted, 4,320 readings across 1 week.
- Uploaded `docs/test/bad.csv` (fecha inválida en la fila 4, presión negativa en la fila 5) → rejected with `"Fila 4: Fecha inválida."`, confirming the whole-file-reject behavior (the date error surfaces before the validator ever reaches the negative-pressure row).
- Both results match the validator's expected behavior exactly — no new bug found in this pass.

### Noted during this pass, deferred until after the persona test (not fixed yet)
- The CSV preview in `/panel` renders the parsed rows as raw `JSON.stringify` output instead of a readable table.
- `parseAndValidateCsv` rejects the whole file on the *first* row error found, so a file with several different problems only ever reports one at a time instead of all of them.
