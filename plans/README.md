# Wordle League — plan index

**Repo:** `ae-sir/wordle-league`  
**Surveyed commit:** `fa35561`  
**Live:** https://ae-sir.github.io/wordle-league/  
**Merged from:** two independent Grok audit sessions (same brief, combined here)

## Product snapshot

Single-user, phone-first Wordle league tracker. Vanilla HTML/CSS/`app.js` (~813 LOC), **no package.json**, no tests, no CI. Data in `localStorage` key `wordle-league-entries-v1`. GitHub Pages **legacy branch deploy** (`main` → `/`) at project path `/wordle-league/`.

**Node 20:** not used today. Migration must target **Node 22 LTS** (local machine already has v22.x). Do not scaffold on Node 20.

## Dependency order

```
001 vite-ts-scaffold-and-pages-deploy
        │
        ▼
002 domain-types-storage-parser-tests   ← keep STORAGE_KEY + entry id format
        │
        ▼
003 ui-parity-and-ux-hardening          ← needs typed domain + working base path
```

| # | Plan ID | Branch | Effort | Risk |
|---|---------|--------|--------|------|
| 01 | `vite-ts-scaffold-and-pages-deploy` | `feat/vite-ts-pages` | M | MED (wrong `base` blanks prod) |
| 02 | `domain-types-storage-parser-tests` | `feat/domain-strict-types` | M | LOW–MED |
| 03 | `ui-parity-and-ux-hardening` | `feat/ui-parity-hardening` | M–L | MED (parity) |

## Out of scope for this pack (v1)

- Cloud sync / multi-device backend  
- Full React/Vue + state library (default UI: **vanilla TS**)  
- Service worker / offline until deploy is proven  
- Changing scoring rules  
- Season reset / emoji-grid share cards (product direction only)

## Verification baseline (post-migration)

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # vite build
npm run preview     # smoke against base path
```
