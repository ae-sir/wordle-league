# Wordle League

A minimal, single-user Wordle leaderboard tracker. Static site, no build step, no backend —
data lives in your phone browser's localStorage, same pattern as the hypertrophy tracker.

## Deploy (same as your gym tracker)

1. Create a new GitHub repo (or add these files to an existing one).
2. Commit all files in this folder to the repo's default branch.
3. Repo Settings → Pages → Deploy from branch → select your branch and `/` (root).
4. Wait a minute for it to publish, then open the given `https://<you>.github.io/<repo>/` URL
   on your Android phone in Chrome.
5. Chrome menu → **Add to Home screen** → confirm. It'll launch full-screen with its own icon,
   no browser chrome, same as any installed app.

## How it works

- **Today** — pick a date, see that day's results and the winner(s).
- **Leaderboard** — season standings: points, wins, average guesses, games played.
- **+ Add** — two modes:
  - *Paste chat text* — paste one person's Wordle share message, or a whole chunk of copied
    WhatsApp messages. If it detects multiple WhatsApp message headers it auto-extracts player
    + date + result for each; if it's just a single share text with no chat metadata, it asks
    you to fill in the player and date.
  - *Manual entry* — type the player, tap a guess count (1–6 or X), pick a date, save.
- **Share** — builds a single image (today's results + full season table) and opens Android's
  native share sheet with WhatsApp as one of the targets. If your browser doesn't support
  sharing files, it downloads the image instead so you can attach it yourself.
- **Backup** — export everything to a JSON file, or import one back in. Import merges into
  what's already there; a player+date match gets overwritten by the imported version rather
  than duplicated.

## Data

Everything is stored in this browser's localStorage under the key `wordle-league-entries-v1`.
That means it's tied to this device and this browser — clearing site data/cache, or opening the
app in a different browser, starts you from empty. Use the Backup tab to export a JSON file
occasionally and keep it somewhere safe (email it to yourself, save it to Drive); there's no
automatic or cloud backup, so this only protects you if you actually remember to do it.

## Notes on the chat-text parser

- Player names come from how the sender is saved in *your* phone's contacts — keep that in mind
  if you ever add results from someone else's copied chat.
- WhatsApp message dates are parsed as DD/MM/YYYY (Australian phone default). If you ever copy
  a chat exported from a phone set to a different date format, dates could misparse — check the
  bulk preview before importing.
