# Migration note (for maintainers / future LLMs)

## What this repo used to be

A **zero-build static site** for a single-user Wordle league tracker:

- Root files: `index.html`, `app.js` (~800 LOC), `style.css`, `manifest.json`, icons
- No `package.json`, no TypeScript, no tests, no bundler
- Deployed as GitHub Pages **legacy branch deploy** (`main` → site root)
- Data only in `localStorage` under key **`wordle-league-entries-v1`**

Behavior: tabs for Today / Leaderboard / Add (WhatsApp paste + manual) / Share (canvas PNG) / Backup (JSON).

## What it is now

Same product, rebuilt as a **Vite + TypeScript** SPA-style static app:

| Before | After |
|--------|--------|
| Plain JS `app.js` | `src/**/*.ts` modules |
| No types | TypeScript **strict** (`noUncheckedIndexedAccess`, etc.) |
| No validation on load | **Zod** coerce/validate entries; drop bad rows |
| No tests | **Vitest** for parse / scoring / backup |
| No build | **Vite 6** → `dist/` |
| Node N/A | Tooling requires **Node ≥ 22** |
| Root static deploy | Still *capable* of GH Pages; prefer `VITE_BASE=/wordle-league/` when publishing `dist/` |

UI remains **vanilla DOM** (no React). Manifest-only PWA (no service worker).

## Compatibility contracts (do not break casually)

1. **`STORAGE_KEY`** = `wordle-league-entries-v1` (`src/storage/local.ts`)
2. **Entry id** = `` `${date}-${player.toLowerCase()}` ``
3. **Entry shape**: `{ id, player, date: YYYY-MM-DD, guesses: "1"…"6"|"X", addedAt }`
4. **Scoring**: 1→6 … 6→1 pts, X→0; season sort points then avg guesses
5. **Backup**: `{ schema: 1, exportedAt, entries }` or bare array of entries

Breaking these without a migration path wipes or corrupts real league data on phones.

## Where the old code went

Pre-migration static tree lives under **`legacy/`** for local dual-run / visual comparison (`npm run legacy`, `npm run compare`). It is not the primary app. Safe to delete later once the Vite app is live on Pages and parity is trusted.

## Layout map

```
src/domain/    types, points, season, upsert
src/parse/     Wordle share + WhatsApp chat + dates
src/storage/   localStorage + backup (zod)
src/ui/        canvas share, status, DOM helpers
src/main.ts    UI wiring
legacy/        old static site
public/        icons, manifest, .nojekyll
tests/         vitest
fixtures/      sample backup JSON
```

## Hardening added in the migration

- Non-silent form validation; confirm on delete
- Import size/row caps; invalid row skip
- Chat date locale DD/MM (default) vs MM/DD setting
- Optional display-name update when replacing same id with different casing
- Manifest `start_url` / `scope` `./`; viewport allows zoom

## Deploy status (as of migration)

Production URL may still serve the **old** static tree from `main` until Pages is switched to a Vite `dist/` publish. This migration branch does not by itself require Actions; cutover is a deliberate follow-up.

## Suggested agent orientation

1. Read `README.md` for how to run.
2. Treat `src/domain` + `src/parse` + `src/storage` as the source of truth for rules.
3. Prefer extending pure modules + tests over growing `main.ts` only.
4. Never change the storage key or id format without an explicit data migration.
