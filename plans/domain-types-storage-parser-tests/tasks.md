# 02 — Tasks: domain types, storage validation & tests

## Phase 0: Fixtures from legacy behavior

- [ ] Read `app.js` at surveyed commit `fa35561` (or current main equivalent)
- [ ] Capture golden cases into `tests/fixtures/`:
  - single share: `Wordle 1,489 3/6`, `#1489`, hard mode `3/6*`, `X/6`
  - WhatsApp bracket header AU: `[19/07/2026, 8:02 am] Sarah: Wordle …`
  - WhatsApp dash header: `19/07/2026, 8:02 am - Sarah: Wordle …`
  - bulk multi-message dump with one non-Wordle line
  - backup JSON envelope + bare array
- [ ] Document expected scores/winners for a small synthetic season fixture

## Phase 1: Types & pure scoring

- [ ] `src/domain/types.ts` — `Guesses`, `Entry`, `SeasonRow`, result unions
- [ ] `src/domain/points.ts` — points map; `pointsFor(g: Guesses): number` (never undefined)
- [ ] `src/domain/season.ts` — port `getSeason`, `getDailyEntries`, `getDailyWinners`, `guessVal`
- [ ] `src/domain/upsert.ts` — pure upsert returning `{ entries, needsConfirm, existing? }`
- [ ] Unit tests: points table, multi-winner day, season sort, X = 0 pts

## Phase 2: Parsers

- [ ] `src/parse/share.ts` — port `parseShareResult`
- [ ] `src/parse/dates.ts` — port `parseHeaderDate` + locale setting API
- [ ] `src/parse/chat.ts` — port `parseChatDump`
- [ ] Paste orchestrator pure function returning discriminated union
- [ ] Tests for fixtures above; assert hard mode and `#` forms
- [ ] Tests for ambiguous date behavior per decision (`ddmm_default_setting` etc.)

## Phase 3: Storage & backup

- [ ] Schema for Entry (chosen lib or hand-written)
- [ ] `loadEntries`: never throw; non-array → []; invalid rows per policy
- [ ] `saveEntries`: stringify array only; surface quota errors as `false` / Result
- [ ] `STORAGE_KEY` constant **exactly** `wordle-league-entries-v1`
- [ ] `backup.ts`: export `{ schema: 1, exportedAt, entries }`; parse + size caps
- [ ] Merge-by-id semantics match current import
- [ ] Tests: corrupt storage, oversized import, merge overwrite

## Phase 4: Wire into shell (minimal)

- [ ] `src/main.ts` or a thin `src/app/state.ts` holds `entries` using new loaders
- [ ] Temporary: can still re-export for UI plan; no full UI required
- [ ] `npm run typecheck` + `npm test` green
- [ ] Do not change live Pages cutover assumptions

## Done criteria

```bash
npm run typecheck
npm test
# tests cover at least: share parse, chat parse, season points, load corrupt, backup merge
grep -R "wordle-league-entries-v1" src/
```

No `any` in `src/domain`, `src/parse`, `src/storage` (eslint or tsc discipline).

## Explicit non-goals this plan

- [ ] ~~Share canvas~~ plan 03  
- [ ] ~~Delete confirm / form toasts~~ plan 03  
- [ ] ~~PWA service worker~~ deferred  
