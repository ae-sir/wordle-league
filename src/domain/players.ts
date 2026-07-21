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
      const e = options[0];
      resolved.push({ ...e, player: targetName, id: entryId(date, targetName) });
    }
  }

  return { untouched, resolved, conflicts };
}

export function finalizePlayerMerge(
  plan: PlayerMergePlan,
  targetName: string,
  chosen: Record<string, Entry>,
): Entry[] {
  const fromConflicts = plan.conflicts.map((c) => {
    const pick = chosen[c.date] ?? c.options[0];
    return { ...pick, player: targetName, id: entryId(c.date, targetName) };
  });
  return [...plan.untouched, ...plan.resolved, ...fromConflicts];
}
