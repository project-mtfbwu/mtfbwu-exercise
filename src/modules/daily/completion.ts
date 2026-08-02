import type {
  DailyCompletion,
  DailyModuleKey,
  DailyOverview,
} from "@/modules/daily/types";

const MODULE_ACTIVITY_CHECKS: {
  key: DailyModuleKey;
  hasActivity: (o: DailyOverview) => boolean;
}[] = [
  { key: "nutrition", hasActivity: (o) => o.nutrition.mealCount > 0 },
  {
    key: "workout",
    hasActivity: (o) => !!o.workout.activeSession || o.workoutHasCompletedSession,
  },
  {
    key: "rehab",
    hasActivity: (o) => !!o.rehab.activeSession || o.rehabHasCompletedSession,
  },
  { key: "hydration", hasActivity: (o) => o.hydration.entryCount > 0 },
  { key: "meditation", hasActivity: (o) => o.meditation.sessionCount > 0 },
  { key: "sleep", hasActivity: (o) => o.sleep.sessions.length > 0 },
  { key: "supplements", hasActivity: (o) => o.supplements.intakes.length > 0 },
  {
    key: "measurements",
    hasActivity: (o) => o.progress.measurementCount > 0 || !!o.progress.weightEntry,
  },
  { key: "progress_photos", hasActivity: (o) => o.progress.photoSetCount > 0 },
  {
    key: "custom_tracker",
    hasActivity: (o) => o.customTrackers.some((t) => t.eventCount > 0),
  },
];

/** Neutral completion calc — percent of modules with activity, no streak shame. */
export function calculateDailyCompletion(overview: DailyOverview): DailyCompletion {
  const active = MODULE_ACTIVITY_CHECKS.filter((m) => m.hasActivity(overview));
  const trackedModules = MODULE_ACTIVITY_CHECKS.length;
  const activeCount = active.length;
  const percent =
    trackedModules > 0 ? Math.round((activeCount / trackedModules) * 100) : null;
  return { activeCount, trackedModules, percent };
}

export function moduleActivityMap(
  overview: DailyOverview,
): Partial<Record<DailyModuleKey, boolean>> {
  const map: Partial<Record<DailyModuleKey, boolean>> = {};
  for (const check of MODULE_ACTIVITY_CHECKS) {
    map[check.key] = check.hasActivity(overview);
  }
  return map;
}
