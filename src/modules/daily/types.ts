import type { HydrationDaySummary } from "@/modules/hydration/types";
import type { MeditationDaySummary } from "@/modules/meditation/types";
import type { SleepDaySummary } from "@/modules/sleep/types";
import type { SupplementDaySummary } from "@/modules/supplements/types";
import type { ProgressDaySummary } from "@/modules/progress/load-progress-day";
import type { WorkoutDaySummary } from "@/modules/workout/sessions/load-workout-day";
import type { RehabDaySummary } from "@/modules/rehab/sessions/load-rehab-day";
import type { NutritionDayTotals } from "@/modules/nutrition/meals/types";

export type DailyModuleKey =
  | "nutrition"
  | "workout"
  | "rehab"
  | "hydration"
  | "meditation"
  | "sleep"
  | "supplements"
  | "measurements"
  | "progress_photos"
  | "custom_tracker";

export type DailyOverview = {
  localDate: string;
  timezone: string;
  nutrition: NutritionDayTotals;
  workout: WorkoutDaySummary;
  rehab: RehabDaySummary;
  progress: ProgressDaySummary;
  hydration: HydrationDaySummary;
  meditation: MeditationDaySummary;
  sleep: SleepDaySummary;
  supplements: SupplementDaySummary;
  /** Enabled custom trackers with event counts for the day. */
  customTrackers: { id: string; displayName: string; eventCount: number }[];
  workoutHasCompletedSession: boolean;
  rehabHasCompletedSession: boolean;
  completion: DailyCompletion;
};

export type DailyCompletion = {
  /** Modules with any activity today. */
  activeCount: number;
  /** Enabled modules on board (approximation from summaries loaded). */
  trackedModules: number;
  percent: number | null;
};

export type HistoryListItem = {
  localDate: string;
  summaryLine: string;
  modules: Partial<Record<DailyModuleKey, boolean>>;
};

export type HistoryPage = {
  items: HistoryListItem[];
  nextCursor: string | null;
};
