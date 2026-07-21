import type { Entry } from "./types";
import { entryId } from "./upsert";

export type PlayerMergeConflict = {
  date: string;
  options: Entry[];
};

export type PlayerMergePlan = {
  untouched: Entry[];
  resolved: Entry[];
  conflicts: PlayerMergeConflict[];
};

export function planPlayerMerge(
  entries: Entry[],
  sourceNames: string[],
  targetName: string,
): PlayerMergePlan {
  const affectedNames = new Set(sourceNames);
  affectedNames.add(targetName);
  const affected = entries.filter((e) => affectedNames.has(e.player));
  const untouched = entries.filter((e) => !affectedNames.has(e.player));

  const byDate = new Map<string, Entry[]>();
  for (const e of affected) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const resolved: Entry[] = [];
  const conflicts: PlayerMergeConflict[] = [];
  for (const [date, options] of byDate) {
    if (options.length > 1) {
      conflicts.push({ date, options });
    } else {
      // options.length === 1 here, so the index is safe.
      const e = options[0]!;
      resolved.push({ ...e, player: targetName, id: entryId(date, targetName) });
    }
  }

  return { untouched, resolved, conflicts };
}

export type NameMatchSuggestion = {
  incoming: string;
  existing: string;
};

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

/**
 * Flags incoming player names whose first name matches an already-known
 * player's first name (case/whitespace-insensitive) but the full name isn't
 * an exact match — e.g. "bob" arriving when "Bob" is already on the
 * leaderboard, or "John Smith" arriving when "John" already is.
 */
export function findFirstNameMatches(
  existingPlayers: string[],
  incomingPlayers: string[],
): NameMatchSuggestion[] {
  const existingByFirst = new Map<string, string>();
  for (const p of existingPlayers) {
    const key = firstNameOf(p);
    if (key && !existingByFirst.has(key)) existingByFirst.set(key, p);
  }

  const existingSet = new Set(existingPlayers);
  const suggestions: NameMatchSuggestion[] = [];
  const seen = new Set<string>();
  for (const incoming of incomingPlayers) {
    if (existingSet.has(incoming) || seen.has(incoming)) continue;
    const key = firstNameOf(incoming);
    const existing = key ? existingByFirst.get(key) : undefined;
    if (existing && existing !== incoming) {
      suggestions.push({ incoming, existing });
      seen.add(incoming);
    }
  }
  return suggestions;
}

export function finalizePlayerMerge(
  plan: PlayerMergePlan,
  targetName: string,
  chosen: Record<string, Entry>,
): Entry[] {
  const fromConflicts = plan.conflicts.map((c) => {
    // c.options always has >= 2 entries (see planPlayerMerge), so this fallback is safe.
    const pick = chosen[c.date] ?? c.options[0]!;
    return { ...pick, player: targetName, id: entryId(c.date, targetName) };
  });
  return [...plan.untouched, ...plan.resolved, ...fromConflicts];
}
