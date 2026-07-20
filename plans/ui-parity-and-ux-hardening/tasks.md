# 03 — Tasks: UI parity & UX hardening

## Phase 1: Shell & navigation

- [ ] Port header (LEAGUE tiles + sync button)
- [ ] Port tab bar: Today / Leaderboard / + Add / Share / Backup
- [ ] `setTab` + panel visibility; `data-goto` empty states
- [ ] Status line with `aria-live="polite"`
- [ ] Wire `sync` → `loadEntries` + full re-render

## Phase 2: Today & Leaderboard

- [ ] Date select bound to `selectedDate` / `getActiveDate`
- [ ] Daily cards: badge, name, points, winner, delete control
- [ ] Delete: **confirm** then `deleteEntry` + persist
- [ ] Season table: rank, name, pts, wins, avg, games + scoring note
- [ ] Empty states match current copy (roughly)

## Phase 3: Add tab

- [ ] Mode toggle paste / manual
- [ ] Paste input → domain paste orchestrator → bulk or single or error
- [ ] Bulk preview checkboxes + import
- [ ] Single fallback: player chips, date, save + replace UX
- [ ] Manual: chips, guess grid 1–6/X, date, replace box
- [ ] **No silent returns:** missing fields → error status text
- [ ] Apply **replace_name_policy** decision when id exists

## Phase 4: Share tab

- [ ] Port `renderShareCanvas` using domain getters (active date + season)
- [ ] Improve height calculation if cheap (measure from row counts still OK if tested)
- [ ] Share via `navigator.canShare` + files; cancel ≠ error
- [ ] Download button always available
- [ ] Empty state when no entries

## Phase 5: Backup tab

- [ ] Export download JSON (schema 1)
- [ ] Import file picker → preview summary (range, skipped, overlaps)
- [ ] Confirm merge / cancel
- [ ] Enforce import size/count caps with clear error
- [ ] Hint copy about device-local storage preserved

## Phase 6: a11y & PWA

- [ ] Viewport: allow user scaling (remove or relax `user-scalable=no` / `maximum-scale=1`)
- [ ] Tabs: `role="tablist"` / `role="tab"` / `aria-selected` (or equivalent clear labels)
- [ ] Icon buttons: accessible names (sync, delete, share)
- [ ] Manifest: `start_url` `./`, `scope` `./`, theme colors unchanged
- [ ] Icons: add `purpose: "any maskable"` if assets acceptable; else document follow-up
- [ ] SW only if decision says so — default **no SW**

## Phase 7: Cleanup & ship

- [ ] Manual parity checklist (proposal) on desktop + Android Chrome
- [ ] Remove or archive legacy `app.js` / root HTML per decision
- [ ] README: updated feature docs, backup warning, Node 22, deploy via Actions
- [ ] `npm run typecheck && npm test && npm run build` green
- [ ] Live smoke after deploy

## Done criteria

```bash
npm run typecheck
npm test
npm run build
# Manual: parity checklist items 1–7 in proposal
```

No remaining references to untyped global `entries` array outside the app state module.

## Explicit non-goals

- [ ] ~~Cloud sync~~  
- [ ] ~~Season archive product feature~~  
- [ ] ~~Emoji grid on share image~~  
