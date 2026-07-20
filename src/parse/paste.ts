import { entryId } from "../domain/upsert";
import type { BulkRow, DateLocale, Entry, PasteResult } from "../domain/types";
import { parseChatDump } from "./chat";
import { parseShareResult } from "./share";

export function analyzePaste(
  text: string,
  entries: Entry[],
  locale: DateLocale = "ddmm",
): PasteResult {
  if (!text.trim()) return { kind: "empty" };

  const chatResults = parseChatDump(text, locale);
  if (chatResults.length > 0) {
    const map = new Map<string, (typeof chatResults)[number]>();
    for (const r of chatResults) {
      map.set(entryId(r.date, r.player), r);
    }
    const rows: BulkRow[] = [...map.entries()].map(([id, r]) => {
      const existing = entries.find((e) => e.id === id);
      return {
        id,
        player: r.player,
        date: r.date,
        guesses: r.guesses,
        include: true,
        replaces: !!existing,
      };
    });
    return { kind: "bulk", rows };
  }

  const guesses = parseShareResult(text);
  if (guesses) {
    return { kind: "single", guesses };
  }

  return {
    kind: "error",
    message:
      'Couldn\'t find a Wordle result in that text. Paste a share message (e.g. "Wordle 1,489 3/6") or a chunk of copied WhatsApp chat.',
  };
}
