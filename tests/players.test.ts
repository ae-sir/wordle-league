import { describe, expect, it } from "vitest";
import { finalizePlayerMerge, planPlayerMerge } from "../src/domain/players";
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

describe("planPlayerMerge", () => {
  it("renames a single player with no conflicts", () => {
    const entries = [e("Bobb", "2026-07-01", "3"), e("Alice", "2026-07-01", "2")];
    const plan = planPlayerMerge(entries, ["Bobb"], "Bob");
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.resolved).toHaveLength(1);
    expect(plan.resolved[0]?.player).toBe("Bob");
    expect(plan.resolved[0]?.id).toBe("2026-07-01-bob");
    expect(plan.untouched).toHaveLength(1);

    const next = finalizePlayerMerge(plan, "Bob", {});
    expect(next.map((x) => x.player).sort()).toEqual(["Alice", "Bob"]);
  });

  it("merges multiple names with no overlapping dates", () => {
    const entries = [
      e("Bobb", "2026-07-01", "3"),
      e("Bobby", "2026-07-02", "4"),
      e("Alice", "2026-07-01", "2"),
    ];
    const plan = planPlayerMerge(entries, ["Bobb", "Bobby"], "Bob");
    expect(plan.conflicts).toHaveLength(0);
    const next = finalizePlayerMerge(plan, "Bob", {});
    const bobEntries = next.filter((x) => x.player === "Bob");
    expect(bobEntries).toHaveLength(2);
    expect(next).toHaveLength(3);
  });

  it("flags a conflict when merged names share a date", () => {
    const entries = [
      e("Bobb", "2026-07-01", "3"),
      e("Bobby", "2026-07-01", "5"),
      e("Alice", "2026-07-01", "2"),
    ];
    const plan = planPlayerMerge(entries, ["Bobb", "Bobby"], "Bob");
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]?.date).toBe("2026-07-01");
    expect(plan.conflicts[0]?.options).toHaveLength(2);

    const chosen = plan.conflicts[0]?.options[1];
    const next = finalizePlayerMerge(plan, "Bob", chosen ? { "2026-07-01": chosen } : {});
    const bobEntries = next.filter((x) => x.player === "Bob");
    expect(bobEntries).toHaveLength(1);
    expect(bobEntries[0]?.guesses).toBe("5");
    expect(next).toHaveLength(2);
  });
});
