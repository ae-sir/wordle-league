# Migration note (for maintainers / future LLMs)

## Timeline

1. **Original** — zero-build static site: root `index.html` + `app.js` + `style.css`, GitHub Pages branch deploy, data in `localStorage` key `wordle-league-entries-v1`.
2. **Vite + TypeScript** — domain/parse/storage extracted to pure modules; Vitest; vanilla DOM UI; `legacy/` briefly held the old tree for compare.
3. **Current** — UI rebuilt with **React 19 + Tailwind CSS v4 + shadcn/ui**. Pure domain modules unchanged. **`legacy/` removed**; compare uses a temp extract of `origin/main`.

## What this product is

Phone-first single-user Wordle league tracker (Today / Leaderboard / Add / Share / Backup). No backend.

## Stack now

| Piece | Tech |
|-------|------|
| UI | React 19, shadcn/ui (Radix), lucide-react |
| CSS | Tailwind v4 via `@tailwindcss/vite` |
| Build | Vite 6, TypeScript strict |
| Data validation | Zod at load/import |
| Tests | Vitest on domain/parse/storage |
| Node for tooling | ≥ 22 |

## Compatibility contracts (do not break casually)

1. **`STORAGE_KEY`** = `wordle-league-entries-v1` (`src/storage/local.ts`)
2. **Entry id** = `` `${date}-${player.toLowerCase()}` ``
3. **Entry shape**: `{ id, player, date: YYYY-MM-DD, guesses: "1"…"6"|"X", addedAt }`
4. **Scoring**: 1→6 … 6→1 pts, X→0; season sort points then avg guesses
5. **Backup**: `{ schema: 1, exportedAt, entries }` or bare array

## Layout map

```
src/App.tsx           React shell + tabs
src/components/ui/    shadcn primitives
src/components/ShareCanvas.tsx
src/domain/           types, points, season, upsert
src/parse/            share, chat, dates, paste orchestrator
src/storage/          localStorage + backup
src/index.css         Tailwind + theme tokens (Wordle-ish dark greens)
```

## Compare old vs new locally

```bash
git fetch origin main
npm run compare
```

Serves `origin/main` static files on **:8780** and this app on **:5173**. No `legacy/` folder in git.

## Deploy

Production may still be the old static tree until Pages publishes Vite `dist/` with `base: '/wordle-league/'`. Cutover is deliberate, not automatic on merge.

## Agent tips

1. Keep scoring/parser logic in pure modules + tests; put UI in `App.tsx` / components.
2. Add shadcn pieces with `npx shadcn@latest add <component>`.
3. Never change the storage key or id format without a data migration.
