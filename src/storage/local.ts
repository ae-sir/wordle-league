import type { Entry } from "../domain/types";
import { coerceEntry } from "./schema";

/** Must stay stable so existing phone data survives the revamp. */
export const STORAGE_KEY = "wordle-league-entries-v1";
export const DATE_LOCALE_KEY = "wordle-league-date-locale-v1";

export type LoadResult = {
  entries: Entry[];
  dropped: number;
};

export function loadEntries(storage: Storage = localStorage): LoadResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], dropped: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { entries: [], dropped: 0 };
    }
    const entries: Entry[] = [];
    let dropped = 0;
    for (const row of parsed) {
      const e = coerceEntry(row);
      if (e) entries.push(e);
      else dropped += 1;
    }
    return { entries, dropped };
  } catch {
    return { entries: [], dropped: 0 };
  }
}

export function saveEntries(entries: Entry[], storage: Storage = localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function loadDateLocale(storage: Storage = localStorage): "ddmm" | "mmdd" {
  try {
    const v = storage.getItem(DATE_LOCALE_KEY);
    return v === "mmdd" ? "mmdd" : "ddmm";
  } catch {
    return "ddmm";
  }
}

export function saveDateLocale(locale: "ddmm" | "mmdd", storage: Storage = localStorage): void {
  try {
    storage.setItem(DATE_LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
}
