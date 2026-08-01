import type {
  CardVisualVariant,
  DailyModuleStatus,
  DailyModuleStatusKind,
  DashboardCard,
  DashboardLayout,
  ModuleDefinition,
  Profile,
  UserModule,
} from "@/shared/database/types";
import type {
  NutritionDayTotals,
  NutritionGoalsView,
} from "@/modules/nutrition/meals/types";
import type { WorkoutDaySummary } from "@/modules/workout/sessions/load-workout-day";
import type { RehabDaySummary } from "@/modules/rehab/sessions/load-rehab-day";
import type { ProgressDaySummary } from "@/modules/progress/load-progress-day";

export type BoardCardView = {
  card: DashboardCard;
  userModule: UserModule;
  definition: ModuleDefinition;
  status: DailyModuleStatus | null;
  title: string;
  statusLabel: string;
};

export type BoardSnapshot = {
  profile: Profile;
  layout: DashboardLayout;
  cards: BoardCardView[];
  localDate: string;
  dailyRecordId: string;
  nutritionSummary?: NutritionDayTotals;
  nutritionGoals?: NutritionGoalsView | null;
  workoutDaySummary?: WorkoutDaySummary;
  rehabDaySummary?: RehabDaySummary;
  progressDaySummary?: ProgressDaySummary;
  syncBanner: string | null;
};

export function labelForStatus(
  definition: ModuleDefinition,
  status: DailyModuleStatus | null,
  customLabel: string | null,
): string {
  const title = customLabel?.trim() || definition.display_name;
  if (!status || status.status === "not_started") {
    return `${title} · not started`;
  }
  if (status.summary_text) return status.summary_text;
  return `${title} · ${status.status.replace("_", " ")}`;
}

/**
 * Shows calories against a target when one is set, falling back to the
 * generic status label so an empty day still reads as "not started" rather
 * than a bare "0 / — kcal".
 */
export function nutritionStatusLabel(
  totals: NutritionDayTotals,
  goals: NutritionGoalsView | null | undefined,
  definition: ModuleDefinition,
  status: DailyModuleStatus | null,
  customLabel: string | null,
): string {
  const target = goals?.calorieTarget;
  if (totals.mealCount === 0 && target == null) {
    return labelForStatus(definition, status, customLabel);
  }
  const targetLabel = target != null ? `${target}` : "—";
  const mealsLabel =
    totals.mealCount > 0
      ? ` · ${totals.mealCount} meal${totals.mealCount === 1 ? "" : "s"}`
      : "";
  return `${totals.calories} / ${targetLabel} kcal${mealsLabel}`;
}

/**
 * Active in-progress sessions take priority, then today's scheduled plan day,
 * then the generic daily-module status label.
 */
export function workoutStatusLabel(
  summary: WorkoutDaySummary,
  definition: ModuleDefinition,
  status: DailyModuleStatus | null,
  customLabel: string | null,
): string {
  if (summary.activeSession) {
    const { title, completedSets, totalSets } = summary.activeSession;
    const progress = totalSets > 0 ? `${completedSets}/${totalSets} sets` : "in progress";
    return `${title} · ${progress}`;
  }
  if (summary.scheduled && summary.scheduled.status === "planned") {
    return `${summary.scheduled.title} scheduled`;
  }
  if (status?.summary_text) return status.summary_text;
  return labelForStatus(definition, status, customLabel);
}

/**
 * Active in-progress rehab sessions take priority, then today's scheduled rehab,
 * then pain/confidence summaries, then the generic daily-module status label.
 */
export function rehabStatusLabel(
  summary: RehabDaySummary,
  definition: ModuleDefinition,
  status: DailyModuleStatus | null,
  customLabel: string | null,
): string {
  if (summary.activeSession) {
    const { title, completedSets, totalSets, unacknowledgedAlerts } =
      summary.activeSession;
    const progress = totalSets > 0 ? `${completedSets}/${totalSets} sets` : "in progress";
    const alertSuffix =
      unacknowledgedAlerts > 0
        ? ` · ${unacknowledgedAlerts} alert${unacknowledgedAlerts === 1 ? "" : "s"}`
        : "";
    return `${title} · ${progress}${alertSuffix}`;
  }
  if (summary.scheduled && summary.scheduled.status === "planned") {
    return `${summary.scheduled.title} scheduled`;
  }
  if (status?.summary_text) return status.summary_text;
  return labelForStatus(definition, status, customLabel);
}

/**
 * Progress status for measurements and/or progress_photos board modules.
 * Prefers today's weight, then measurement/photo counts, then generic status.
 */
export function progressStatusLabel(
  summary: ProgressDaySummary,
  definition: ModuleDefinition,
  status: DailyModuleStatus | null,
  customLabel: string | null,
  moduleKey: "measurements" | "progress_photos",
): string {
  if (moduleKey === "measurements") {
    if (summary.weightEntry) {
      return `${summary.weightEntry.display} logged`;
    }
    if (summary.measurementCount > 0) {
      const n = summary.measurementCount;
      return `${n} measurement entr${n === 1 ? "y" : "ies"} today`;
    }
  }
  if (moduleKey === "progress_photos") {
    if (summary.photoSetCount > 0) {
      const n = summary.photoSetCount;
      return `${n} photo set${n === 1 ? "" : "s"} today`;
    }
    if (summary.latestPhotoSetDate) {
      return `Last photos ${summary.latestPhotoSetDate}`;
    }
  }
  if (status?.summary_text) return status.summary_text;
  return labelForStatus(definition, status, customLabel);
}

export function variantToFlatLay(variant: CardVisualVariant): {
  kind: "paper" | "window";
  paperTone?: "cream" | "yellow" | "pink";
  windowAccent?: "cyan" | "purple" | "pink" | "orange" | "lime" | "blue";
} {
  switch (variant) {
    case "paper_yellow":
      return { kind: "paper", paperTone: "yellow" };
    case "paper_pink":
      return { kind: "paper", paperTone: "pink" };
    case "window_cyan":
      return { kind: "window", windowAccent: "cyan" };
    case "window_purple":
      return { kind: "window", windowAccent: "purple" };
    case "window_pink":
      return { kind: "window", windowAccent: "pink" };
    case "window_orange":
      return { kind: "window", windowAccent: "orange" };
    case "window_lime":
      return { kind: "window", windowAccent: "lime" };
    case "window_blue":
      return { kind: "window", windowAccent: "blue" };
    case "paper_cream":
    default:
      return { kind: "paper", paperTone: "cream" };
  }
}

export function nextStatusAfterDemoSave(
  current: DailyModuleStatusKind | null,
): DailyModuleStatusKind {
  if (current === "completed") return "completed";
  return "completed";
}

/**
 * Conflict rules (Increment 3):
 * - Layout: expectedVersion must match; RPC bumps version or raises layout_version_conflict.
 * - Daily status: expectedRevision must match; completed cannot be wiped to not_started by stale offline writes.
 */
export function isLayoutConflictError(message: string): boolean {
  return message.toLowerCase().includes("layout_version_conflict");
}

export function isStatusConflictError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("status_revision_conflict") || m.includes("status_completed_protected")
  );
}
