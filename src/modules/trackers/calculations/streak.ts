import { shiftLocalDate } from "@/shared/utils/local-date";

export type StreakDayRecord = {
  localDate: string;
  completed: boolean;
};

export type StreakInput = {
  /** Dates with at least one qualifying event, sorted ascending. */
  completedDates: string[];
  /** Local dates when this tracker applies (e.g. selected_days). Empty = all days. */
  applicableDates: string[];
  /** End date for streak calculation (inclusive). */
  endDate: string;
};

/**
 * Current streak counting only applicable days with completion.
 * Neutral — no shame language; pure count for display when user opts in.
 */
export function calculateCurrentStreak(input: StreakInput): number {
  const applicable = new Set(input.applicableDates.length ? input.applicableDates : []);
  const completed = new Set(input.completedDates);
  let streak = 0;
  let cursor = input.endDate;

  for (let i = 0; i < 366; i++) {
    const isApplicable = input.applicableDates.length === 0 || applicable.has(cursor);
    if (!isApplicable) {
      cursor = shiftLocalDate(cursor, -1);
      continue;
    }
    if (completed.has(cursor)) {
      streak++;
      cursor = shiftLocalDate(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

/** Build applicable date list for selected_days frequency within a range. */
export function applicableDatesInRange(
  startDate: string,
  endDate: string,
  daysOfWeek: number[] | null,
): string[] {
  if (!daysOfWeek?.length) {
    const dates: string[] = [];
    let cursor = startDate;
    while (cursor <= endDate) {
      dates.push(cursor);
      cursor = shiftLocalDate(cursor, 1);
    }
    return dates;
  }
  const allowed = new Set(daysOfWeek);
  const dates: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    const dow = new Date(`${cursor}T12:00:00Z`).getUTCDay();
    if (allowed.has(dow)) dates.push(cursor);
    cursor = shiftLocalDate(cursor, 1);
  }
  return dates;
}

export function isDayCompleted(records: StreakDayRecord[], localDate: string): boolean {
  return records.some((r) => r.localDate === localDate && r.completed);
}
