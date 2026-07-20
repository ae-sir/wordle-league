# 02 — Strict domain types, storage validation & tests

## Summary

Extract the **pure core** of Wordle League (types, scoring, parsers, storage, backup merge) into typed modules with **runtime validation** at the storage/import boundary and **Vitest characterization tests**. Preserve the live data key and entry identity so phones with existing leagues keep working.

**Depends on:** plan 01 (Vite + Vitest toolchain).  
**Blocks:** plan 03 (UI should import these modules, not re-implement logic).

## Why (merged audit evidence)

| Issue | Evidence | Impact |
|-------|----------|--------|
| Untyped load | `loadEntries` only `JSON.parse` (`app.js:25–31`) | Non-array object → `.map` throws → app dead |
| Unguarded points | `POINTS[parseInt(...)]` (`app.js:156`, `247`, …) | Bad guesses → `NaN` season totals |
| Import better than load | `parseBackupFile` validates shape; cold load does not | Asymmetric robustness |
| DD/MM hardcode | `parseHeaderDate` (`app.js:74–84`); README admits AU default | US chats mis-date; ambiguous days silent |
| Replace casing | `upsertEntry` keeps `existing.player` (`app.js:173`) | Cannot fix display name via re-entry |
| No tests | Zero test files | Migration rewrites risk silent scoring bugs |
| Monolith | Entire `app.js` globals | Hard to unit-test parser vs storage vs canvas |

### Things that stay the same (data compatibility)

```ts
// Implicit model today — make it explicit, do not change wire format
type Guesses = "1" | "2" | "3" | "4" | "5" | "6" | "X";
type Entry = {
  id: string;       // `${date}-${player.toLowerCase()}`
  player: string;
  date: string;     // YYYY-MM-DD
  guesses: Guesses;
  addedAt: number;
};
```

- **STORAGE_KEY** remains `wordle-league-entries-v1`
- **id format** unchanged
- Scoring map unchanged: `1→6 … 6→1, X→0`
- Backup envelope `{ schema: 1, exportedAt, entries }` still accepted; bare arrays still accepted

## What changes

### Domain modules (`src/domain/`, `src/parse/`, `src/storage/`)

Suggested split:

```
src/
  domain/
    types.ts          # Entry, Guesses, SeasonRow, PasteResult
    points.ts         # POINTS map, pointsFor(guesses)
    season.ts         # getSeason, getDailyWinners, sort helpers
    upsert.ts         # upsertEntry pure (returns new array + flags)
  parse/
    share.ts          # parseShareResult
    chat.ts           # parseChatDump
    dates.ts          # parseHeaderDate + locale setting
  storage/
    local.ts          # loadEntries / saveEntries + schema
    backup.ts         # export payload, parseBackupFile, merge
```

### Typing bar

- `strict` + prefer `noUncheckedIndexedAccess`
- No `any`; catch as `unknown`
- Discriminated paste result:  
  `{ kind: 'bulk'; rows } | { kind: 'single'; guesses } | { kind: 'error'; message }`
- Pure functions: `(entries, input) => result` — no DOM

### Validation

- On load: ensure array; validate each row; apply **invalid_row_policy** decision
- On import: same validators + **size cap** (e.g. reject > 2 MB or > 10_000 entries) — from second audit
- Never let in-memory `entries` be non-array

### Tests (golden fixtures)

- `tests/fixtures/` with real-ish WhatsApp dumps (AU headers, Android/iOS styles)
- Share lines: with/without `#`, commas, hard mode `3/6*`
- Scoring: points, daily multi-winners, season sort tie-break
- Backup: valid envelope, bare array, skipped invalid rows, merge overwrite by id
- Storage: corrupt JSON, object-not-array, partial bad rows

### Player replace casing (small pure fix)

Expose explicit option on upsert: keep existing casing vs take new player string (UI can confirm in plan 03). Default can stay current behavior with a tested knob.

## What does NOT change

- DOM rendering, tabs, canvas drawing (plan 03)
- Deploy workflow (plan 01)
- Scoring mathematics
- Adding a backend

## Out of scope

- Full settings UI (plan 03 may add a tiny date-format control wired to `dates.ts`)
- Service worker
- Multi-device sync

## Risks & escape hatches

- **Over-strict schema** drops historically valid entries → log counts; prefer coerce where safe (`guesses` uppercased already on import)
- **Auto date detect** (if chosen) wrong → STOP and fall back to explicit toggle rather than shipping heuristics
- **If plan 01 not merged:** implement modules under `src/` only after scaffold exists; do not invent a second package layout

## Dependencies

- **Blocked by:** plan 01  
- **Blocks:** plan 03  

## Maintenance

- Any new paste format goes in `parse/*` + a fixture test  
- Schema version bumps: if wire format changes later, add `schema: 2` migration in `storage/local.ts` only
