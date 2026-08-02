import { parseLocalDate, shiftLocalDate } from "@/shared/utils/local-date";

export type DayIndicator = {
  localDate: string;
  nutrition: number;
  workout: number;
  rehab: number;
  progress: number;
  hydration: number;
  meditation: number;
  sleep: number;
  supplements: number;
  custom: number;
  hasAny: boolean;
};

export type MonthIndicators = {
  year: number;
  month: number;
  days: DayIndicator[];
};

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const { year: y, month: m } = parseLocalDate(start);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function emptyDay(date: string): DayIndicator {
  return {
    localDate: date,
    nutrition: 0,
    workout: 0,
    rehab: 0,
    progress: 0,
    hydration: 0,
    meditation: 0,
    sleep: 0,
    supplements: 0,
    custom: 0,
    hasAny: false,
  };
}

export function bumpDayIndicator(
  dayMap: Map<string, DayIndicator>,
  date: string,
  field: keyof Omit<DayIndicator, "localDate" | "hasAny">,
): void {
  const day = dayMap.get(date);
  if (!day) return;
  day[field] += 1;
  day.hasAny = true;
}

/** Custom-only tracker events — matches loadDailyOverview filter. */
export function filterCustomTrackerEventRows<
  T extends { local_date: string; user_tracker_id: string },
>(events: T[], customTrackerIds: ReadonlySet<string>): T[] {
  return events.filter((row) => customTrackerIds.has(String(row.user_tracker_id)));
}

export function countCustomEventsByDate<
  T extends { local_date: string; user_tracker_id: string },
>(events: T[], customTrackerIds: ReadonlySet<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of filterCustomTrackerEventRows(events, customTrackerIds)) {
    const date = String(row.local_date);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

export function buildDayMapForMonth(
  year: number,
  month: number,
): Map<string, DayIndicator> {
  const { start, end } = monthRange(year, month);
  const dayMap = new Map<string, DayIndicator>();
  let cursor = start;
  while (cursor <= end) {
    dayMap.set(cursor, emptyDay(cursor));
    cursor = shiftLocalDate(cursor, 1);
  }
  return dayMap;
}
