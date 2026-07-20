import { isGuesses } from "../domain/points";
import type { Guesses } from "../domain/types";

export function parseShareResult(text: string): Guesses | null {
  const m = text.match(/Wordle\s+#?[\d,.]+\s+([1-6X])\/6/i);
  if (!m?.[1]) return null;
  const g = m[1].toUpperCase();
  return isGuesses(g) ? g : null;
}
