"use server";

import { revalidatePath } from "next/cache";
import {
  normalizeLoadToKg,
  sessionDurationSeconds,
  totalSessionVolume,
  type PerformedSetLike,
} from "@/modules/workout/calculations";
import { ARNOLD_STARTER_PLAN } from "@/modules/workout/plans/arnold-starter";
import { planSummaryView } from "@/modules/workout/plans/views";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import { shiftLocalDate } from "@/shared/utils/local-date";
import { buildCopySessionPlan } from "./copy-session";
import {
  decodePersonalRecordMeta,
  detectPersonalRecordCandidates,
  encodePersonalRecordMeta,
  type PersonalRecordCandidateSet,
  type PersonalRecordPriorBests,
} from "./personal-record-candidates";
import type {
  ExerciseCatalogView,
  PerformedSetHistoryView,
  PerformedSetView,
  PersonalRecordType,
  PersonalRecordView,
  PlanSummaryView,
  SessionStartOptionsView,
  WorkoutBlockType,
  WorkoutSessionExerciseView,
  WorkoutSessionStatus,
  WorkoutSessionView,
  WorkoutSetRole,
  WorkoutSetStatus,
} from "./types";
import { PERSONAL_RECORD_TYPES } from "./types";
import {
  addExerciseToSessionSchema,
  addSetSchema,
  cancelSessionSchema,
  completeSetSchema,
  copyYesterdaySessionSchema,
  exerciseHistorySchema,
  finishSessionSchema,
  personalRecordIdSchema,
  repeatLastSessionSchema,
  scheduleWorkoutSchema,
  sessionStartOptionsSchema,
  skipSetSchema,
  startBlankSessionSchema,
  startFromPlanDaySchema,
  startScheduledSessionSchema,
} from "./schemas";

export type SessionResult =
  | {
      ok: true;
      session: WorkoutSessionView;
      message: string;
      /** Only set by `finishSessionAction` — newly detected, unconfirmed PRs. */
      pendingPersonalRecords?: PersonalRecordView[];
    }
  | { ok: false; error: string; conflict?: boolean; activeSessionId?: string };
export type ActionResult = { ok: true; message: string } | { ok: false; error: string };
export type IdResult =
  { ok: true; id: string; message: string } | { ok: false; error: string };

type DbRow = Record<string, unknown>;
// Narrow adapter for workout tables: generated Database types include Increment 6,
// but nested relation selects stay easier with a loose `from` boundary (same
// pattern as nutrition meal actions).
type WorkoutDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, args?: Record<string, unknown>): any;
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function relationRow(value: unknown): DbRow | null {
  if (Array.isArray(value)) return (value[0] as DbRow | null) ?? null;
  return (value as DbRow | null) ?? null;
}

async function authenticatedDb(): Promise<{ db: WorkoutDb; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as WorkoutDb, userId: user.id } : null;
}

// ---------------------------------------------------------------------------
// View builders
// ---------------------------------------------------------------------------

function performedSetView(row: DbRow): PerformedSetView {
  return {
    id: String(row.id),
    setIndex: numberValue(row.set_index),
    setRole: row.set_role as WorkoutSetRole,
    status: row.status as WorkoutSetStatus,
    reps: numberOrNull(row.reps),
    loadKg: numberOrNull(row.weight_kg),
    loadUnit:
      (row.load_unit as WorkoutSessionView["exercises"][number]["sets"][number]["loadUnit"]) ??
      "kg",
    durationSeconds: numberOrNull(row.duration_seconds),
    distanceMeters: numberOrNull(row.distance_meters),
    rpe: numberOrNull(row.rpe),
    rir: numberOrNull(row.rir),
    notes: (row.notes as string | null) ?? null,
  };
}

function sessionExerciseView(row: DbRow, sets: DbRow[]): WorkoutSessionExerciseView {
  return {
    id: String(row.id),
    exerciseDefinitionId: row.exercise_definition_id
      ? String(row.exercise_definition_id)
      : null,
    userExerciseId: row.user_exercise_id ? String(row.user_exercise_id) : null,
    exerciseName: String(row.display_name_snapshot),
    blockType: (row.block_type_snapshot as WorkoutBlockType | null) ?? null,
    blockOrder: numberValue(row.block_order),
    sortOrder: numberValue(row.sort_order),
    sets: sets
      .filter((s) => s.workout_session_exercise_id === row.id)
      .map(performedSetView),
  };
}

function sessionView(row: DbRow, exercises: DbRow[], sets: DbRow[]): WorkoutSessionView {
  return {
    id: String(row.id),
    title: String(row.title ?? "Workout"),
    status: row.status as WorkoutSessionStatus,
    version: numberValue(row.version),
    startedAt: String(row.started_at),
    completedAt: (row.completed_at as string | null) ?? null,
    durationSeconds: numberOrNull(row.duration_seconds),
    totalVolume: numberOrNull(row.total_volume),
    sessionRpe: numberOrNull(row.session_rpe),
    notes: (row.notes as string | null) ?? null,
    workoutPlanId: row.workout_plan_id ? String(row.workout_plan_id) : null,
    workoutPlanDayId: row.workout_plan_day_id ? String(row.workout_plan_day_id) : null,
    scheduledWorkoutId: row.scheduled_workout_id
      ? String(row.scheduled_workout_id)
      : null,
    exercises: exercises
      .slice()
      .sort((a, b) => numberValue(a.sort_order) - numberValue(b.sort_order))
      .map((e) => sessionExerciseView(e, sets)),
  };
}

async function loadSessionView(
  db: WorkoutDb,
  session: DbRow,
): Promise<WorkoutSessionView> {
  const { data: exercises } = await db
    .from("workout_session_exercises")
    .select("*")
    .eq("workout_session_id", session.id)
    .order("sort_order");
  const exerciseIds = (exercises ?? []).map((e: DbRow) => e.id);
  const { data: sets } = exerciseIds.length
    ? await db
        .from("workout_sets")
        .select("*")
        .in("workout_session_exercise_id", exerciseIds)
        .order("set_index")
    : { data: [] };
  return sessionView(session, exercises ?? [], sets ?? []);
}

