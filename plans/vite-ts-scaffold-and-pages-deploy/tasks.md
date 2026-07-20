# 01 — Tasks: Vite + TS scaffold & Pages deploy

## Phase 1: Scaffold

- [ ] Initialize package with chosen package manager; set `"engines": { "node": ">=22" }`
- [ ] Add `vite`, `typescript`, `vitest`, `@types/node` (and UI framework deps if decision ≠ vanilla)
- [ ] `tsconfig.json`: `strict: true`, `moduleResolution: bundler`, `noEmit` for app; enable `noUncheckedIndexedAccess`
- [ ] `vite.config.ts`: `base: '/wordle-league/'`, Vitest config block
- [ ] Scripts: `dev`, `build`, `preview`, `typecheck`, `test`
- [ ] Root `index.html` pointing at `/src/main.ts`
- [ ] `src/main.ts` mounts a minimal shell (app root exists)
- [ ] Port `style.css` → `src/styles/app.css` and import it
- [ ] Copy icons + `manifest.json` + `.nojekyll` into `public/`
- [ ] Fix manifest `start_url` / `scope` to `"./"` (not `./index.html`) if editing here; full PWA polish can wait for plan 03
- [ ] Keep legacy `app.js` / root assets available for reference (`legacy/` or leave until plan 03)

## Phase 2: Local verification

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` runs (may be zero tests yet — harness works)
- [ ] `npm run build` emits `dist/` with hashed assets
- [ ] `npm run preview` — open with base path; CSS and icons load
- [ ] Confirm `dist` contains `.nojekyll` (from `public/`)

## Phase 3: GitHub Actions Pages

- [ ] Add `.github/workflows/deploy.yml`:
  - trigger: push to `main` (and workflow_dispatch)
  - permissions: `pages: write`, `id-token: write`, `contents: read`
  - jobs: build (Node 22, install, typecheck, test, build) → upload `dist` → deploy-pages
- [ ] Optional PR workflow: typecheck + test + build **without** deploy
- [ ] Document in README: switch Settings → Pages → **GitHub Actions**
- [ ] After first green run, flip Pages source (per decision)
- [ ] Smoke live URL: `https://ae-sir.github.io/wordle-league/` loads shell; Network tab shows CSS/JS under `/wordle-league/assets/...` (not 404)

## Phase 4: Docs & hygiene

- [ ] README: dev/build/preview/deploy steps; note Node 22 requirement
- [ ] Note data key will be preserved in later plans (`wordle-league-entries-v1`)
- [ ] `.gitignore`: `node_modules`, `dist`, `.planning-hub` if present
- [ ] Do **not** commit `Co-Authored-By` trailers

## Done criteria (machine-checkable)

```bash
node -v                    # v22.x
npm run typecheck          # exit 0
npm test                   # exit 0
npm run build              # dist/ exists
test -f dist/.nojekyll
grep -q "wordle-league" vite.config.ts   # or equivalent base config
test -f .github/workflows/deploy.yml
```

Live (after cutover): HTML 200; linked stylesheet 200 under `/wordle-league/`.
