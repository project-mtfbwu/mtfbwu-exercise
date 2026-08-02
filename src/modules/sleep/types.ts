import type { SleepQuality, TrackerEventSource } from "@/shared/database/types";

export type SleepSessionView = {
  id: string;
  /** Local date assigned from bedtime_at in the user's timezone — see sleepDateFromBedtime. */
  sleepDate: string;
  timezone: string;
  bedtimeAt: string;
  wakeAt: string;
  durationSeconds: number;
  quality: SleepQuality | null;
  interruptions: number | null;
  nap: boolean;
  source: TrackerEventSource;
  note: string | null;
};

export type SleepDaySummary = {
  sessions: SleepSessionView[];
  primarySession: SleepSessionView | null;
  totalDurationSeconds: number;
};

export type SleepWeekSummary = {
  averageHours: number | null;
  sessionCount: number;
  descriptiveText: string;
};