async function ensureDailyRecord(
  db: WorkoutDb,
  userId: string,
  localDate: string,
): Promise<{ id: string } | null> {
  const { data: profile } = await db
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  const timezone = (profile?.timezone as string | undefined) ?? "UTC";
  const { data, error } = await db
    .from("daily_records")
    .upsert(
      { user_id: userId, local_date: localDate, timezone },
      { onConflict: "user_id,local_date" },
    )
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: String(data.id) };
}

async function findActiveSessionId(db: WorkoutDb): Promise<string | null> {
  const { data } = await db
    .from("workout_sessions")
    .select("id")
    .eq("status", "in_progress")
    .limit(1)
    .maybeSingle();
  return data ? String(data.id) : null;
}

/** Best-effort board sync; a failure here never blocks the underlying session write. */
async function updateWorkoutDailyStatus(
  db: WorkoutDb,
  userId: string,
  dailyRecordId: unknown,
  update: { status: string; summaryText?: string },
): Promise<void> {
  const { data: moduleDef } = await db
    .from("module_definitions")
    .select("id")
    .eq("key", "workout")
    .maybeSingle();
  if (!moduleDef) return;
  const { data: userModule } = await db
    .from("user_modules")
    .select("id")
    .eq("user_id", userId)
    .eq("module_definition_id", moduleDef.id)
    .maybeSingle();
  if (!userModule) return;
  const { data: statusRow } = await db
    .from("daily_module_statuses")
    .select("id, revision")
    .eq("daily_record_id", dailyRecordId)
    .eq("user_module_id", userModule.id)
    .maybeSingle();
  if (!statusRow) return;
  await db.rpc("apply_daily_module_status", {
    p_status_id: statusRow.id,
    p_expected_revision: numberValue(statusRow.revision),
    p_status: update.status,
    p_summary_text: update.summaryText ?? null,
  });
}

/**
 * Reads the confirmed prior best for each personal-record type this
 * exercise could produce. Only `confirmed = true` rows count as the bar to
 * beat — a still-pending or dismissed candidate never blocks a new one.
 */
async function loadConfirmedPriorBests(
  db: WorkoutDb,
  userId: string,
  exercise: DbRow,
): Promise<PersonalRecordPriorBests> {
  const priorBests: PersonalRecordPriorBests = {};
  for (const recordType of PERSONAL_RECORD_TYPES) {
    let query = db
      .from("personal_records")
      .select("value")
      .eq("user_id", userId)
      .eq("record_type", recordType)
      .eq("confirmed", true);
    query = exercise.exercise_definition_id
      ? query.eq("exercise_definition_id", exercise.exercise_definition_id)
      : query.eq("user_exercise_id", exercise.user_exercise_id);
    const { data } = await query
      .order("value", { ascending: false })
      .limit(1)
      .maybeSingle();
    priorBests[recordType] = data ? numberValue(data.value) : null;
  }
  return priorBests;
}

/**
 * Inserts new, unconfirmed `personal_records` candidates (estimated 1RM,
 * heaviest load, most reps) whenever a completed working set beats the
 * user's confirmed best for that catalog/custom exercise. Estimates and
 * candidates only — never auto-confirmed, matching the "AI imports need
 * human review" provenance rule extended to derived data. Detection rules
 * (eligible set roles/statuses, tie-breaking) live in the pure
 * `detectPersonalRecordCandidates` so they are unit-testable.
 */
async function detectPersonalRecords(
  db: WorkoutDb,
  userId: string,
  exercises: readonly DbRow[],
  sets: readonly DbRow[],
  achievedAt: string,
): Promise<void> {
  for (const exercise of exercises) {
    if (!exercise.exercise_definition_id && !exercise.user_exercise_id) continue;
    const exerciseSets: PersonalRecordCandidateSet[] = sets
      .filter((s) => s.workout_session_exercise_id === exercise.id)
      .map((s) => ({
        id: String(s.id),
        status: String(s.status),
        setRole: String(s.set_role),
        reps: numberOrNull(s.reps),
        loadKg: numberOrNull(s.weight_kg),
      }));

    const priorBests = await loadConfirmedPriorBests(db, userId, exercise);
    const candidates = detectPersonalRecordCandidates(
      {
        exerciseDefinitionId: exercise.exercise_definition_id
          ? String(exercise.exercise_definition_id)
          : null,
        userExerciseId: exercise.user_exercise_id
          ? String(exercise.user_exercise_id)
          : null,
        exerciseLabel: String(exercise.display_name_snapshot),
        sets: exerciseSets,
      },
      priorBests,
    );
    if (!candidates.length) continue;

    const rows = candidates.map((candidate) => ({
      user_id: userId,
      exercise_definition_id: candidate.exerciseDefinitionId,
      user_exercise_id: candidate.userExerciseId,
      exercise_label_snapshot: candidate.exerciseLabel,
      record_type: candidate.recordType,
      value: candidate.value,
      unit: candidate.unit,
      achieved_at: achievedAt,
      workout_set_id: candidate.workoutSetId,
      notes: encodePersonalRecordMeta({
        estimationMethod: candidate.estimationMethod,
        priorBest: candidate.priorBest,
      }),
      dismissed: false,
      confirmed: false,
    }));
    await db
      .from("personal_records")
      .upsert(rows, { onConflict: "workout_set_id,record_type" });
  }
}

/** Maps a `personal_records` row to its view, decoding the `notes`-embedded meta. */
function personalRecordView(row: DbRow): PersonalRecordView {
  const meta = decodePersonalRecordMeta((row.notes as string | null) ?? null);
  const confirmed = Boolean(row.confirmed);
  const dismissed = Boolean(row.dismissed);
  return {
    id: String(row.id),
    exerciseDefinitionId: row.exercise_definition_id
      ? String(row.exercise_definition_id)
      : null,
    userExerciseId: row.user_exercise_id ? String(row.user_exercise_id) : null,
    exerciseLabel: String(row.exercise_label_snapshot),
    recordType: String(row.record_type) as PersonalRecordType,
    value: numberValue(row.value),
    unit: String(row.unit),
    achievedAt: String(row.achieved_at),
    workoutSetId: row.workout_set_id ? String(row.workout_set_id) : null,
    status: dismissed ? "dismissed" : confirmed ? "confirmed" : "pending",
    estimationMethod: meta.estimationMethod,
    priorBest: meta.priorBest,
  };
}

