import { localDateFromInstant } from "@/shared/utils/local-date";
import type { SleepSessionView, SleepWeekSummary } from "@/modules/sleep/types";

/**
 * Sleep date = local date of bedtime_at in the given timezone.
 * A session crossing midnight still belongs to the calendar day when the user went to bed.
 */
export function sleepDateFromBedtime(bedtimeAt: string, timezone: string): string {
  return localDateFromInstant(bedtimeAt, timezone);
}

/** Duration in seconds between bedtime and wake, handling cross-midnight spans. */
export function sleepDurationSeconds(bedtimeAt: string, wakeAt: string): number {
  const ms = new Date(wakeAt).getTime() - new Date(bedtimeAt).getTime();
  return Math.max(0, Math.round(ms / 1000));
}

/** Format duration as hours and minutes — neutral, no medical labels. */
export function formatSleepDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/** Board status label for sleep. */
export function sleepStatusLabel(summary: {
  primarySession: SleepSessionView | null;
}): string {
  if (!summary.primarySession) return "Sleep · not logged";
  return formatSleepDuration(summary.primarySession.durationSeconds);
}

/**
 * Weekly average descriptive text — informational only, no medical interpretation.
 */
export function sleepWeekDescriptiveText(
  sessions: SleepSessionView[],
  weekStart: string,
  weekEnd: string,
): SleepWeekSummary {
  const inRange = sessions.filter(
    (s) => s.sleepDate >= weekStart && s.sleepDate <= weekEnd,
  );
  const nonNap = inRange.filter((s) => !s.nap);
  if (nonNap.length === 0) {
    return {
      averageHours: null,
      sessionCount: 0,
      descriptiveText: "No sleep entries this week.",
    };
  }
  const avgSeconds =
    nonNap.reduce((sum, s) => sum + s.durationSeconds, 0) / nonNap.length;
  const avgHours = Math.round((avgSeconds / 3600) * 10) / 10;
  return {
    averageHours: avgHours,
    sessionCount: nonNap.length,
    descriptiveText: `Average ${avgHours} hours over ${nonNap.length} night${nonNap.length === 1 ? "" : "s"}.`,
  };
}
