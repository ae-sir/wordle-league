# Old vs new — comparison plan

**Goal:** confirm the Vite+TS revamp operates and looks like the pre-revamp app before any merge or GitHub Pages cutover.

**Constraint:** nothing is deployed. Run only on this machine (LAN optional).

## Run both side by side

```bash
npm run compare
# or separately:
npm run legacy    # → http://127.0.0.1:8780  (legacy/)
npm run dev:host  # → http://127.0.0.1:5173  (new)
```

LAN (same Wi‑Fi): use this computer’s LAN IP, e.g. `http://192.168.x.x:5173` and `:8780`.

| | Origin | Code |
|--|--------|------|
| **OLD** | `:8780` | `legacy/app.js` + static HTML/CSS |
| **NEW** | `:5173` | Vite `src/` TypeScript |

**localStorage note:** different ports = different origins = **separate storage**. That is intentional so the apps do not clobber each other. For data parity, use the same backup JSON import in both (see below).

Same `STORAGE_KEY` (`wordle-league-entries-v1`) means: if you later serve both from the **same** origin path, data is shared. Dual ports keep them isolated during compare.

## Seed data (identical league in both)

1. In **NEW**, add a few manual scores OR paste a WhatsApp dump → Export backup JSON.  
2. In **OLD**, Backup → Import that JSON.  
3. Or reverse: export from OLD, import into NEW.

Fixture idea (manual):

| Player | Date | Guesses |
|--------|------|---------|
| Alice | today | 3 |
| Bob | today | 4 |
| Alice | yesterday | 2 |
| Bob | yesterday | X |

## Operational checklist

Do each step in **OLD** and **NEW**; expect the same outcomes.

| # | Action | Expect |
|---|--------|--------|
| 1 | Empty state Today / Leaderboard | Same empty copy + “Add score” |
| 2 | Manual save 3/6 for Alice today | Appears on Today; pts = 4 |
| 3 | Manual save empty fields | OLD: silent; **NEW: status error** (intentional hardening) |
| 4 | Second save same player+date | Replace confirm |
| 5 | Paste bare `Wordle 1,489 3/6` | Single fallback: player + date |
| 6 | Paste WhatsApp dump (AU DD/MM) | Bulk preview; correct dates |
| 7 | Toggle date format MM/DD (NEW only) | US-style headers parse correctly |
| 8 | Leaderboard order | Points desc; tie-break avg |
| 9 | Daily winner badge | Lowest solved guesses; ties both WINNER |
| 10 | Delete entry | OLD: immediate; **NEW: confirm** (intentional) |
| 11 | Share canvas / download | Image shows day + season |
| 12 | Export / import merge | Overwrite same player+date id |
| 13 | Sync ↻ | Reloads from storage |
| 14 | Hard mode share `3/6*` | Parses as 3 |
| 15 | Corrupt storage (devtools) | NEW drops bad rows + toast; no crash |

## Visual checklist

Open both on phone or narrow desktop (~390px).

| Surface | Compare |
|---------|---------|
| Header LEAGUE green tiles | Same size/color |
| Tab bar active green | Same |
| Result cards / winner border | Same green highlight |
| Season #1 row | Green border + pts color |
| Guess badges 1–6 vs X | Green vs grey |
| Add mode toggle / chips / guess grid | Layout match |
| Share canvas palette | Dark bg, green tiles “RECAP” |
| Fonts / spacing | System font; max-width ~520px |

**Allowed differences (approved hardening):**

- Viewport allows pinch-zoom (NEW)  
- Status line errors for empty forms  
- Delete confirmation  
- Chat date format control on Add tab  
- Display-name update checkbox on replace when casing differs  
- Manifest `start_url`/`scope` `./`

## Automated parity (domain)

```bash
npm test
npm run typecheck
npm run build
```

These cover scoring, parsers, backup merge — the pure core shared by UI.

## Agent / human verification log

After dual-serve is up, record:

- [ ] OLD reachable on LAN :8780  
- [ ] NEW reachable on LAN :5173  
- [ ] Fixture import produces same leaderboard points/wins/avg  
- [ ] Share download opens on both  
- [ ] No console errors on happy path (NEW)  

**Do not** enable GitHub Pages Actions or push to `main` until explicit MR instruction.
