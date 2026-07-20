import type { DateLocale } from "../domain/types";

/** Parse WhatsApp header date. Default AU DD/MM; optional MM/DD via locale. */
export function parseHeaderDate(raw: string, locale: DateLocale = "ddmm"): string | null {
  const parts = raw.split(/[/.\-]/).map((p) => p.trim());
  if (parts.length !== 3) return null;

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

  // Basic month-length check (non-leap Feb 29 accepted loosely)
  const maxDay = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mNum] ?? 31;
  if (dNum > maxDay) return null;

  return `${y}-${String(mNum).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
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
