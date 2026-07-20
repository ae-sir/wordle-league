import { describe, expect, it } from "vitest";
import { buildBackup, parseBackupFile } from "../src/storage/backup";
import { coerceEntry } from "../src/storage/schema";
import { mergeEntries } from "../src/domain/upsert";
import type { Entry } from "../src/domain/types";

const sample: Entry = {
  id: "2026-07-01-alice",
  player: "Alice",
  date: "2026-07-01",
  guesses: "3",
  addedAt: 1,
};

describe("coerceEntry", () => {
  it("accepts valid rows and rejects bad guesses", () => {
    expect(coerceEntry(sample)?.guesses).toBe("3");
    expect(coerceEntry({ ...sample, guesses: "9" })).toBeNull();
    expect(coerceEntry({ player: 1, date: "2026-01-01", guesses: "3" })).toBeNull();
  });
});

describe("parseBackupFile", () => {
  it("accepts schema envelope and bare array", () => {
    const envelope = parseBackupFile(JSON.stringify(buildBackup([sample])));
    expect(envelope.ok).toBe(true);
    if (envelope.ok) expect(envelope.valid).toHaveLength(1);

    const bare = parseBackupFile(JSON.stringify([sample]));
    expect(bare.ok).toBe(true);
  });

  it("rejects non-array objects", () => {
    const r = parseBackupFile(JSON.stringify({ foo: 1 }));
    expect(r.ok).toBe(false);
  });

  it("skips invalid rows", () => {
    const r = parseBackupFile(JSON.stringify([sample, { player: "X" }]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valid).toHaveLength(1);
      expect(r.skipped).toBe(1);
    }
  });
});

describe("mergeEntries", () => {
  it("overwrites same id", () => {
    const updated = { ...sample, guesses: "1" as const, addedAt: 2 };
    const merged = mergeEntries([sample], [updated]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.guesses).toBe("1");
  });
});
