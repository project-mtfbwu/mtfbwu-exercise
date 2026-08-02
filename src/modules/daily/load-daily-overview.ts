import { createSupabaseServerClient } from "@/shared/database/server";
import { sumMealMacros } from "@/modules/nutrition/calculations";
import { loadMealsForDailyRecord } from "@/modules/nutrition/meals/actions";
import { loadWorkoutDaySummary } from "@/modules/workout/sessions/load-workout-day";
import { loadRehabDaySummary } from "@/modules/rehab/sessions/load-rehab-day";
import { loadProgressDaySummary } from "@/modules/progress/load-progress-day";
import { loadHydrationDaySummary } from "@/modules/hydration/load-hydration-day";
import { loadMeditationDaySummary } from "@/modules/meditation/load-meditation-day";
import { loadSleepDaySummary } from "@/modules/sleep/load-sleep-day";
import { loadSupplementsDaySummary } from "@/modules/supplements/load-supplements-day";
import { calculateDailyCompletion } from "@/modules/daily/completion";
import type { DailyOverview } from "@/modules/daily/types";

/** Single aggregation boundary for board + overview surfaces. */
export async function loadDailyOverview(
  localDate: string,
  timezone: string,
): Promise<DailyOverview | null> {
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: dailyRecord } = await db
    .from("daily_records")
    .select("id")
    .eq("user_id", user.id)
    .eq("local_date", localDate)
    .maybeSingle();

  const meals = dailyRecord ? await loadMealsForDailyRecord(dailyRecord.id) : [];
  const nutrition = {
    ...sumMealMacros(meals.map((m) => m.macros)),
    mealCount: meals.length,
    itemCount: meals.reduce((c, m) => c + m.items.length, 0),
  };

  const [workout, rehab, progress, hydration, meditation, sleep, supplements] =
    await Promise.all([
      loadWorkoutDaySummary(localDate),
      loadRehabDaySummary(localDate),
      loadProgressDaySummary(localDate),
      loadHydrationDaySummary(localDate),
      loadMeditationDaySummary(localDate),
      loadSleepDaySummary(localDate),
      loadSupplementsDaySummary(localDate),
    ]);

  const [{ count: workoutCompleted }, { count: rehabCompleted }] = dailyRecord
    ? await Promise.all([
        db
          .from("workout_sessions")
          .select("id", { count: "exact", head: true })
          .eq("daily_record_id", dailyRecord.id)
          .eq("status", "completed"),
        db
          .from("rehab_sessions")
          .select("id", { count: "exact", head: true })
          .eq("daily_record_id", dailyRecord.id)
          .eq("status", "completed"),
      ])
    : [{ count: 0 }, { count: 0 }];

  const { data: customTrackers } = await db
    .from("user_trackers")
    .select("id, custom_name, tracker_definitions(stable_key, display_name)")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .is("tracker_definition_id", null)
    .eq("enabled", true);

  const customTrackerSummaries = [];
  for (const t of customTrackers ?? []) {
    const { count } = await db
      .from("tracker_events")
      .select("id", { count: "exact", head: true })
      .eq("user_tracker_id", t.id)
      .eq("local_date", localDate)
      .is("deleted_at", null);
    const catalog = t.tracker_definitions as { display_name?: string } | null;
    customTrackerSummaries.push({
      id: String(t.id),
      displayName:
        (t.custom_name as string | null)?.trim() ||
        String(catalog?.display_name ?? "Custom tracker"),
      eventCount: count ?? 0,
    });
  }

  const partial: Omit<DailyOverview, "completion"> = {
    localDate,
    timezone,
    nutrition,
    workout,
    rehab,
    progress,
    hydration,
    meditation,
    sleep,
    supplements,
    customTrackers: customTrackerSummaries,
    workoutHasCompletedSession: (workoutCompleted ?? 0) > 0,
    rehabHasCompletedSession: (rehabCompleted ?? 0) > 0,
  };

  return {
    ...partial,
    completion: calculateDailyCompletion({
      ...partial,
      completion: { activeCount: 0, trackedModules: 0, percent: null },
    }),
  };
}