async function loadPendingPersonalRecordsForSets(
  db: WorkoutDb,
  setIds: readonly string[],
): Promise<PersonalRecordView[]> {
  if (!setIds.length) return [];
  const { data } = await db
    .from("personal_records")
    .select("*")
    .in("workout_set_id", setIds)
    .eq("confirmed", false)
    .eq("dismissed", false)
    .order("achieved_at", { ascending: false });
  return (data ?? []).map(personalRecordView);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listExercisesAction(): Promise<ExerciseCatalogView[]> {
  const context = await authenticatedDb();
  if (!context) return [];
  const { data, error } = await context.db
    .from("exercise_definitions")
    .select(
      "id, stable_key, name, exercise_type, unilateral, bodyweight, timed, distance_based, equipment_types(stable_key)",
    )
    .eq("active", true)
    .order("name");
  if (error || !data) return [];
  return data.map((row: DbRow) => ({
    id: String(row.id),
    stableKey: String(row.stable_key),
    name: String(row.name),
    exerciseType: String(row.exercise_type),
    equipmentKey: relationRow(row.equipment_types)?.stable_key
      ? String(relationRow(row.equipment_types)!.stable_key)
      : null,
    unilateral: Boolean(row.unilateral),
    bodyweight: Boolean(row.bodyweight),
    timed: Boolean(row.timed),
    distanceBased: Boolean(row.distance_based),
  }));
}

export async function listPlansAction(): Promise<PlanSummaryView[]> {
  const context = await authenticatedDb();
  if (!context) return [];
  const { db } = context;
  const { data: plans, error } = await db
    .from("workout_plans")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error || !plans) return [];
  const planIds = plans.map((p: DbRow) => p.id);
  if (!planIds.length) return [];

  const { data: days } = await db
    .from("workout_plan_days")
    .select("*")
    .in("workout_plan_id", planIds)
    .order("sort_order");
  const dayIds = (days ?? []).map((d: DbRow) => d.id);

  const { data: blocks } = dayIds.length
    ? await db
        .from("workout_blocks")
        .select("*")
        .in("workout_plan_day_id", dayIds)
        .order("sort_order")
    : { data: [] };
  const blockIds = (blocks ?? []).map((b: DbRow) => b.id);

  const { data: blockExercises } = blockIds.length
    ? await db
        .from("workout_block_exercises")
        .select("*, exercise_definitions(name), user_exercises(custom_name)")
        .in("workout_block_id", blockIds)
        .order("sort_order")
    : { data: [] };
  const blockExerciseIds = (blockExercises ?? []).map((be: DbRow) => be.id);

  const { data: prescriptions } = blockExerciseIds.length
    ? await db
        .from("workout_set_prescriptions")
        .select("*")
        .in("workout_block_exercise_id", blockExerciseIds)
        .order("set_index")
    : { data: [] };

  return plans.map((plan: DbRow) =>
    planSummaryView(
      plan,
      (days ?? []).filter((d: DbRow) => d.workout_plan_id === plan.id),
      blocks ?? [],
      blockExercises ?? [],
      prescriptions ?? [],
    ),
  );
}

export async function getActiveSessionAction(): Promise<WorkoutSessionView | null> {
  const context = await authenticatedDb();
  if (!context) return null;
  const { db } = context;
  const { data: session } = await db
    .from("workout_sessions")
    .select("*")
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return null;
  return loadSessionView(db, session);
}

