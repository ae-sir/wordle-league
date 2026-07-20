# Wordle League

A **phone-first Wordle league tracker** for a small group (WhatsApp + manual entry). One person runs it as a lightweight PWA on their phone: paste share texts or chat dumps, keep a season leaderboard, and share a recap image.

There is **no backend**. All league data lives in the browser’s `localStorage` on that device.

**Live site (until Pages is cut over to this build):** https://ae-sir.github.io/wordle-league/

Migration history (static JS → Vite/TS → Tailwind/shadcn): **[docs/MIGRATION.md](docs/MIGRATION.md)**.

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

**Data key:** `wordle-league-entries-v1` (stable so existing phone data keeps working).

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | **React 19** + **shadcn/ui** (Radix) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) |
| Language | **TypeScript** (strict) |
| Bundler / dev server | **Vite 6** |
| Tooling runtime | **Node.js ≥ 22** |
| Validation | **Zod** (storage / import) |
| Icons | **lucide-react** |
| Tests | **Vitest** |
| Package manager | **npm** |
| PWA | Manifest + icons (no service worker) |
| Hosting target | **GitHub Pages** (`/wordle-league/`) when publishing `dist/` |

---

## Requirements

- [Node.js](https://nodejs.org/) **22+**
- npm (bundled with Node)

```bash
node -v   # v22.x or newer
```

---

## Setup

```bash
git clone git@github.com:ae-sir/wordle-league.git
cd wordle-league
npm install
```

---

## Development

```bash
npm run dev
# → http://localhost:5173/
```

On your LAN (phone on the same Wi‑Fi):

```bash
npm run dev:host
# → http://0.0.0.0:5173/  and http://<lan-ip>:5173/
```

---

## Local production build

```bash
npm run build      # typecheck + vite build → dist/
npm run preview    # serve dist on http://0.0.0.0:4173/
```

GitHub Pages uses a subpath. To mimic that locally:

```bash
VITE_BASE=/wordle-league/ npm run build
VITE_BASE=/wordle-league/ npm run preview
```

---

## Compare with pre-migration app

Does **not** keep a `legacy/` folder in the repo. `npm run compare` extracts **`origin/main`** (old static site) into a temp dir and serves it next to this app:

```bash
git fetch origin main
npm run compare
# OLD (main static):  http://127.0.0.1:8780/
# NEW (this branch):  http://127.0.0.1:5173/
```

Different ports = different origins = separate `localStorage`.

---

## Checks

```bash
npm run typecheck
npm test
```

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
| `npm run compare` | Old `origin/main` on `:8780` + this app on `:5173` |

---

## Project layout

```
src/
  App.tsx              React UI (shadcn + Tailwind)
  components/ui/       shadcn components
  domain/              points, season, upsert (pure)
  parse/               Wordle + WhatsApp parsers
  storage/             localStorage + backup (zod)
  lib/utils.ts         cn() helper
public/                icons, manifest
tests/                 Vitest
docs/MIGRATION.md
```

---

## Deploy (GitHub Pages)

Pushes to `main` run **Deploy to GitHub Pages** (`.github/workflows/deploy-pages.yml`):

1. `npm ci` → typecheck → test → build with `VITE_BASE=/wordle-league/`
2. Upload `dist/` and deploy via Actions

Site: https://ae-sir.github.io/wordle-league/

Repo Settings → Pages → Source must be **GitHub Actions** (not “Deploy from a branch”).
