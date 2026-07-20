import type { DateLocale, Guesses } from "../domain/types";
import { parseHeaderDate } from "./dates";
import { parseShareResult } from "./share";

export type ChatWordleResult = {
  player: string;
  date: string;
  guesses: Guesses;
};

/** Parses copied WhatsApp messages (iOS or Android export format). */
export function parseChatDump(raw: string, locale: DateLocale = "ddmm"): ChatWordleResult[] {
  const headerRe =
    /^\[?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?([^:]+?):\s?(.*)$/i;
  const lines = raw.split(/\r?\n/);
  const messages: { dateRaw: string; sender: string; body: string }[] = [];
  let current: { dateRaw: string; sender: string; body: string } | null = null;

  for (const line of lines) {
    const m = line.match(headerRe);
    if (m && m[1] && m[2] !== undefined) {
      if (current) messages.push(current);
      current = { dateRaw: m[1], sender: m[2].trim(), body: m[3] ?? "" };
    } else if (current) {
      current.body += "\n" + line;
    }
  }
  if (current) messages.push(current);

  const results: ChatWordleResult[] = [];
  for (const msg of messages) {
    if (!/Wordle/i.test(msg.body)) continue;
    const guesses = parseShareResult(msg.body);
    const date = parseHeaderDate(msg.dateRaw, locale);
    if (guesses && date) {
      results.push({ player: msg.sender, date, guesses });
    }
  }
  return results;
}