export async function getExerciseHistoryAction(
  input: unknown,
): Promise<PerformedSetHistoryView[]> {
  const parsed = exerciseHistorySchema.safeParse(input);
  if (!parsed.success) return [];
  const context = await authenticatedDb();
  if (!context) return [];
  const { db } = context;

  const { data: sessionExercises } = await db
    .from("workout_session_exercises")
    .select("id")
    .eq("exercise_definition_id", parsed.data.exerciseDefinitionId);
  const ids = (sessionExercises ?? []).map((row: DbRow) => row.id);
  if (!ids.length) return [];

  const { data: sets, error } = await db
    .from("workout_sets")
    .select("*")
    .in("workout_session_exercise_id", ids)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(parsed.data.limit ?? 10);
  if (error || !sets) return [];

  return sets.map((row: DbRow) => ({
    id: String(row.id),
    reps: numberOrNull(row.reps),
    loadKg: numberOrNull(row.weight_kg),
    loadUnit: (row.load_unit as PerformedSetHistoryView["loadUnit"]) ?? "kg",
    durationSeconds: numberOrNull(row.duration_seconds),
    rpe: numberOrNull(row.rpe),
    completedAt: (row.completed_at as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

export async function startBlankSessionAction(input: unknown): Promise<SessionResult> {
  const parsed = startBlankSessionSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session request.",
    };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const activeId = await findActiveSessionId(db);
  if (activeId) {
    return {
      ok: false,
      error: "A workout is already in progress. Finish or discard it first.",
      conflict: true,
      activeSessionId: activeId,
    };
  }

  const dailyRecord = await ensureDailyRecord(db, userId, parsed.data.localDate);
  if (!dailyRecord) return { ok: false, error: "Could not prepare today's record." };

  const { data: created, error } = await db
    .from("workout_sessions")
    .insert({
      user_id: userId,
      daily_record_id: dailyRecord.id,
      title: parsed.data.title?.trim() || "Workout",
      status: "in_progress",
    })
    .select("*")
    .single();
  if (error || !created)
    return { ok: false, error: error?.message ?? "Could not start workout." };

  revalidatePath(ROUTES.today);
  return { ok: true, session: sessionView(created, [], []), message: "Workout started" };
}

export async function startFromPlanDayAction(input: unknown): Promise<SessionResult> {
  const parsed = startFromPlanDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid plan day request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const activeId = await findActiveSessionId(db);
  if (activeId) {
    return {
      ok: false,
      error: "A workout is already in progress. Finish or discard it first.",
      conflict: true,
      activeSessionId: activeId,
    };
  }

  const { data: planDay } = await db
    .from("workout_plan_days")
    .select("*, workout_plans(id, name, version)")
    .eq("id", parsed.data.planDayId)
    .maybeSingle();
  const plan = planDay ? relationRow(planDay.workout_plans) : null;
  if (!planDay || !plan) return { ok: false, error: "Plan day not found." };

  const { data: blocks } = await db
    .from("workout_blocks")
    .select("*")
    .eq("workout_plan_day_id", planDay.id)
    .order("sort_order");
  if (!blocks?.length) return { ok: false, error: "This plan day has no exercises yet." };
  const blockIds = blocks.map((b: DbRow) => b.id);

  const { data: blockExercises } = blockIds.length
    ? await db
        .from("workout_block_exercises")
        .select("*, exercise_definitions(id, name), user_exercises(id, custom_name)")
        .in("workout_block_id", blockIds)
        .order("sort_order")
    : { data: [] };
  const blockExerciseIds = (blockExercises ?? []).map((be: DbRow) => be.id);

  const { data: prescriptions } = blockExerciseIds.length
    ? await db
        .from("workout_set_prescriptions")
        .select("*")
        .in("workout_block_exercise_id", blockExerciseIds)
        .order("set_index")
    : { data: [] };

  const dailyRecord = await ensureDailyRecord(db, userId, parsed.data.localDate);
  if (!dailyRecord) return { ok: false, error: "Could not prepare today's record." };

  const orderedBlocks = blocks
    .slice()
    .sort((a: DbRow, b: DbRow) => numberValue(a.sort_order) - numberValue(b.sort_order));

  // A read-only snapshot of the plan structure at start time — later plan
  // edits must never rewrite an already-started session.
  const snapshot = {
    planDayName: planDay.name,
    blocks: orderedBlocks.map((b: DbRow) => ({
      blockType: b.block_type,
      title: b.title,
      exercises: (blockExercises ?? [])
        .filter((be: DbRow) => be.workout_block_id === b.id)
        .sort(
          (a: DbRow, c: DbRow) => numberValue(a.sort_order) - numberValue(c.sort_order),
        )
        .map((be: DbRow) => ({
          name:
            relationRow(be.exercise_definitions)?.name ??
            relationRow(be.user_exercises)?.custom_name ??
            "Exercise",
          prescriptions: (prescriptions ?? [])
            .filter((p: DbRow) => p.workout_block_exercise_id === be.id)
            .map((p: DbRow) => ({
              setIndex: p.set_index,
              setRole: p.set_role,
              targetRepsMin: p.target_reps_min,
              targetRepsMax: p.target_reps_max,
              targetDurationSeconds: p.target_duration_seconds,
              targetDistanceMeters: p.target_distance_meters,
              restSeconds: p.rest_seconds,
            })),
        })),
    })),
  };

  const { data: session, error: sessionError } = await db
    .from("workout_sessions")
    .insert({
      user_id: userId,
      daily_record_id: dailyRecord.id,
      workout_plan_id: plan.id,
      workout_plan_day_id: planDay.id,
      title: String(planDay.name || plan.name),
      status: "in_progress",
      source_plan_version: numberValue(plan.version),
      snapshot_json: snapshot,
    })
    .select("*")
    .single();
  if (sessionError || !session)
    return { ok: false, error: sessionError?.message ?? "Could not start workout." };

  let sortOrder = 0;
  const createdExercises: DbRow[] = [];
  const createdSets: DbRow[] = [];
  for (const b of orderedBlocks) {
    const exercisesForBlock = (blockExercises ?? [])
      .filter((be: DbRow) => be.workout_block_id === b.id)
      .sort(
        (a: DbRow, c: DbRow) => numberValue(a.sort_order) - numberValue(c.sort_order),
      );
    for (const be of exercisesForBlock) {
      const exerciseDef = relationRow(be.exercise_definitions);
      const userExercise = relationRow(be.user_exercises);
      const { data: sessionExercise, error: exerciseError } = await db
        .from("workout_session_exercises")
        .insert({
          workout_session_id: session.id,
          exercise_definition_id: be.exercise_definition_id,
          user_exercise_id: be.user_exercise_id,
          display_name_snapshot: String(
            exerciseDef?.name ?? userExercise?.custom_name ?? "Exercise",
          ),
          sort_order: sortOrder,
          block_type_snapshot: b.block_type,
          block_order: numberValue(b.sort_order),
          exercise_order: numberValue(be.sort_order),
        })
        .select("*")
        .single();
      if (exerciseError || !sessionExercise)
        return {
          ok: false,
          error: exerciseError?.message ?? "Could not materialize session exercises.",
        };
      createdExercises.push(sessionExercise);
      sortOrder += 1;

      const exercisePrescriptions = (prescriptions ?? [])
        .filter((p: DbRow) => p.workout_block_exercise_id === be.id)
        .sort(
          (a: DbRow, c: DbRow) => numberValue(a.set_index) - numberValue(c.set_index),
        );
      if (exercisePrescriptions.length) {
        const { data: setRows, error: setError } = await db
          .from("workout_sets")
          .insert(
            exercisePrescriptions.map((p: DbRow) => ({
              workout_session_exercise_id: sessionExercise.id,
              set_index: p.set_index,
              set_role: p.set_role,
              status: "pending",
            })),
          )
          .select("*");
        if (setError) return { ok: false, error: setError.message };
        createdSets.push(...(setRows ?? []));
      }
    }
  }

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: sessionView(session, createdExercises, createdSets),
    message: "Workout started",
  };
}

export async function startScheduledSessionAction(
  input: unknown,
): Promise<SessionResult> {
  const parsed = startScheduledSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid scheduled workout." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: scheduled } = await db
    .from("scheduled_workouts")
    .select("*")
    .eq("id", parsed.data.scheduledWorkoutId)
    .maybeSingle();
  if (!scheduled) return { ok: false, error: "Scheduled workout not found." };

  const result = scheduled.workout_plan_day_id
    ? await startFromPlanDayAction({
        planDayId: scheduled.workout_plan_day_id,
        localDate: scheduled.local_date,
      })
    : await startBlankSessionAction({
        title: scheduled.title,
        localDate: scheduled.local_date,
      });
  if (!result.ok) return result;

  const { error: linkError } = await db
    .from("workout_sessions")
    .update({ scheduled_workout_id: scheduled.id })
    .eq("id", result.session.id);
  if (linkError) return { ok: false, error: linkError.message };

  revalidatePath(ROUTES.today);
  return {
    ...result,
    session: { ...result.session, scheduledWorkoutId: String(scheduled.id) },
  };
}

export async function completeSetAction(input: unknown): Promise<SessionResult> {
  const parsed = completeSetSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid set." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: setRow } = await db
    .from("workout_sets")
    .select("*, workout_session_exercises(workout_session_id)")
    .eq("id", parsed.data.setId)
    .maybeSingle();
  if (!setRow) return { ok: false, error: "Set not found." };
  const sessionId = relationRow(setRow.workout_session_exercises)?.workout_session_id;
  if (!sessionId) return { ok: false, error: "Set is not linked to a session." };

  const { data: session } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "in_progress")
    return { ok: false, error: "This workout is no longer in progress." };
  if (numberValue(session.version) !== parsed.data.version)
    return {
      ok: false,
      error: "Workout changed elsewhere — refresh and try again.",
      conflict: true,
    };

  const loadUnit = parsed.data.loadUnit ?? "kg";
  const weightKg =
    parsed.data.load === undefined
      ? undefined
      : loadUnit === "kg" || loadUnit === "lb"
        ? normalizeLoadToKg(parsed.data.load, loadUnit)
        : parsed.data.load;

  const { error: updateError } = await db
    .from("workout_sets")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      ...(parsed.data.reps !== undefined ? { reps: parsed.data.reps } : {}),
      ...(weightKg !== undefined ? { weight_kg: weightKg } : {}),
      ...(parsed.data.load !== undefined ? { load_unit: loadUnit } : {}),
      ...(parsed.data.durationSeconds !== undefined
        ? { duration_seconds: parsed.data.durationSeconds }
        : {}),
      ...(parsed.data.rpe !== undefined ? { rpe: parsed.data.rpe } : {}),
    })
    .eq("id", parsed.data.setId);
  if (updateError) return { ok: false, error: updateError.message };

  const { error: versionError } = await db
    .from("workout_sessions")
    .update({ version: numberValue(session.version) + 1 })
    .eq("id", sessionId);
  if (versionError) return { ok: false, error: versionError.message };

  const { data: refreshedSession } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  return {
    ok: true,
    session: await loadSessionView(db, refreshedSession),
    message: "Set logged",
  };
}

