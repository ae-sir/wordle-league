import { pointsFor } from "./points";
import { getDates, getSeason } from "./season";
import type { Entry } from "./types";

export type TrendPoint = {
  date: string;
  rank: number; // 1 = best, among everyone who has played on or before this date
  playerCount: number; // how many players are ranked on this date (for normalizing rank)
  dayPoints: number | null; // null = this player didn't play on this date
  cumPoints: number;
};

export type PlayerTrend = {
  player: string;
  points: TrendPoint[];
};

/**
 * One row per player per date, from that player's first game onward, tracking
 * their overall-standings rank and cumulative points as the season progresses
 * (not just the days they personally played).
 */
export function getTrend(entries: Entry[]): PlayerTrend[] {
  const dates = [...getDates(entries)].reverse(); // ascending chronological
  const dayPointsByDate = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const forDate = dayPointsByDate.get(e.date) ?? new Map<string, number>();
    forDate.set(e.player, pointsFor(e.guesses));
    dayPointsByDate.set(e.date, forDate);
  }

  const byPlayer = new Map<string, TrendPoint[]>();
  const seenPlayers = new Set<string>();
  let soFar: Entry[] = [];
  for (const date of dates) {
    soFar = soFar.concat(entries.filter((e) => e.date === date));
    const standings = getSeason(soFar);
    standings.forEach((row) => seenPlayers.add(row.player));
    standings.forEach((row, i) => {
      const list = byPlayer.get(row.player) ?? [];
      list.push({
        date,
        rank: i + 1,
        playerCount: standings.length,
        dayPoints: dayPointsByDate.get(date)?.get(row.player) ?? null,
        cumPoints: row.points,
      });
      byPlayer.set(row.player, list);
    });
  }

  return [...seenPlayers].sort().map((player) => ({
    player,
    points: byPlayer.get(player) ?? [],
  }));
}

/** Round a max value up to a clean axis ceiling (1/2/2.5/5/10 * 10^n). */
export function niceMax(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    if (n <= s * pow) return s * pow;
  }
  return 10 * pow;
}
