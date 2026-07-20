import type { Entry } from "../domain/types";
import { coerceEntry } from "./schema";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_IMPORT_ENTRIES = 10_000;

export type BackupPayload = {
  schema: 1;
  exportedAt: string;
  entries: Entry[];
};

export type ParseBackupResult =
  | { ok: true; valid: Entry[]; skipped: number }
  | { ok: false; error: string };

export function buildBackup(entries: Entry[]): BackupPayload {
  return {
    schema: 1,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

export function parseBackupFile(text: string, byteLength?: number): ParseBackupResult {
  if (byteLength !== undefined && byteLength > MAX_IMPORT_BYTES) {
    return { ok: false, error: "Backup file is too large (max 2 MB)." };
  }
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "Backup file is too large (max 2 MB)." };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  const list: unknown[] | null = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { entries?: unknown }).entries)
      ? ((data as { entries: unknown[] }).entries)
      : null;

  if (!list) {
    return { ok: false, error: "Couldn't find a list of results in that file." };
  }

  if (list.length > MAX_IMPORT_ENTRIES) {
    return {
      ok: false,
      error: `Too many rows (max ${MAX_IMPORT_ENTRIES.toLocaleString()}).`,
    };
  }

  const valid: Entry[] = [];
  let skipped = 0;
  for (const row of list) {
    const e = coerceEntry(row);
    if (e) valid.push(e);
    else skipped += 1;
  }

  if (valid.length === 0) {
    return {
      ok: false,
      error:
        skipped > 0
          ? `Found ${skipped} row(s) but none were valid backup entries.`
          : "Couldn't find a list of results in that file.",
    };
  }

  return { ok: true, valid, skipped };
}
