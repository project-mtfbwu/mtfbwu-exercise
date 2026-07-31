import { createSupabaseServerClient } from "@/shared/database/server";

type DbRow = Record<string, unknown>;
// Same narrow boundary as `actions.ts` — Increment 6 tables are not yet in
// the generated `Database` types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkoutDb = { from(table: string): any };

export type WorkoutDayScheduledSummary = {
  id: string;
  title: string;
  status: string;
};

export type WorkoutDayActiveSessionSummary = {
  id: string;
  title: string;
  startedAt: string;
  totalSets: number;
  completedSets: number;
};

export type WorkoutDaySummary = {
  scheduled: WorkoutDayScheduledSummary | null;
  activeSession: WorkoutDayActiveSessionSummary | null;
};

const EMPTY_SUMMARY: WorkoutDaySummary = { scheduled: null, activeSession: null };

/**
 * Not exported: kept local to this loader rather than reused from
 * `sessions/actions.ts`, since a `"use server"` actions file cannot export a
 * non-Server-Action helper. Mirrors the `authenticatedDb` helper there.
 */
async function authenticatedDb(): Promise<{ db: WorkoutDb } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as WorkoutDb } : null;
}

/**
 * Board summary for a single local date: the earliest scheduled workout (if
 * any) plus progress counts for the user's current in-progress session
 * (regardless of which date it was started on — a session can span midnight).
 */
export async function loadWorkoutDaySummary(
  localDate: string,
): Promise<WorkoutDaySummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return EMPTY_SUMMARY;
  const context = await authenticatedDb();
  if (!context) return EMPTY_SUMMARY;
  const { db } = context;

  const { data: scheduledRow } = await db
    .from("scheduled_workouts")
    .select("id, title, status")
    .eq("local_date", localDate)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: sessionRow } = await db
    .from("workout_sessions")
    .select("id, title, started_at")
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let activeSession: WorkoutDayActiveSessionSummary | null = null;
  if (sessionRow) {
    const { data: exerciseRows } = await db
      .from("workout_session_exercises")
      .select("id")
      .eq("workout_session_id", sessionRow.id);
    const exerciseIds = (exerciseRows ?? []).map((row: DbRow) => row.id);
    const { data: setRows } = exerciseIds.length
      ? await db
          .from("workout_sets")
          .select("status")
          .in("workout_session_exercise_id", exerciseIds)
      : { data: [] };
    const sets = (setRows ?? []) as DbRow[];
    activeSession = {
      id: String(sessionRow.id),
      title: String(sessionRow.title ?? "Workout"),
      startedAt: String(sessionRow.started_at),
      totalSets: sets.length,
      completedSets: sets.filter((s) => s.status === "completed").length,
    };
  }

  return {
    scheduled: scheduledRow
      ? {
          id: String(scheduledRow.id),
          title: String(scheduledRow.title),
          status: String(scheduledRow.status),
        }
      : null,
    activeSession,
  };
}
