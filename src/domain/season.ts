import { guessVal, pointsFor } from "./points";
import type { Entry, SeasonRow } from "./types";

export function getDates(entries: Entry[]): string[] {
  return [...new Set(entries.map((e) => e.date))].sort((a, b) => (a < b ? 1 : -1));
}

export function getPlayers(entries: Entry[]): string[] {
  return [...new Set(entries.map((e) => e.player))].sort();
}

export function getDailyEntries(entries: Entry[], date: string): Entry[] {
  return entries
    .filter((e) => e.date === date)
    .sort((a, b) => guessVal(a.guesses) - guessVal(b.guesses));
}

export function getDailyWinners(dailyEntries: Entry[]): Set<string> {
  const solved = dailyEntries.filter((e) => e.guesses !== "X");
  if (solved.length === 0) return new Set();
  const first = solved[0];
  if (!first) return new Set();
  const best = guessVal(first.guesses);
  return new Set(solved.filter((e) => guessVal(e.guesses) === best).map((e) => e.player));
}

export function getSeason(entries: Entry[]): SeasonRow[] {
  const byDate: Record<string, Entry[]> = {};
  for (const e of entries) {
    (byDate[e.date] ??= []).push(e);
  }

  const winsByPlayer: Record<string, number> = {};
  for (const list of Object.values(byDate)) {
    const solved = list.filter((e) => e.guesses !== "X");
    if (!solved.length) continue;
    const best = Math.min(...solved.map((e) => guessVal(e.guesses)));
    for (const e of solved.filter((x) => guessVal(x.guesses) === best)) {
      winsByPlayer[e.player] = (winsByPlayer[e.player] ?? 0) + 1;
    }
  }

  const map: Record<
    string,
    { player: string; points: number; games: number; solved: number; totalGuesses: number }
  > = {};

  for (const e of entries) {
    const m = (map[e.player] ??= {
      player: e.player,
      points: 0,
      games: 0,
      solved: 0,
      totalGuesses: 0,
    });
    m.points += pointsFor(e.guesses);
    m.games += 1;
    if (e.guesses !== "X") {
      m.solved += 1;
      m.totalGuesses += parseInt(e.guesses, 10);
    }
  }

  return Object.values(map)
    .map((m) => ({
      ...m,
      wins: winsByPlayer[m.player] ?? 0,
      avg: m.solved ? (m.totalGuesses / m.solved).toFixed(2) : "—",
    }))
    .sort(
      (a, b) =>
        b.points - a.points || (parseFloat(a.avg) || 99) - (parseFloat(b.avg) || 99),
    );
}