export async function skipSetAction(input: unknown): Promise<SessionResult> {
  const parsed = skipSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid set." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: setRow } = await db
    .from("workout_sets")
    .select("*, workout_session_exercises(workout_session_id)")
    .eq("id", parsed.data.setId)
    .maybeSingle();
  if (!setRow) return { ok: false, error: "Set not found." };
  const sessionId = relationRow(setRow.workout_session_exercises)?.workout_session_id;
  if (!sessionId) return { ok: false, error: "Set is not linked to a session." };

  const { data: session } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "in_progress")
    return { ok: false, error: "This workout is no longer in progress." };
  if (numberValue(session.version) !== parsed.data.version)
    return {
      ok: false,
      error: "Workout changed elsewhere — refresh and try again.",
      conflict: true,
    };

  const { error } = await db
    .from("workout_sets")
    .update({ status: "skipped", completed_at: null })
    .eq("id", parsed.data.setId);
  if (error) return { ok: false, error: error.message };

  await db
    .from("workout_sessions")
    .update({ version: numberValue(session.version) + 1 })
    .eq("id", sessionId);
  const { data: refreshedSession } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  return {
    ok: true,
    session: await loadSessionView(db, refreshedSession),
    message: "Set skipped",
  };
}

/**
 * Adds a catalog exercise (with optional working-set slots) to an in-progress
 * blank or plan-started session. Does not mutate any workout plan.
 */
export async function addExerciseToSessionAction(input: unknown): Promise<SessionResult> {
  const parsed = addExerciseToSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid exercise request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: session } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "in_progress")
    return { ok: false, error: "This workout is no longer in progress." };
  if (numberValue(session.version) !== parsed.data.version)
    return {
      ok: false,
      error: "Workout changed elsewhere — refresh and try again.",
      conflict: true,
    };

  const { data: exercise } = await db
    .from("exercise_definitions")
    .select("id, name")
    .eq("id", parsed.data.exerciseDefinitionId)
    .eq("active", true)
    .maybeSingle();
  if (!exercise) return { ok: false, error: "Exercise not found in catalog." };

  const { data: existing } = await db
    .from("workout_session_exercises")
    .select("sort_order")
    .eq("workout_session_id", session.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = numberValue(existing?.[0]?.sort_order ?? -1) + 1;

  const { data: sessionExercise, error: exerciseError } = await db
    .from("workout_session_exercises")
    .insert({
      workout_session_id: session.id,
      exercise_definition_id: exercise.id,
      display_name_snapshot: String(exercise.name),
      sort_order: nextOrder,
      block_type_snapshot: "straight_sets",
      block_order: nextOrder,
      exercise_order: 0,
    })
    .select("*")
    .single();
  if (exerciseError || !sessionExercise)
    return {
      ok: false,
      error: exerciseError?.message ?? "Could not add exercise.",
    };

  const workingSets = parsed.data.workingSets ?? 3;
  const { error: setError } = await db.from("workout_sets").insert(
    Array.from({ length: workingSets }, (_, index) => ({
      workout_session_exercise_id: sessionExercise.id,
      set_index: index + 1,
      set_role: "working",
      status: "pending",
    })),
  );
  if (setError) return { ok: false, error: setError.message };

  await db
    .from("workout_sessions")
    .update({ version: numberValue(session.version) + 1 })
    .eq("id", session.id);
  const { data: refreshed } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", session.id)
    .single();

  return {
    ok: true,
    session: await loadSessionView(db, refreshed),
    message: `${exercise.name} added`,
  };
}

export async function addSetAction(input: unknown): Promise<SessionResult> {
  const parsed = addSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: sessionExercise } = await db
    .from("workout_session_exercises")
    .select("*")
    .eq("id", parsed.data.sessionExerciseId)
    .maybeSingle();
  if (!sessionExercise) return { ok: false, error: "Exercise not found." };

  const { data: session } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionExercise.workout_session_id)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "in_progress")
    return { ok: false, error: "This workout is no longer in progress." };

  const { data: existingSets } = await db
    .from("workout_sets")
    .select("set_index")
    .eq("workout_session_exercise_id", sessionExercise.id)
    .order("set_index", { ascending: false })
    .limit(1);
  const nextIndex = numberValue(existingSets?.[0]?.set_index ?? 0) + 1;

  const { error } = await db.from("workout_sets").insert({
    workout_session_exercise_id: sessionExercise.id,
    set_index: nextIndex,
    set_role: parsed.data.setRole ?? "working",
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    session: await loadSessionView(db, session),
    message: "Set added",
  };
}

