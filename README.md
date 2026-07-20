# Wordle League

Phone-first Wordle league tracker. **Vite + TypeScript (strict)** app with the original static site kept under `legacy/` for side-by-side comparison.

> **Branch note:** This work lives on `feat/vite-ts-revamp`. It is **not** deployed to GitHub Pages from this branch. Do not cut over Pages until an explicit merge/MR is approved.

## Quick start (new app)

```bash
npm install   # Node >= 22
npm run dev:host   # http://0.0.0.0:5173 — LAN demo
```

Other scripts:

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (domain/parser/backup) |
| `npm run build` | Production build → `dist/` (local only) |
| `npm run preview` | Serve `dist` on :4173 |
| `npm run legacy` | Serve **old** static app on :8780 |
| `npm run compare` | Old :8780 + New :5173 together |

### Optional GH Pages-shaped base (not deployed)

```bash
VITE_BASE=/wordle-league/ npm run build
VITE_BASE=/wordle-league/ npm run preview
```

## Data

Stored in the browser under `wordle-league-entries-v1` (unchanged from legacy). Export/import JSON from the Backup tab. Import merges by `date + player` id.

## Compare old vs new

See **[docs/COMPARE.md](docs/COMPARE.md)** for the operational + visual checklist.

## Layout

```
src/           # TypeScript app (domain, parse, storage, ui)
legacy/        # Pre-revamp static site (for compare only)
public/        # icons, manifest, .nojekyll
tests/         # Vitest
plans/         # Review-hub plans (planning artefacts)
```

## Features

- **Today** — day results + winners  
- **Leaderboard** — season points / wins / avg / games  
- **+ Add** — WhatsApp paste (DD/MM or MM/DD) or manual entry  
- **Share** — canvas recap image + download fallback  
- **Backup** — JSON export/import with validation and size caps  

## Approved hardening (vs pure legacy)

- Schema-validated storage (invalid rows dropped + toast)  
- Non-silent form validation  
- Confirm before delete  
- Chat date-format setting  
- Ask to update display name on replace when casing differs  
- Viewport zoom allowed; tab ARIA; manifest `start_url`/`scope` `./`  

No service worker in v1 (manifest-only PWA).
