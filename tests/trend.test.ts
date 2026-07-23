import { describe, expect, it } from "vitest";
import { getTrend } from "../src/domain/trend";
import type { Entry } from "../src/domain/types";

function e(player: string, date: string, guesses: Entry["guesses"]): Entry {
  return {
    id: `${date}-${player.toLowerCase()}`,
    player,
    date,
    guesses,
    addedAt: 1,
  };
}

describe("getTrend", () => {
  it("tracks rank and cumulative points across days", () => {
    const entries = [
      e("Alice", "2026-07-01", "3"), // 4 pts
      e("Bob", "2026-07-01", "4"), // 3 pts
      e("Alice", "2026-07-02", "5"), // 2 pts -> cum 6
      e("Bob", "2026-07-02", "2"), // 5 pts -> cum 8
    ];
    const trend = getTrend(entries);
    const alice = trend.find((t) => t.player === "Alice");
    const bob = trend.find((t) => t.player === "Bob");
    expect(alice?.points).toHaveLength(2);
    expect(bob?.points).toHaveLength(2);

    // Day 1: Alice leads (4 vs 3)
    expect(alice?.points[0]?.rank).toBe(1);
    expect(bob?.points[0]?.rank).toBe(2);
    expect(alice?.points[0]?.cumPoints).toBe(4);

    // Day 2: Bob overtakes (cum 8 vs 6)
    expect(bob?.points[1]?.rank).toBe(1);
    expect(alice?.points[1]?.rank).toBe(2);
    expect(bob?.points[1]?.cumPoints).toBe(8);
    expect(alice?.points[1]?.cumPoints).toBe(6);
  });

  it("gives a late joiner a null dayPoints entry only from their first game onward", () => {
    const entries = [
      e("Alice", "2026-07-01", "3"),
      e("Alice", "2026-07-02", "3"),
      e("Bob", "2026-07-02", "2"),
    ];
    const trend = getTrend(entries);
    const alice = trend.find((t) => t.player === "Alice");
    const bob = trend.find((t) => t.player === "Bob");
    expect(alice?.points).toHaveLength(2);
    expect(bob?.points).toHaveLength(1);
    expect(bob?.points[0]?.date).toBe("2026-07-02");
  });

  it("marks a day a player didn't play with null dayPoints but still tracks rank", () => {
    const entries = [
      e("Alice", "2026-07-01", "3"),
      e("Bob", "2026-07-01", "3"),
      e("Alice", "2026-07-02", "1"),
    ];
    const trend = getTrend(entries);
    const bob = trend.find((t) => t.player === "Bob");
    expect(bob?.points).toHaveLength(2);
    expect(bob?.points[1]?.dayPoints).toBeNull();
    expect(bob?.points[1]?.date).toBe("2026-07-02");
  });
});
