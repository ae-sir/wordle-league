# 01 — Vite + TypeScript scaffold & GitHub Pages deploy

## Summary

Stand up a modern static toolchain for Wordle League: **Vite + TypeScript (strict) + Node 22**, with a **GitHub Actions → Pages** pipeline that correctly serves the project site at `/wordle-league/`. This plan does **not** rewrite domain logic or UI parity — it creates a deployable shell and verification baseline so later plans can land safely.

## Why

| Current | Problem |
|---------|---------|
| No `package.json`, no bundler, no types | No typecheck/test gate; every change is phone-only QA |
| Pages `build_type: "legacy"`, branch `main` `/` | Cannot serve a Vite `dist/` without committing build output or switching to Actions |
| Early Pages builds **errored** then recovered after `.nojekyll` thrash | Jekyll can mangle non-Jekyll sites; normalize `.nojekyll` in `public/` |
| Project URL path `/wordle-league/` | Vite default `base: '/'` will 404 CSS/JS in production |

### Node 20 correction (both audits)

This repo **does not use Node today**. “Deprecated Node 20” is a **migration default to avoid**, not a production bug. Node 20 EOL was **April 2026**; implementation date context is **2026-07-20**. Use:

- `package.json` → `"engines": { "node": ">=22" }`
- Actions → `node-version: '22'`
- Do not copy tutorials that still pin Node 20

Local environment already has Node **v22.x** available.

## What changes

- Add Vite + TypeScript + Vitest + ESLint (minimal) scaffolding
- `tsconfig` with **strict** (`strict: true`; prefer `noUncheckedIndexedAccess`)
- `vite.config.ts` with `base: '/wordle-league/'` (or env-derived for future user-site root)
- Move static assets into `public/` (icons, manifest, **`.nojekyll`**)
- Entry `index.html` + `src/main.ts` shell (title tiles or simple “Wordle League” placeholder is fine)
- Port `style.css` → `src/styles/` so build path is real
- `.github/workflows/deploy.yml`: build on push to `main` (and optionally PRs without deploy)
- `engines.node >= 22`; commit lockfile
- README: how to dev / build / deploy; document Pages Actions switch
- Optional: set repo `homepage` to the live URL (polish)

## What does NOT change

- Scoring rules, entry `id` format, `STORAGE_KEY` (`wordle-league-entries-v1`)
- Full UI/feature parity (plan 03)
- Domain extraction and tests (plan 02) — may add empty `src/domain/` stubs only
- Service worker / offline PWA
- Cloud sync

## Critical Vite + Pages settings

| Setting | Value |
|---------|-------|
| `base` | `'/wordle-league/'` |
| Node | **22** in engines + Actions |
| Deploy | `configure-pages` + `upload-pages-artifact` + `deploy-pages`; artifact = `dist` |
| Repo Pages source | **GitHub Actions** (after first green build) |
| Paths | Use `import.meta.env.BASE_URL` for any absolute asset URLs |
| Cache note | GH Pages ~10 min CDN cache; hashed assets help after Vite |

## Suggested tree after this plan

```
wordle-league/
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  index.html
  public/
    icon-192.png
    icon-512.png
    manifest.json   # or .webmanifest
    .nojekyll
  src/
    main.ts
    styles/app.css
    vite-env.d.ts
  .github/workflows/deploy.yml
  README.md
```

Legacy root files (`app.js`, old `index.html`, root `style.css`) may remain temporarily for reference during plans 02–03, or be moved to `legacy/` — **do not delete until plan 03 parity is signed off** unless reviewer decides otherwise.

## Out of scope

- Implementing parser/storage modules (plan 02)
- Full tab UI, share canvas, backup flows (plan 03)
- React ecosystem unless decision says so
- Custom domain

## Risks & escape hatches

- **Wrong base:** production looks broken while `npm run dev` looks fine → always smoke-test `vite preview --base /wordle-league/` and the live URL after cutover.
- **Pages flip too early:** if Actions fails, site goes down → keep a known-good commit on `main` or delay cutover until workflow is green on a dry-run.
- **If repo is renamed or moved to user site (`username.github.io`):** `base` must change to `'/'` — parameterize via env.

## Dependencies

- **Blocks:** plans 02 and 03 (they assume this toolchain exists)
- **Blocked by:** nothing

## Maintenance

- Future deploys are Actions-only; do not re-enable branch deploy without removing Actions conflict
- Bump Node only via LTS; keep `engines` in sync with Actions