export async function finishSessionAction(input: unknown): Promise<SessionResult> {
  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data: session } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "in_progress")
    return { ok: false, error: "This workout is already finished." };
  if (numberValue(session.version) !== parsed.data.version)
    return {
      ok: false,
      error: "Workout changed elsewhere — refresh and try again.",
      conflict: true,
    };

  const { data: exercises } = await db
    .from("workout_session_exercises")
    .select("*")
    .eq("workout_session_id", session.id);
  const exerciseIds = (exercises ?? []).map((e: DbRow) => e.id);
  const { data: sets } = exerciseIds.length
    ? await db
        .from("workout_sets")
        .select("*")
        .in("workout_session_exercise_id", exerciseIds)
    : { data: [] };

  const completedAt = new Date().toISOString();
  const durationSeconds = sessionDurationSeconds(String(session.started_at), completedAt);

  const volumeInputs = (exercises ?? []).map((e: DbRow) => ({
    exerciseId: String(e.id),
    sets: (sets ?? [])
      .filter((s: DbRow) => s.workout_session_exercise_id === e.id)
      .map((s: DbRow): PerformedSetLike => ({
        kind: "strength",
        status:
          s.status === "completed"
            ? "completed"
            : s.status === "partial"
              ? "partial"
              : "skipped",
        reps: numberOrNull(s.reps),
        load: numberOrNull(s.weight_kg),
        loadUnit: "kg",
      })),
  }));
  const totalVolume = totalSessionVolume(volumeInputs);

  const { data: updated, error } = await db
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: completedAt,
      duration_seconds: durationSeconds,
      total_volume: totalVolume,
      session_rpe: parsed.data.perceivedEffort ?? null,
      notes: parsed.data.notes ?? session.notes ?? null,
      version: numberValue(session.version) + 1,
    })
    .eq("id", session.id)
    .select("*")
    .single();
  if (error || !updated)
    return { ok: false, error: error?.message ?? "Could not finish workout." };

  const completedSetCount = (sets ?? []).filter(
    (s: DbRow) => s.status === "completed",
  ).length;
  await updateWorkoutDailyStatus(db, userId, session.daily_record_id, {
    status: "completed",
    summaryText: `${completedSetCount} set${completedSetCount === 1 ? "" : "s"} completed`,
  });

  if (session.scheduled_workout_id) {
    await db
      .from("scheduled_workouts")
      .update({ status: "completed" })
      .eq("id", session.scheduled_workout_id);
  }

  await detectPersonalRecords(db, userId, exercises ?? [], sets ?? [], completedAt);
  const pendingPersonalRecords = await loadPendingPersonalRecordsForSets(
    db,
    (sets ?? []).map((s: DbRow) => String(s.id)),
  );

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: sessionView(updated, exercises ?? [], sets ?? []),
    message: "Workout finished",
    pendingPersonalRecords,
  };
}

export async function cancelSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = cancelSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: session } = await db
    .from("workout_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "in_progress")
    return { ok: false, error: "This workout is already finished." };
  if (
    parsed.data.version !== undefined &&
    numberValue(session.version) !== parsed.data.version
  )
    return { ok: false, error: "Workout changed elsewhere — refresh and try again." };

  const { error } = await db
    .from("workout_sessions")
    .update({ status: "discarded", version: numberValue(session.version) + 1 })
    .eq("id", session.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.today);
  return { ok: true, message: "Workout discarded" };
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export async function schedulePlanDayAction(input: unknown): Promise<IdResult> {
  const parsed = scheduleWorkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid schedule request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data: planDay } = await db
    .from("workout_plan_days")
    .select("*, workout_plans(id, name)")
    .eq("id", parsed.data.planDayId)
    .maybeSingle();
  const plan = planDay ? relationRow(planDay.workout_plans) : null;
  if (!planDay || !plan) return { ok: false, error: "Plan day not found." };

  const { data: existing } = await db
    .from("scheduled_workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", parsed.data.localDate)
    .eq("workout_plan_day_id", planDay.id)
    .maybeSingle();

  const payload = {
    user_id: userId,
    workout_plan_id: plan.id,
    workout_plan_day_id: planDay.id,
    local_date: parsed.data.localDate,
    title: String(planDay.name || plan.name),
    status: "planned",
    timezone: parsed.data.timezone ?? "UTC",
  };

  const write = existing
    ? await db
        .from("scheduled_workouts")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await db.from("scheduled_workouts").insert(payload).select("id").single();
  if (write.error || !write.data)
    return { ok: false, error: write.error?.message ?? "Could not schedule workout." };

  revalidatePath(ROUTES.calendar);
  revalidatePath(ROUTES.today);
  return { ok: true, id: String(write.data.id), message: "Workout scheduled" };
}

// ---------------------------------------------------------------------------
// Copy yesterday / repeat last session
// ---------------------------------------------------------------------------

/**
 * Materializes a brand-new `in_progress` session from a previously completed
 * one: same exercises/sets structure, independent ids (see `copy-session.ts`
 * — the DB assigns fresh primary keys, never reusing the source's), reps and
 * load left blank with the prior performance folded into each set's `notes`
 * as a suggestion only. Shared by both `copyYesterdaySessionAction` and
 * `repeatLastSessionAction`.
 */
