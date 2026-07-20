import type { DateLocale, Guesses } from "../domain/types";
import { parseHeaderDate } from "./dates";
import { parseShareResult } from "./share";

export type ChatWordleResult = {
  player: string;
  date: string;
  guesses: Guesses;
};

/**
 * Parses copied WhatsApp messages (iOS or Android export / in-app copy).
 *
 * Handles:
 * - Full year: [19/07/2026, 8:02 am] Name: …
 * - No year (phone UI): [20/7, 10:13 am] Name: …
 * - Unicode spaces before am/pm (U+202F narrow no-break space, etc.)
 * - Emoji in display names
 * - Dash-style headers without brackets
 */
export function parseChatDump(raw: string, locale: DateLocale = "ddmm"): ChatWordleResult[] {
  // Normalize exotic spaces so time + am/pm matching is reliable
  const normalized = raw.replace(/[\u00A0\u202F\u2007\u2009\u200A\u2008]/g, " ");

  // Date: D/M or D/M/YY(YY). Time optional seconds. am/pm optional.
  // Capture groups: 1=dateRaw, 2=sender, 3=rest of line (may include Wordle…)
  const headerRe =
    /^\[?(\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?),?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[ap]\.?\s*m\.?)?\]?\s*(?:-\s*)?([^:]+?):\s?(.*)$/i;

  const lines = normalized.split(/\r?\n/);
  const messages: { dateRaw: string; sender: string; body: string }[] = [];
  let current: { dateRaw: string; sender: string; body: string } | null = null;

  for (const line of lines) {
    const m = line.match(headerRe);
    if (m && m[1] && m[2] !== undefined) {
      if (current) messages.push(current);
      current = {
        dateRaw: m[1],
        sender: m[2].trim(),
        body: m[3] ?? "",
      };
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
