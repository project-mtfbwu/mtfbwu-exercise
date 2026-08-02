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

/** Local calendar date for an ISO instant in the given timezone. */
export function localDateFromInstant(isoInstant: string, timeZone: string): string {
  return formatLocalDate(new Date(isoInstant), timeZone);
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

/** HH:mm clock time for an ISO instant in the given IANA timezone. */
export function localTimeFromInstant(isoInstant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoInstant));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/**
 * Convert a local calendar date + HH:mm in an IANA timezone to a UTC ISO instant.
 * Handles DST transitions by iterating offset until the formatted local parts match.
 */
export function localDateTimeToUtcIso(
  localDate: string,
  hhmm: string,
  timeZone: string,
): string {
  const { year, month, day } = parseLocalDate(localDate);
  const [hour, minute] = hhmm.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error(`Invalid time: ${hhmm}`);
  }

  const targetMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  const readLocalMs = (utcMs: number): number => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const y = Number(parts.find((p) => p.type === "year")?.value);
    const m = Number(parts.find((p) => p.type === "month")?.value);
    const d = Number(parts.find((p) => p.type === "day")?.value);
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const min = Number(parts.find((p) => p.type === "minute")?.value);
    return Date.UTC(y, m - 1, d, h, min, 0, 0);
  };

  let utcMs = targetMs;
  for (let i = 0; i < 4; i++) {
    const actualLocalMs = readLocalMs(utcMs);
    const diff = targetMs - actualLocalMs;
    if (diff === 0) break;
    utcMs += diff;
  }
  return new Date(utcMs).toISOString();
}

/** Next calendar day after localDate (YYYY-MM-DD). */
export function nextLocalDate(localDate: string): string {
  return shiftLocalDate(localDate, 1);
}