async function materializeSessionCopy(
  db: WorkoutDb,
  userId: string,
  sourceSession: DbRow,
  targetLocalDate: string,
): Promise<SessionResult> {
  const { data: sourceExercises } = await db
    .from("workout_session_exercises")
    .select("*")
    .eq("workout_session_id", sourceSession.id)
    .order("sort_order");
  const sourceExerciseIds = (sourceExercises ?? []).map((e: DbRow) => e.id);
  const { data: sourceSets } = sourceExerciseIds.length
    ? await db
        .from("workout_sets")
        .select("*")
        .in("workout_session_exercise_id", sourceExerciseIds)
        .order("set_index")
    : { data: [] };

  const plan = buildCopySessionPlan({
    title: String(sourceSession.title ?? "Workout"),
    workoutPlanId: sourceSession.workout_plan_id
      ? String(sourceSession.workout_plan_id)
      : null,
    workoutPlanDayId: sourceSession.workout_plan_day_id
      ? String(sourceSession.workout_plan_day_id)
      : null,
    sourcePlanVersion: numberOrNull(sourceSession.source_plan_version),
    snapshotJson: sourceSession.snapshot_json ?? {},
    exercises: (sourceExercises ?? []).map((exercise: DbRow) => ({
      exerciseDefinitionId: exercise.exercise_definition_id
        ? String(exercise.exercise_definition_id)
        : null,
      userExerciseId: exercise.user_exercise_id
        ? String(exercise.user_exercise_id)
        : null,
      exerciseName: String(exercise.display_name_snapshot),
      blockType: (exercise.block_type_snapshot as string | null) ?? null,
      blockOrder: numberValue(exercise.block_order),
      sortOrder: numberValue(exercise.sort_order),
      sets: (sourceSets ?? [])
        .filter((s: DbRow) => s.workout_session_exercise_id === exercise.id)
        .map((s: DbRow) => ({
          setIndex: numberValue(s.set_index),
          setRole: String(s.set_role),
          reps: numberOrNull(s.reps),
          loadKg: numberOrNull(s.weight_kg),
          loadUnit: String(s.load_unit ?? "kg"),
        })),
    })),
  });

  const dailyRecord = await ensureDailyRecord(db, userId, targetLocalDate);
  if (!dailyRecord) return { ok: false, error: "Could not prepare today's record." };

  const { data: newSession, error: sessionError } = await db
    .from("workout_sessions")
    .insert({
      user_id: userId,
      daily_record_id: dailyRecord.id,
      workout_plan_id: plan.workoutPlanId,
      workout_plan_day_id: plan.workoutPlanDayId,
      title: plan.title,
      status: "in_progress",
      source_plan_version: plan.sourcePlanVersion,
      snapshot_json: plan.snapshotJson,
    })
    .select("*")
    .single();
  if (sessionError || !newSession)
    return { ok: false, error: sessionError?.message ?? "Could not copy workout." };

  const createdExercises: DbRow[] = [];
  const createdSets: DbRow[] = [];
  for (const exercisePlan of plan.exercises) {
    const { data: sessionExercise, error: exerciseError } = await db
      .from("workout_session_exercises")
      .insert({
        workout_session_id: newSession.id,
        exercise_definition_id: exercisePlan.exerciseDefinitionId,
        user_exercise_id: exercisePlan.userExerciseId,
        display_name_snapshot: exercisePlan.displayNameSnapshot,
        sort_order: exercisePlan.sortOrder,
        block_type_snapshot: exercisePlan.blockTypeSnapshot,
        block_order: exercisePlan.blockOrder,
        exercise_order: exercisePlan.exerciseOrder,
      })
      .select("*")
      .single();
    if (exerciseError || !sessionExercise)
      return {
        ok: false,
        error: exerciseError?.message ?? "Could not copy session exercises.",
      };
    createdExercises.push(sessionExercise);

    if (exercisePlan.sets.length) {
      const { data: setRows, error: setError } = await db
        .from("workout_sets")
        .insert(
          exercisePlan.sets.map((set) => ({
            workout_session_exercise_id: sessionExercise.id,
            set_index: set.setIndex,
            set_role: set.setRole,
            status: set.status,
            notes: set.notes,
          })),
        )
        .select("*");
      if (setError) return { ok: false, error: setError.message };
      createdSets.push(...(setRows ?? []));
    }
  }

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: sessionView(newSession, createdExercises, createdSets),
    message: "Workout copied — last time's numbers are suggested on each set.",
  };
}

/**
 * Copies the most recent **completed** session whose daily record date is
 * the day before `localDate` into a brand-new `in_progress` session for
 * `localDate`. Never links back to the source (ADR 0007: performed history
 * is never rewritten by later actions).
 */
export async function copyYesterdaySessionAction(input: unknown): Promise<SessionResult> {
  const parsed = copyYesterdaySessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const activeId = await findActiveSessionId(db);
  if (activeId) {
    return {
      ok: false,
      error: "A workout is already in progress. Finish or discard it first.",
      conflict: true,
      activeSessionId: activeId,
    };
  }

  const yesterday = shiftLocalDate(parsed.data.localDate, -1);
  const { data: dailyRecord } = await db
    .from("daily_records")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", yesterday)
    .maybeSingle();
  if (!dailyRecord) return { ok: false, error: "No workout found for yesterday." };

  const { data: sourceSession } = await db
    .from("workout_sessions")
    .select("*")
    .eq("daily_record_id", dailyRecord.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sourceSession) return { ok: false, error: "No workout found for yesterday." };

  return materializeSessionCopy(db, userId, sourceSession, parsed.data.localDate);
}

/** Copies the user's most recently completed session, regardless of date, into a new one for `localDate`. */
export async function repeatLastSessionAction(input: unknown): Promise<SessionResult> {
  const parsed = repeatLastSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const activeId = await findActiveSessionId(db);
  if (activeId) {
    return {
      ok: false,
      error: "A workout is already in progress. Finish or discard it first.",
      conflict: true,
      activeSessionId: activeId,
    };
  }

  const { data: sourceSession } = await db
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sourceSession) return { ok: false, error: "No completed workout to repeat yet." };

  return materializeSessionCopy(db, userId, sourceSession, parsed.data.localDate);
}

/**
 * Everything a "start a workout" menu needs to decide which options to show:
 * today's scheduled workout (if any), the most recently completed session,
 * yesterday's completed session (for "copy yesterday"), and any session
 * already in progress (for "resume" instead of starting a new one).
 */
