# 03 — UI parity & UX hardening

## Summary

Port the full Wordle League UI (five tabs + share canvas + backup) onto the **plan 02 domain modules** and the **plan 01 Vite shell**. Match current behavior, then apply the merged hardening list from both audits so the app is safer and clearer on a phone.

**Depends on:** plans 01 and 02.  
**Does not include:** cloud sync, season archive product features, emoji-grid share cards.

## Behavior map (parity target)

```
Add (paste/manual) → entries[] → localStorage
        ↓
Today | Leaderboard | Share (canvas PNG) | Backup (JSON) | Sync ↻
```

### Feature checklist (must work)

| Tab | Behaviors |
|-----|-----------|
| **Today** | Date select, daily list sorted by guesses, winner styling, delete |
| **Leaderboard** | Rank, pts, wins, avg, games; scoring note |
| **+ Add** | Mode toggle; paste bulk preview + checkboxes; single fallback player/date; manual guess grid + chips |
| **Share** | Canvas recap for **active date** + full season; Share button; Download fallback |
| **Backup** | Export JSON; import preview with overlap counts; confirm/cancel merge |
| **Header** | LEAGUE tiles; sync reloads from storage |

### Data compatibility (hard requirements)

- Same `STORAGE_KEY`: `wordle-league-entries-v1`
- Same entry `id` scheme
- Existing phone data must appear without re-import after deploy

## Hardening (merged issue list)

From both audits — implement in this plan unless marked deferred:

| # | Fix | Source notes |
|---|-----|----------------|
| 1 | **Non-silent validation** on manual/single save (status/error, not empty `return`) | Both |
| 2 | **Confirm before delete** | Both |
| 3 | **Import size/count caps** + clear error | Audit 2 |
| 4 | **Replace confirmation UX** unified (prefer in-UI over `window.confirm` for single paste) | Both |
| 5 | **Player rename/casing policy** per decision | Audit 2 (`app.js:173`) |
| 6 | **Date format setting** if plan 02 chose toggle — small control on Add or Backup | Both |
| 7 | **a11y:** allow pinch zoom (drop `user-scalable=no` or relax); tab roles/`aria-selected`; label icon buttons; status as live region | Both |
| 8 | **PWA manifest:** `start_url`/`scope` `./`; maskable icon purpose if assets allow | Both |
| 9 | **Share canvas:** derive layout from data; avoid brittle hand-estimated height drift where easy | Audit 2 |
| 10 | Keep **download fallback** first-class (iOS Web Share file support varies) | Audit 2 direction |
| 11 | Prefer **DOM builders / textContent** over string `innerHTML` where practical; if `innerHTML` remains, still escape player names | Both (footgun) |

### Explicitly deferred (direction only)

- Multi-device / cloud sync  
- Season reset / archive  
- Guess-grid emoji reconstruction on share cards  
- Full offline service worker (unless decision `vite_plugin_pwa`)

## UI architecture

Per plan 01 decision (default **vanilla TS**):

```
src/
  ui/
    tabs.ts
    daily.ts
    season.ts
    add.ts
    shareCanvas.ts
    backup.ts
    status.ts
    chips.ts
  main.ts          # wire events once
  styles/app.css   # preserve visual design; polish only as needed
```

Do **not** redesign the visual language — dark Wordle-like palette stays.

## What does NOT change

- Scoring rules  
- WhatsApp parser semantics beyond plan 02  
- Hosting model (already Actions Pages from plan 01)

## Risks & escape hatches

- **Share sheet fails on some browsers** → download path must still work; treat share cancel as non-error (current behavior)
- **Canvas regression** → side-by-side screenshot checklist vs old app before deleting `app.js`
- **If domain APIs from plan 02 are incomplete** → STOP and extend plan 02 rather than re-implement scoring in UI files

## Parity acceptance (manual, phone)

1. Import a known backup JSON → leaderboard matches old app  
2. Paste a multi-message WhatsApp chunk → bulk import correct  
3. Manual entry + replace flow  
4. Delete with confirm  
5. Share/download image opens/saves  
6. Kill browser and reopen → data still present  
7. `base` path: installed PWA / home screen icon still opens league

## Dependencies

- **Blocked by:** 01, 02  
- **Blocks:** nothing in this pack  

## Maintenance

- New UI features call domain modules only  
- Canvas colors stay in one constants module shared with CSS variables if possible  
