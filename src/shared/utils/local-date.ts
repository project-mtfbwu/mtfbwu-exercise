/**
 * Timezone-safe local calendar date helpers.
 * Always use these for daily_records.local_date — never Date#toISOString().slice(0,10)
 * alone (that is UTC and can shift the day).
 */

export function formatLocalDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Unable to format local date for timezone ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

export function todayLocalDate(timeZone: string, now = new Date()): string {
  return formatLocalDate(now, timeZone);
}

/** Parse YYYY-MM-DD as a plain calendar date (no timezone conversion). */
export function parseLocalDate(localDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) throw new Error(`Invalid local date: ${localDate}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function shiftLocalDate(localDate: string, deltaDays: number): string {
  const { year, month, day } = parseLocalDate(localDate);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function compareLocalDates(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isFutureLocalDate(
  localDate: string,
  timeZone: string,
  now = new Date(),
): boolean {
  return compareLocalDates(localDate, todayLocalDate(timeZone, now)) > 0;
}

export function clampToLoggableLocalDate(
  localDate: string,
  timeZone: string,
  now = new Date(),
): string {
  const today = todayLocalDate(timeZone, now);
  return compareLocalDates(localDate, today) > 0 ? today : localDate;
}

export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