export async function getSessionStartOptionsAction(
  input: unknown,
): Promise<SessionStartOptionsView> {
  const EMPTY: SessionStartOptionsView = {
    scheduled: null,
    lastCompleted: null,
    yesterdayCompleted: null,
    activeSession: null,
  };
  const parsed = sessionStartOptionsSchema.safeParse(input);
  if (!parsed.success) return EMPTY;
  const context = await authenticatedDb();
  if (!context) return EMPTY;
  const { db, userId } = context;

  const { data: scheduledRow } = await db
    .from("scheduled_workouts")
    .select("id, title")
    .eq("user_id", userId)
    .eq("local_date", parsed.data.localDate)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: activeRow } = await db
    .from("workout_sessions")
    .select("id, title")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastCompletedRow } = await db
    .from("workout_sessions")
    .select("id, title, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const yesterday = shiftLocalDate(parsed.data.localDate, -1);
  const { data: yesterdayDailyRecord } = await db
    .from("daily_records")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", yesterday)
    .maybeSingle();
  let yesterdayCompleted: SessionStartOptionsView["yesterdayCompleted"] = null;
  if (yesterdayDailyRecord) {
    const { data: row } = await db
      .from("workout_sessions")
      .select("id, title, completed_at")
      .eq("daily_record_id", yesterdayDailyRecord.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row) {
      yesterdayCompleted = {
        id: String(row.id),
        title: String(row.title ?? "Workout"),
        completedAt: String(row.completed_at),
      };
    }
  }

  return {
    scheduled: scheduledRow
      ? { id: String(scheduledRow.id), title: String(scheduledRow.title) }
      : null,
    lastCompleted: lastCompletedRow
      ? {
          id: String(lastCompletedRow.id),
          title: String(lastCompletedRow.title ?? "Workout"),
          completedAt: String(lastCompletedRow.completed_at),
        }
      : null,
    yesterdayCompleted,
    activeSession: activeRow
      ? { id: String(activeRow.id), title: String(activeRow.title ?? "Workout") }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Personal records — confirm / dismiss
// ---------------------------------------------------------------------------

export async function listPendingPersonalRecordsAction(): Promise<PersonalRecordView[]> {
  const context = await authenticatedDb();
  if (!context) return [];
  const { db, userId } = context;
  const { data, error } = await db
    .from("personal_records")
    .select("*")
    .eq("user_id", userId)
    .eq("confirmed", false)
    .eq("dismissed", false)
    .order("achieved_at", { ascending: false });
  if (error || !data) return [];
  return data.map(personalRecordView);
}

export async function confirmPersonalRecordAction(input: unknown): Promise<ActionResult> {
  const parsed = personalRecordIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { error } = await db
    .from("personal_records")
    .update({ confirmed: true, dismissed: false })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.today);
  return { ok: true, message: "Personal record confirmed" };
}

export async function dismissPersonalRecordAction(input: unknown): Promise<ActionResult> {
  const parsed = personalRecordIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { error } = await db
    .from("personal_records")
    .update({ dismissed: true, confirmed: false })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.today);
  return { ok: true, message: "Personal record dismissed" };
}

// ---------------------------------------------------------------------------
// Arnold starter install
// ---------------------------------------------------------------------------

/**
 * Creates an editable copy of the Arnold Phase One starter plan for the
 * current user. Never called automatically — a user must explicitly request
 * this from a starter-plan picker, mirroring `installStarterTemplateAction`
 * for nutrition.
 */
export async function installArnoldStarterPlanAction(): Promise<IdResult> {
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const stableKeys = [
    ...new Set(
      ARNOLD_STARTER_PLAN.days.flatMap((day) =>
        day.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseStableKey)),
      ),
    ),
  ];
  const { data: exerciseRows, error: exerciseError } = await db
    .from("exercise_definitions")
    .select("id, stable_key")
    .in("stable_key", stableKeys);
  if (exerciseError) return { ok: false, error: exerciseError.message };
  const exerciseIdByKey = new Map(
    (exerciseRows ?? []).map((row: DbRow) => [String(row.stable_key), String(row.id)]),
  );
  const missing = stableKeys.filter((key) => !exerciseIdByKey.has(key));
  if (missing.length)
    return {
      ok: false,
      error: `Exercise catalog is missing: ${missing.join(", ")}. Run the catalog seed migration first.`,
    };

  const { data: plan, error: planError } = await db
    .from("workout_plans")
    .insert({
      user_id: userId,
      name: ARNOLD_STARTER_PLAN.name,
      description: ARNOLD_STARTER_PLAN.description,
      objective: "hypertrophy",
      source: "starter_arnold",
      active: true,
    })
    .select("id")
    .single();
  if (planError || !plan)
    return { ok: false, error: planError?.message ?? "Could not create plan." };

  for (const [dayIndex, day] of ARNOLD_STARTER_PLAN.days.entries()) {
    const { data: planDay, error: dayError } = await db
      .from("workout_plan_days")
      .insert({
        workout_plan_id: plan.id,
        name: day.name,
        day_of_week: day.dayOfWeek,
        sort_order: dayIndex,
      })
      .select("id")
      .single();
    if (dayError || !planDay)
      return { ok: false, error: dayError?.message ?? "Could not create plan day." };

    for (const [blockIndex, b] of day.blocks.entries()) {
      const { data: blockRow, error: blockError } = await db
        .from("workout_blocks")
        .insert({
          workout_plan_day_id: planDay.id,
          block_type: b.blockType,
          title: b.title,
          sort_order: blockIndex,
        })
        .select("id")
        .single();
      if (blockError || !blockRow)
        return { ok: false, error: blockError?.message ?? "Could not create block." };

      for (const [exerciseIndex, ex] of b.exercises.entries()) {
        const exerciseDefinitionId = exerciseIdByKey.get(ex.exerciseStableKey);
        if (!exerciseDefinitionId) continue;
        const { data: blockExercise, error: blockExerciseError } = await db
          .from("workout_block_exercises")
          .insert({
            workout_block_id: blockRow.id,
            exercise_definition_id: exerciseDefinitionId,
            sort_order: exerciseIndex,
          })
          .select("id")
          .single();
        if (blockExerciseError || !blockExercise)
          return {
            ok: false,
            error: blockExerciseError?.message ?? "Could not create block exercise.",
          };

        const { error: prescriptionError } = await db
          .from("workout_set_prescriptions")
          .insert(
            ex.sets.map((set, setIndex) => ({
              workout_block_exercise_id: blockExercise.id,
              set_index: setIndex + 1,
              set_role: set.role,
              completion_rule: "rep_range",
              target_reps_min: set.repsMin,
              target_reps_max: set.repsMax,
              rest_seconds: set.restSeconds,
            })),
          );
        if (prescriptionError) return { ok: false, error: prescriptionError.message };
      }
    }
  }

  revalidatePath(ROUTES.plans);
  return {
    ok: true,
    id: String(plan.id),
    message: `"${ARNOLD_STARTER_PLAN.name}" installed. Review and edit before your first session.`,
  };
}
