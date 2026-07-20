import { describe, expect, it } from "vitest";
import { pointsFor } from "../src/domain/points";
import { getDailyWinners, getSeason } from "../src/domain/season";
import type { Entry } from "../src/domain/types";

function e(
  player: string,
  date: string,
  guesses: Entry["guesses"],
): Entry {
  return {
    id: `${date}-${player.toLowerCase()}`,
    player,
    date,
    guesses,
    addedAt: 1,
  };
}

describe("pointsFor", () => {
  it("maps 1–6 and X", () => {
    expect(pointsFor("1")).toBe(6);
    expect(pointsFor("6")).toBe(1);
    expect(pointsFor("X")).toBe(0);
  });
});

describe("getSeason", () => {
  it("sums points and ranks by points then avg", () => {
    const entries = [
      e("Alice", "2026-07-01", "3"),
      e("Bob", "2026-07-01", "4"),
      e("Alice", "2026-07-02", "2"),
      e("Bob", "2026-07-02", "X"),
    ];
    const season = getSeason(entries);
    expect(season[0]?.player).toBe("Alice");
    expect(season[0]?.points).toBe(4 + 5); // 3/6=4, 2/6=5
    expect(season[1]?.player).toBe("Bob");
    expect(season[1]?.points).toBe(3 + 0);
    expect(season[0]?.wins).toBe(2);
    expect(season[1]?.wins).toBe(0);
  });
});

describe("getDailyWinners", () => {
  it("shares win on tie", () => {
    const daily = [e("A", "2026-07-01", "3"), e("B", "2026-07-01", "3"), e("C", "2026-07-01", "4")];
    const winners = getDailyWinners(daily);
    expect(winners.has("A")).toBe(true);
    expect(winners.has("B")).toBe(true);
    expect(winners.has("C")).toBe(false);
  });
});
