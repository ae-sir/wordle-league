import type { Entry, Guesses, UpsertResult } from "./types";

export function entryId(date: string, player: string): string {
  return `${date}-${player.toLowerCase()}`;
}

export function upsertEntry(
  entries: Entry[],
  input: { player: string; date: string; guesses: Guesses },
  allowReplace: boolean,
  nameMode: "keep" | "update" = "keep",
): UpsertResult {
  const id = entryId(input.date, input.player);
  const existing = entries.find((e) => e.id === id);
  if (existing && !allowReplace) {
    return { needsConfirm: true, existing };
  }

  let playerName = input.player;
  if (existing) {
    playerName = nameMode === "update" ? input.player : existing.player;
  }

  const next: Entry = {
    id,
    player: playerName,
    date: input.date,
    guesses: input.guesses,
    addedAt: Date.now(),
  };

  const without = entries.filter((e) => e.id !== id);
  return { needsConfirm: false, entries: [...without, next] };
}

export function deleteEntry(entries: Entry[], id: string): Entry[] {
  return entries.filter((e) => e.id !== id);
}

export function mergeEntries(current: Entry[], incoming: Entry[]): Entry[] {
  let result = [...current];
  for (const e of incoming) {
    result = result.filter((existing) => existing.id !== e.id).concat([e]);
  }
  return result;
}
