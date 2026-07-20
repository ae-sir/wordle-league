import { z } from "zod";
import type { Entry, Guesses } from "../domain/types";
import { entryId } from "../domain/upsert";

export const guessesSchema = z.enum(["1", "2", "3", "4", "5", "6", "X"]);

export const entrySchema = z.object({
  id: z.string().min(1),
  player: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guesses: guessesSchema,
  addedAt: z.number().finite().optional(),
});

export function coerceEntry(raw: unknown): Entry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const player = typeof o.player === "string" ? o.player.trim() : "";
  const date = typeof o.date === "string" ? o.date : "";
  const guessesRaw =
    typeof o.guesses === "string"
      ? o.guesses.toUpperCase()
      : typeof o.guesses === "number"
        ? String(o.guesses)
        : "";
  const guessesResult = guessesSchema.safeParse(guessesRaw);
  if (!player || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !guessesResult.success) {
    return null;
  }
  const guesses = guessesResult.data as Guesses;
  const addedAt =
    typeof o.addedAt === "number" && Number.isFinite(o.addedAt) ? o.addedAt : Date.now();
  const id =
    typeof o.id === "string" && o.id.length > 0 ? o.id : entryId(date, player);
  return { id, player, date, guesses, addedAt };
}
