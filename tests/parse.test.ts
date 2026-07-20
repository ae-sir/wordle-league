import { describe, expect, it } from "vitest";
import { parseHeaderDate } from "../src/parse/dates";
import { parseShareResult } from "../src/parse/share";
import { parseChatDump } from "../src/parse/chat";
import { analyzePaste } from "../src/parse/paste";

describe("parseShareResult", () => {
  it("parses common share lines", () => {
    expect(parseShareResult("Wordle 1,489 3/6")).toBe("3");
    expect(parseShareResult("Wordle #1489 4/6")).toBe("4");
    expect(parseShareResult("Wordle 1489 3/6*")).toBe("3");
    expect(parseShareResult("Wordle 1,489 X/6")).toBe("X");
  });
});

describe("parseHeaderDate", () => {
  it("defaults to DD/MM (AU)", () => {
    expect(parseHeaderDate("19/07/2026", "ddmm")).toBe("2026-07-19");
    expect(parseHeaderDate("05/06/2026", "ddmm")).toBe("2026-06-05");
  });

  it("supports MM/DD (US)", () => {
    expect(parseHeaderDate("07/19/2026", "mmdd")).toBe("2026-07-19");
    expect(parseHeaderDate("05/06/2026", "mmdd")).toBe("2026-05-06");
  });

  it("accepts day/month without year (phone copy)", () => {
    const y = new Date().getFullYear();
    // 20/7 is unambiguously day 20 month 7 under ddmm
    expect(parseHeaderDate("20/7", "ddmm")).toBe(`${y}-07-20`);
    expect(parseHeaderDate("20/07", "ddmm")).toBe(`${y}-07-20`);
  });

  it("rejects impossible months under DD/MM when first is day>12 and second invalid", () => {
    expect(parseHeaderDate("07/19/2026", "ddmm")).toBeNull();
  });
});

describe("parseChatDump", () => {
  it("parses bracket WhatsApp headers", () => {
    const raw = `[19/07/2026, 8:02 am] Sarah: Wordle 1,489 4/6
⬛⬛🟨⬛⬛
🟩🟩🟩🟩🟩`;
    const rows = parseChatDump(raw, "ddmm");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ player: "Sarah", date: "2026-07-19", guesses: "4" });
  });

  it("parses dash WhatsApp headers", () => {
    const raw = `19/07/2026, 8:02 am - Sarah: Wordle 1,489 3/6`;
    const rows = parseChatDump(raw, "ddmm");
    expect(rows[0]?.guesses).toBe("3");
  });

  it("parses multi-player iOS-style paste without years (owner sample)", () => {
    // Includes narrow no-break space before am/pm (common on iOS copy)
    const nbsp = "\u202F";
    const raw = `[20/7, 10:13${nbsp}am] Andrew: Wordle 1,857 4/6

⬛⬛⬛⬛🟨
⬛🟩🟨🟩⬛
⬛🟩🟨🟩🟩
🟩🟩🟩🟩🟩
[20/7, 1:51${nbsp}pm] Tati 🪿: Wordle 1,857 5/6

⬜⬜⬜⬜⬜
⬜⬜⬜⬜⬜
⬜🟨⬜🟩🟨
⬜🟩🟨🟩🟩
🟩🟩🟩🟩🟩
[20/7, 3:28${nbsp}pm] Angelina Khoury: Wordle 1,857 5/6

⬜⬜⬜⬜⬜
⬜⬜🟨🟨⬜
🟨🟩⬜🟩🟨
⬜🟩🟨🟩🟩
🟩🟩🟩🟩🟩
[20/7, 3:30${nbsp}pm] Annalise Khoury: Wordle 1,857 5/6

🟩🟨⬜⬜⬜
🟩⬜🟨⬜⬜
🟩⬜⬜🟩🟩
🟩🟩⬜🟩🟩
🟩🟩🟩🟩🟩
[20/7, 3:35${nbsp}pm] Annabella Khoury: Wordle 1,857 4/6

⬜⬜🟨🟨🟨
⬜🟩🟩🟩🟩
⬜🟩🟩🟩🟩
🟩🟩🟩🟩🟩`;

    const rows = parseChatDump(raw, "ddmm");
    expect(rows).toHaveLength(5);
    const y = new Date().getFullYear();
    expect(rows.map((r) => r.player)).toEqual([
      "Andrew",
      "Tati 🪿",
      "Angelina Khoury",
      "Annalise Khoury",
      "Annabella Khoury",
    ]);
    expect(rows.map((r) => r.guesses)).toEqual(["4", "5", "5", "5", "4"]);
    expect(rows.every((r) => r.date === `${y}-07-20`)).toBe(true);
  });
});

describe("analyzePaste", () => {
  it("returns single for bare share", () => {
    const r = analyzePaste("Wordle 1,489 2/6", [], "ddmm");
    expect(r.kind).toBe("single");
    if (r.kind === "single") expect(r.guesses).toBe("2");
  });

  it("returns bulk for chat dump", () => {
    const raw = `[19/07/2026, 8:02 am] Sarah: Wordle 1,489 4/6
[19/07/2026, 8:05 am] Tom: Wordle 1,489 3/6`;
    const r = analyzePaste(raw, [], "ddmm");
    expect(r.kind).toBe("bulk");
    if (r.kind === "bulk") expect(r.rows).toHaveLength(2);
  });
});
