# Wordle League

A **phone-first Wordle league tracker** for a small group (WhatsApp + manual entry). One person runs it as a lightweight PWA on their phone: paste share texts or chat dumps, keep a season leaderboard, and share a recap image.

There is **no backend**. All league data lives in the browser’s `localStorage` on that device.

**Live (current production on `main`):** https://ae-sir.github.io/wordle-league/  
That site is still the original static HTML/JS deploy until this branch is merged and Pages is cut over deliberately.

---

## What it does

| Tab | Purpose |
|-----|---------|
| **Today** | Pick a date, see that day’s results and winner(s) |
| **Leaderboard** | Season standings: points, wins, average guesses, games played |
| **+ Add** | Paste a Wordle share line or WhatsApp chat chunk, or enter a score manually |
| **Share** | Build a recap image (day + season) and share/download it |
| **Backup** | Export/import a JSON backup (merge by player + date) |

**Scoring:** `1/6` → 6 pts … `6/6` → 1 pt · `X` → 0. Daily win = lowest solved guess count (ties share the win). Season sort: points, then average guesses.

**Data key:** `wordle-league-entries-v1` (unchanged from the pre-revamp app so existing phone data keeps working after upgrade).

---

## Tech stack (this branch)

| Layer | Choice |
|-------|--------|
| Language | **TypeScript** (strict: `strict`, `noUncheckedIndexedAccess`, …) |
| Bundler / dev server | **Vite 6** |
| Runtime for tooling | **Node.js ≥ 22** (app itself runs in the browser) |
| UI | **Vanilla DOM** (no React/Vue) |
| Validation | **Zod** at storage/import boundaries |
| Tests | **Vitest** (parsers, scoring, backup merge) |
| Package manager | **npm** |
| Installable shell | Web app **manifest** + icons (no service worker in v1) |
| Hosting target (later) | **GitHub Pages** project site (`/wordle-league/`) — not auto-deployed from this PR alone |

Pre-revamp static site is preserved under **`legacy/`** for side-by-side comparison only.

---

## Requirements

- [Node.js](https://nodejs.org/) **22+**
- npm (comes with Node)

```bash
node -v   # should be v22.x or newer
```

---

## Run locally

Clone the repo and use this feature branch (or `main` after merge):

```bash
git clone git@github.com:ae-sir/wordle-league.git
cd wordle-league
git checkout feat/vite-ts-revamp   # until merged
npm install
```

### Development (hot reload)

```bash
npm run dev
# → http://localhost:5173/
```

Expose on your LAN (phone on the same Wi‑Fi):

```bash
npm run dev:host
# → http://0.0.0.0:5173/  and http://<your-lan-ip>:5173/
```

### Production build (local only)

```bash
npm run build      # typecheck + vite build → dist/
npm run preview    # serve dist on http://0.0.0.0:4173/
```

GitHub Pages uses a subpath. To mimic that **without deploying**:

```bash
VITE_BASE=/wordle-league/ npm run build
VITE_BASE=/wordle-league/ npm run preview
```

### Quality checks

```bash
npm run typecheck
npm test
```

### Old vs new (optional)

```bash
npm run compare
# OLD static:  http://127.0.0.1:8780/   (legacy/)
# NEW Vite:    http://127.0.0.1:5173/
```

Or separately: `npm run legacy` and `npm run dev:host`.  
See **[docs/COMPARE.md](docs/COMPARE.md)** for a full checklist. Sample import: `fixtures/sample-league.json`.

Different ports = different origins = **separate** `localStorage` during compare.

---

## npm scripts

| Script | What it does |
|--------|----------------|
| `npm run dev` | Vite dev server (localhost) |
| `npm run dev:host` | Vite on `0.0.0.0:5173` for LAN |
| `npm run build` | Typecheck + production build → `dist/` |
| `npm run preview` | Serve `dist` on `:4173` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest once |
| `npm run test:watch` | Vitest watch mode |
| `npm run legacy` | Serve pre-revamp app on `:8780` |
| `npm run compare` | Legacy + Vite together for visual parity |

---

## Project layout

```
src/
  domain/       # types, points, season standings, upsert
  parse/        # Wordle share + WhatsApp chat parsing
  storage/      # localStorage + backup (zod)
  ui/           # status, canvas share, DOM helpers
  styles/       # app CSS
  main.ts       # app wiring
legacy/         # original static HTML/JS/CSS (compare only)
public/         # icons, manifest, .nojekyll
tests/          # Vitest
fixtures/       # sample backup JSON
docs/COMPARE.md # old vs new checklist
```

---

## Features in more detail

- **Paste chat text** — WhatsApp-style dumps (player + date + result) or a single `Wordle … N/6` share. Chat dates default to **DD/MM** (AU); switch to **MM/DD** in the Add tab if needed.
- **Manual entry** — player chips, guess grid 1–6 / X, date, replace confirmation (optional display-name update when casing differs).
- **Share** — canvas recap; Web Share API when available, otherwise download PNG.
- **Backup** — JSON export; import merges and overwrites matching `date + player` ids; size/row caps; invalid rows skipped.

### Hardening vs the old static app

- Schema-validated load/import (bad rows dropped + status message)  
- Validation errors instead of silent no-ops on empty forms  
- Confirm before delete  
- Manifest `start_url` / `scope` set to `./`  
- Pinch-zoom allowed; basic tab ARIA  

No cloud sync and no service worker in this version.

---

## Deploy notes (not automatic on this PR)

Production today is **legacy branch deploy** of static files on GitHub Pages. This branch introduces a Vite `dist/` build.

After merge, cut over only when you intend to:

1. Build with `VITE_BASE=/wordle-league/` (or equivalent in CI).  
2. Publish `dist/` via GitHub Actions → Pages (or another agreed method).  
3. Point Pages at that source instead of raw `main` root files.

Until then, use **local/LAN** runs above. Do not assume pushing this branch alone changes the live site.

---

## License / ownership

Private league tool for personal use; repo: [ae-sir/wordle-league](https://github.com/ae-sir/wordle-league).
