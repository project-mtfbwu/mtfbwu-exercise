import { ROUTES } from "@/shared/config/constants";
import { loadDailyOverview } from "@/modules/daily/load-daily-overview";
import { hydrationProgressLabel } from "@/modules/hydration/calculations";
import { meditationStatusLabel } from "@/modules/meditation/calculations";
import { sleepStatusLabel } from "@/modules/sleep/calculations";
import { supplementStatusLabel } from "@/modules/supplements/calculations/helpers";
import { shiftLocalDate } from "@/shared/utils/local-date";

export type DayDetailLink = {
  label: string;
  href: string;
  unavailable?: boolean;
};

export type DayDetailSection = {
  moduleKey: string;
  title: string;
  summary: string;
  links: DayDetailLink[];
  deleted?: boolean;
};

export type DayDetail = {
  localDate: string;
  timezone: string;
  prevDate: string;
  nextDate: string;
  sections: DayDetailSection[];
  completionPercent: number | null;
};

function todayLink(localDate: string, module?: string): string {
  const base = `${ROUTES.today}?date=${localDate}`;
  return module ? `${base}&focus=${module}` : base;
}

/** Summaries + deep links — not full editors. */
export async function loadDayDetail(
  localDate: string,
  timezone: string,
): Promise<DayDetail | null> {
  const overview = await loadDailyOverview(localDate, timezone);
  if (!overview) return null;

  const sections: DayDetailSection[] = [];

  if (overview.nutrition.mealCount > 0) {
    sections.push({
      moduleKey: "nutrition",
      title: "Nutrition",
      summary: `${overview.nutrition.mealCount} meals · ${overview.nutrition.calories} kcal`,
      links: [
        {
          label: "Open nutrition on today board",
          href: todayLink(localDate, "nutrition"),
        },
        { label: "History", href: `${ROUTES.history}?date=${localDate}` },
      ],
    });
  }

  if (overview.workoutHasCompletedSession || overview.workout.activeSession) {
    sections.push({
      moduleKey: "workout",
      title: "Workout",
      summary: overview.workout.activeSession
        ? `${overview.workout.activeSession.title} in progress`
        : "Workout logged",
      links: [
        { label: "Open workout", href: todayLink(localDate, "workout") },
        { label: "Workout plans", href: ROUTES.plans },
      ],
    });
  }

  if (overview.rehabHasCompletedSession || overview.rehab.activeSession) {
    sections.push({
      moduleKey: "rehab",
      title: "Rehab",
      summary: overview.rehab.activeSession
        ? `${overview.rehab.activeSession.title} in progress`
        : "Rehab session logged",
      links: [
        { label: "Open rehab", href: todayLink(localDate, "rehab") },
        { label: "Rehab plans", href: ROUTES.rehabPlans },
      ],
    });
  }

  if (overview.hydration.entryCount > 0) {
    sections.push({
      moduleKey: "hydration",
      title: "Hydration",
      summary: hydrationProgressLabel(overview.hydration),
      links: [{ label: "Log water", href: todayLink(localDate, "hydration") }],
    });
  }

  if (overview.meditation.sessionCount > 0) {
    sections.push({
      moduleKey: "meditation",
      title: "Meditation",
      summary: meditationStatusLabel(
        overview.meditation.totalDurationSeconds,
        overview.meditation.sessionCount,
      ),
      links: [{ label: "Open meditation", href: todayLink(localDate, "meditation") }],
    });
  }

  if (overview.sleep.sessions.length > 0) {
    sections.push({
      moduleKey: "sleep",
      title: "Sleep",
      summary: sleepStatusLabel(overview.sleep),
      links: [{ label: "View sleep", href: todayLink(localDate, "sleep") }],
    });
  }

  if (overview.supplements.intakes.length > 0 || overview.supplements.totalActive > 0) {
    sections.push({
      moduleKey: "supplements",
      title: "Supplements",
      summary: supplementStatusLabel(overview.supplements),
      links: [
        { label: "Supplement checklist", href: todayLink(localDate, "supplements") },
        { label: "Customize supplements", href: ROUTES.customize },
      ],
    });
  }

  if (overview.progress.weightEntry || overview.progress.photoSetCount > 0) {
    sections.push({
      moduleKey: "progress",
      title: "Progress",
      summary: overview.progress.weightEntry
        ? `Weight ${overview.progress.weightEntry.display}`
        : `${overview.progress.photoSetCount} photo set(s)`,
      links: [
        { label: "Progress page", href: ROUTES.progress },
        { label: "Log on today board", href: todayLink(localDate, "progress") },
      ],
    });
  }

  for (const t of overview.customTrackers.filter((c) => c.eventCount > 0)) {
    sections.push({
      moduleKey: `custom_tracker_${t.id}`,
      title: t.displayName,
      summary: `${t.eventCount} event${t.eventCount === 1 ? "" : "s"}`,
      links: [
        { label: "Open tracker", href: todayLink(localDate, "custom_tracker") },
        { label: "Customize trackers", href: ROUTES.customize },
      ],
    });
  }

  return {
    localDate,
    timezone,
    prevDate: shiftLocalDate(localDate, -1),
    nextDate: shiftLocalDate(localDate, 1),
    sections,
    completionPercent: overview.completion.percent,
  };
}
