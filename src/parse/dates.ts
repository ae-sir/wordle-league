import type { DateLocale } from "../domain/types";

/**
 * Parse WhatsApp header date.
 * Accepts DD/MM/YYYY, DD/MM (year omitted — common on phone copies), MM/DD variants via locale.
 */
export function parseHeaderDate(raw: string, locale: DateLocale = "ddmm"): string | null {
  const parts = raw.split(/[/.\-]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2 && parts.length !== 3) return null;

  let first = parts[0] ?? "";
  let second = parts[1] ?? "";
  let y = parts[2] ?? "";

  if (y.length === 2) y = "20" + y;

  let d: string;
  let m: string;
  if (locale === "mmdd") {
    m = first;
    d = second;
  } else {
    d = first;
    m = second;
  }

  const dNum = parseInt(d, 10);
  const mNum = parseInt(m, 10);
  if (!dNum || !mNum || mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31) return null;

  const maxDay = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mNum] ?? 31;
  if (dNum > maxDay) return null;

  let yearNum: number;
  if (y) {
    yearNum = parseInt(y, 10);
    if (!yearNum || yearNum < 2000 || yearNum > 2100) return null;
  } else {
    // Phone copies often omit year: "[20/7, 10:13 am]"
    yearNum = inferYearForMonthDay(mNum, dNum);
  }

  return `${yearNum}-${String(mNum).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
}

/** Prefer current year; if that date is still >1 day in the future, use previous year. */
export function inferYearForMonthDay(month: number, day: number, now = new Date()): number {
  const year = now.getFullYear();
  const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setHours(23, 59, 59, 999);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (candidate.getTime() > tomorrow.getTime()) {
    return year - 1;
  }
  return year;
}

export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
