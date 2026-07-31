"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  averageConfidence,
  comparePainTrend,
  sessionDurationSeconds,
  sessionMaxPain,
} from "@/modules/rehab/calculations/helpers";
import { detectSetAlerts } from "@/modules/rehab/sessions/alerts";
import type {
  RehabPreviousPerformanceView,
  RehabSessionStartOptionsView,
  RehabSessionSummaryView,
  RehabSessionView,
} from "@/modules/rehab/types";
import {
  clinicianSourceView,
  numberOrNull,
  numberValue,
  relationRow,
  restrictionView,
} from "@/modules/rehab/plans/views";
import {
  acknowledgeAlertSchema,
  completeRehabSetSchema,
  discardRehabSessionSchema,
  finishRehabSessionSchema,
  getSessionStartOptionsSchema,
  loadSummarySchema,
  moveScheduledRehabSchema,
  previousPerformanceSchema,
  recordObservationSchema,
  repeatLastRehabSessionSchema,
  scheduleRehabPlanDaySchema,
  scheduleRehabSchema,
  skipRehabSetSchema,
  skipScheduledRehabSchema,
  cancelScheduledRehabSchema,
  startBlankRehabSchema,
  startFromPlanDaySchema,
  startScheduledRehabSchema,
  stopRehabSetSchema,
} from "./schemas";
import { sessionView } from "./views";

export type IdResult =
  | { ok: true; id: string; message: string }
  | { ok: false; error: string; conflict?: boolean };

export type SessionResult =
  | { ok: true; session: RehabSessionView; message: string }
  | { ok: false; error: string; conflict?: boolean; activeSessionId?: string };

export type SummaryResult =
  { ok: true; summary: RehabSessionSummaryView } | { ok: false; error: string };

type DbRow = Record<string, unknown>;
type RehabDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, args?: Record<string, unknown>): any;
};

async function authenticatedDb(): Promise<{ db: RehabDb; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as RehabDb, userId: user.id } : null;
}

async function findActiveSessionId(db: RehabDb): Promise<string | null> {
  const { data } = await db
    .from("rehab_sessions")
    .select("id")
    .eq("status", "in_progress")
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? String(data.id) : null;
}

async function ensureDailyRecord(
  db: RehabDb,
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

async function loadSessionView(db: RehabDb, session: DbRow): Promise<RehabSessionView> {
  const { data: exercises } = await db
    .from("rehab_session_exercises")
    .select("*")
    .eq("rehab_session_id", session.id)
    .order("exercise_order");
  const exerciseIds = (exercises ?? []).map((e: DbRow) => e.id);
  const { data: sets } = exerciseIds.length
    ? await db
        .from("rehab_sets")
        .select("*")
        .in("rehab_session_exercise_id", exerciseIds)
        .order("set_index")
    : { data: [] };
  const { data: alerts } = await db
    .from("rehab_alert_events")
    .select("*")
    .eq("rehab_session_id", session.id)
    .order("created_at");
  const { data: observations } = await db
    .from("rehab_session_observations")
    .select("*")
    .eq("rehab_session_id", session.id)
    .order("recorded_at");
  return sessionView(
    session,
    exercises ?? [],
    sets ?? [],
    alerts ?? [],
    observations ?? [],
  );
}

async function loadActiveRestrictions(db: RehabDb, planId: string | null) {
  if (!planId) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("rehab_restrictions")
    .select("*")
    .eq("rehab_plan_id", planId)
    .eq("active", true)
    .lte("effective_from", today)
    .or(`effective_until.is.null,effective_until.gte.${today}`);
  return (data ?? []).map(restrictionView);
}

async function loadClinicianSnapshot(db: RehabDb, clinicianSourceId: string | null) {
  if (!clinicianSourceId) return null;
  const { data } = await db
    .from("rehab_clinician_sources")
    .select("*")
    .eq("id", clinicianSourceId)
    .maybeSingle();
  return data ? clinicianSourceView(data) : null;
}

async function insertAlertsForSet(
  db: RehabDb,
  userId: string,
  sessionId: string,
  setId: string,
  input: {
    painLimit: number | null;
    painBefore: number | null;
    painDuring: number | null;
    painAfter: number | null;
    swelling: string | null;
    instability: string | null;
    stopConditionTriggered: boolean;
    userStoppedSet: boolean;
  },
) {
  const detected = detectSetAlerts({
    painLimit: input.painLimit,
    painBefore: input.painBefore,
    painDuring: input.painDuring,
    painAfter: input.painAfter,
    swelling: input.swelling as "none" | "mild" | "moderate" | "severe" | null,
    instability: input.instability as "none" | "slight" | "moderate" | "severe" | null,
    stopConditionTriggered: input.stopConditionTriggered,
    userStoppedSet: input.userStoppedSet,
  });
  if (!detected.length) return;
  await db.from("rehab_alert_events").insert(
    detected.map((alert) => ({
      user_id: userId,
      rehab_session_id: sessionId,
      rehab_set_id: setId,
      alert_type: alert.alertType,
      severity: alert.severity,
      message_snapshot: alert.message,
    })),
  );
}

async function bumpSessionVersion(
  db: RehabDb,
  sessionId: string,
  expectedVersion: number,
): Promise<
  { ok: true; nextVersion: number } | { ok: false; error: string; conflict: true }
> {
  const { data: session } = await db
    .from("rehab_sessions")
    .select("id, version, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found.", conflict: true };
  if (numberValue(session.version) !== expectedVersion) {
    return {
      ok: false,
      error: "Rehab session changed elsewhere — refresh and try again.",
      conflict: true,
    };
  }
  const nextVersion = expectedVersion + 1;
  const { error } = await db
    .from("rehab_sessions")
    .update({ version: nextVersion })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message, conflict: true };
  return { ok: true, nextVersion };
}

/** Best-effort board sync; a failure here never blocks the underlying session write. */
async function updateRehabDailyStatus(
  db: RehabDb,
  userId: string,
  dailyRecordId: unknown,
  update: { status: string; summaryText?: string },
): Promise<void> {
  const { data: moduleDef } = await db
    .from("module_definitions")
    .select("id")
    .eq("key", "rehab")
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

function priorSetSuggestionNotes(set: DbRow): string | null {
  const parts: string[] = [];
  if (set.reps != null) parts.push(`${set.reps} reps`);
  if (set.duration_seconds != null) parts.push(`${set.duration_seconds}s`);
  if (set.hold_seconds != null) parts.push(`${set.hold_seconds}s hold`);
  if (set.pain_after != null) parts.push(`pain ${set.pain_after}/10`);
  if (!parts.length) return null;
  return `Last time: ${parts.join(", ")}`;
}

async function materializeRehabSessionCopy(
  db: RehabDb,
  userId: string,
  sourceSession: DbRow,
  targetLocalDate: string,
): Promise<SessionResult> {
  const { data: sourceExercises } = await db
    .from("rehab_session_exercises")
    .select("*")
    .eq("rehab_session_id", sourceSession.id)
    .order("exercise_order");
  const sourceExerciseIds = (sourceExercises ?? []).map((e: DbRow) => e.id);
  const { data: sourceSets } = sourceExerciseIds.length
    ? await db
        .from("rehab_sets")
        .select("*")
        .in("rehab_session_exercise_id", sourceExerciseIds)
        .order("set_index")
    : { data: [] };

  const dailyRecord = await ensureDailyRecord(db, userId, targetLocalDate);
  if (!dailyRecord) return { ok: false, error: "Could not prepare today's record." };

  const { data: newSession, error: sessionError } = await db
    .from("rehab_sessions")
    .insert({
      user_id: userId,
      daily_record_id: dailyRecord.id,
      source_plan_id: sourceSession.source_plan_id,
      source_plan_day_id: sourceSession.source_plan_day_id,
      source_plan_version: sourceSession.source_plan_version,
      title: sourceSession.title,
      side: sourceSession.side,
      status: "in_progress",
      clinician_source_snapshot: sourceSession.clinician_source_snapshot ?? {},
      restriction_snapshot_json: sourceSession.restriction_snapshot_json ?? [],
      session_snapshot_json: sourceSession.session_snapshot_json ?? {},
    })
    .select("*")
    .single();
  if (sessionError || !newSession)
    return { ok: false, error: sessionError?.message ?? "Could not copy rehab session." };

  const createdExercises: DbRow[] = [];
  const createdSets: DbRow[] = [];
  for (const exercise of sourceExercises ?? []) {
    const { data: sessionExercise, error: exerciseError } = await db
      .from("rehab_session_exercises")
      .insert({
        rehab_session_id: newSession.id,
        source_exercise_id: exercise.source_exercise_id,
        exercise_name_snapshot: exercise.exercise_name_snapshot,
        side: exercise.side,
        exercise_order: exercise.exercise_order,
        instructions_snapshot: exercise.instructions_snapshot,
        stop_conditions_snapshot: exercise.stop_conditions_snapshot,
      })
      .select("*")
      .single();
    if (exerciseError || !sessionExercise)
      return {
        ok: false,
        error: exerciseError?.message ?? "Could not copy session exercises.",
      };
    createdExercises.push(sessionExercise);

    const setsForExercise = (sourceSets ?? []).filter(
      (s: DbRow) => s.rehab_session_exercise_id === exercise.id,
    );
    if (setsForExercise.length) {
      const { data: setRows, error: setError } = await db
        .from("rehab_sets")
        .insert(
          setsForExercise.map((s: DbRow) => ({
            rehab_session_exercise_id: sessionExercise.id,
            set_index: s.set_index,
            side: s.side,
            status: "pending",
            notes: priorSetSuggestionNotes(s),
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
    session: sessionView(newSession, createdExercises, createdSets, []),
    message: "Rehab copied — last time's numbers are suggested on each set.",
  };
}

export async function scheduleRehabSessionAction(input: unknown): Promise<IdResult> {
  const parsed = scheduleRehabSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid schedule request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data, error } = await db
    .from("scheduled_rehab_sessions")
    .insert({
      user_id: userId,
      rehab_plan_day_id: parsed.data.rehabPlanDayId ?? null,
      local_date: parsed.data.localDate,
      timezone: parsed.data.timezone,
      title: parsed.data.title,
      status: "planned",
    })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not schedule rehab." };
  revalidatePath(ROUTES.today);
  return { ok: true, id: String(data.id), message: "Rehab scheduled" };
}

export async function scheduleRehabPlanDayAction(input: unknown): Promise<IdResult> {
  const parsed = scheduleRehabPlanDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid schedule request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data: planDay } = await db
    .from("rehab_plan_days")
    .select("*, rehab_plan_phases(rehab_plans(id, name))")
    .eq("id", parsed.data.planDayId)
    .maybeSingle();
  const phase = planDay ? relationRow((planDay as DbRow).rehab_plan_phases) : null;
  const plan = phase ? relationRow(phase.rehab_plans) : null;
  if (!planDay || !plan) return { ok: false, error: "Plan day not found." };

  const { data: existing } = await db
    .from("scheduled_rehab_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", parsed.data.localDate)
    .eq("rehab_plan_day_id", planDay.id)
    .maybeSingle();

  const payload = {
    user_id: userId,
    rehab_plan_day_id: planDay.id,
    local_date: parsed.data.localDate,
    title: String(planDay.name || plan.name),
    status: "planned",
    timezone: parsed.data.timezone ?? "UTC",
  };

  const write = existing
    ? await db
        .from("scheduled_rehab_sessions")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await db.from("scheduled_rehab_sessions").insert(payload).select("id").single();
  if (write.error || !write.data)
    return { ok: false, error: write.error?.message ?? "Could not schedule rehab." };

  revalidatePath(ROUTES.calendar);
  revalidatePath(ROUTES.today);
  return { ok: true, id: String(write.data.id), message: "Rehab scheduled" };
}

export async function skipScheduledRehabSessionAction(input: unknown): Promise<IdResult> {
  const parsed = skipScheduledRehabSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid skip request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data, error } = await db
    .from("scheduled_rehab_sessions")
    .update({ status: "skipped" })
    .eq("id", parsed.data.scheduledRehabSessionId)
    .eq("status", "planned")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error: "Scheduled rehab changed elsewhere — refresh and try again.",
      conflict: true,
    };
  }

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    id: parsed.data.scheduledRehabSessionId,
    message: "Scheduled rehab skipped",
  };
}

export async function cancelScheduledRehabSessionAction(
  input: unknown,
): Promise<IdResult> {
  const parsed = cancelScheduledRehabSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cancel request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data, error } = await db
    .from("scheduled_rehab_sessions")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.scheduledRehabSessionId)
    .in("status", ["planned", "started"])
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error: "Scheduled rehab changed elsewhere — refresh and try again.",
      conflict: true,
    };
  }

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    id: parsed.data.scheduledRehabSessionId,
    message: "Scheduled rehab cancelled",
  };
}

export async function moveScheduledRehabSessionAction(input: unknown): Promise<IdResult> {
  const parsed = moveScheduledRehabSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid move request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data, error } = await db
    .from("scheduled_rehab_sessions")
    .update({
      local_date: parsed.data.localDate,
      timezone: parsed.data.timezone ?? "UTC",
    })
    .eq("id", parsed.data.scheduledRehabSessionId)
    .eq("status", "planned")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error: "Scheduled rehab changed elsewhere — refresh and try again.",
      conflict: true,
    };
  }

  revalidatePath(ROUTES.calendar);
  revalidatePath(ROUTES.today);
  return {
    ok: true,
    id: parsed.data.scheduledRehabSessionId,
    message: "Scheduled rehab moved",
  };
}

export async function repeatLastRehabSessionAction(
  input: unknown,
): Promise<SessionResult> {
  const parsed = repeatLastRehabSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const activeId = await findActiveSessionId(db);
  if (activeId) {
    return {
      ok: false,
      error: "A rehab session is already in progress. Finish or discard it first.",
      conflict: true,
      activeSessionId: activeId,
    };
  }

  const { data: sourceSession } = await db
    .from("rehab_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sourceSession)
    return { ok: false, error: "No completed rehab session to repeat yet." };

  return materializeRehabSessionCopy(db, userId, sourceSession, parsed.data.localDate);
}

export async function getActiveSessionAction(): Promise<RehabSessionView | null> {
  const context = await authenticatedDb();
  if (!context) return null;
  const { db } = context;
  const { data: session } = await db
    .from("rehab_sessions")
    .select("*")
    .eq("status", "in_progress")
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return null;
  return loadSessionView(db, session);
}

export async function getSessionStartOptionsAction(
  input: unknown,
): Promise<RehabSessionStartOptionsView> {
  const parsed = getSessionStartOptionsSchema.safeParse(input);
  if (!parsed.success) {
    return { scheduled: null, activeSession: null, lastCompleted: null };
  }
  const context = await authenticatedDb();
  if (!context) {
    return { scheduled: null, activeSession: null, lastCompleted: null };
  }
  const { db } = context;

  const { data: scheduled } = await db
    .from("scheduled_rehab_sessions")
    .select("id, title, local_date, status")
    .eq("local_date", parsed.data.localDate)
    .eq("status", "planned")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const activeId = await findActiveSessionId(db);
  const { data: active } = activeId
    ? await db.from("rehab_sessions").select("id, title").eq("id", activeId).maybeSingle()
    : { data: null };

  const { data: lastCompleted } = await db
    .from("rehab_sessions")
    .select("id, title, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    scheduled: scheduled
      ? {
          id: String(scheduled.id),
          title: String(scheduled.title),
          localDate: String(scheduled.local_date),
          status: String(scheduled.status),
        }
      : null,
    activeSession: active ? { id: String(active.id), title: String(active.title) } : null,
    lastCompleted: lastCompleted
      ? {
          id: String(lastCompleted.id),
          title: String(lastCompleted.title),
          completedAt: String(lastCompleted.completed_at),
        }
      : null,
  };
}

export async function startBlankRehabSessionAction(
  input: unknown,
): Promise<SessionResult> {
  const parsed = startBlankRehabSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid session request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const activeId = await findActiveSessionId(db);
  if (activeId) {
    return {
      ok: false,
      error: "A rehab session is already in progress. Finish or discard it first.",
      conflict: true,
      activeSessionId: activeId,
    };
  }

  const dailyRecord = await ensureDailyRecord(db, userId, parsed.data.localDate);
  if (!dailyRecord) return { ok: false, error: "Could not prepare today's record." };

  const { data: created, error } = await db
    .from("rehab_sessions")
    .insert({
      user_id: userId,
      daily_record_id: dailyRecord.id,
      title: parsed.data.title?.trim() || "Rehab session",
      side: parsed.data.side ?? "not_applicable",
      status: "in_progress",
      clinician_source_snapshot: {},
      restriction_snapshot_json: [],
      session_snapshot_json: {},
    })
    .select("*")
    .single();
  if (error || !created)
    return { ok: false, error: error?.message ?? "Could not start rehab session." };

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: sessionView(created, [], [], []),
    message: "Rehab session started",
  };
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
      error: "A rehab session is already in progress. Finish or discard it first.",
      conflict: true,
      activeSessionId: activeId,
    };
  }

  const { data: planDay } = await db
    .from("rehab_plan_days")
    .select("*, rehab_plan_phases(rehab_plans(*))")
    .eq("id", parsed.data.planDayId)
    .maybeSingle();
  const phase = planDay ? relationRow((planDay as DbRow).rehab_plan_phases) : null;
  const plan = phase ? relationRow(phase.rehab_plans) : null;
  if (!planDay || !plan) return { ok: false, error: "Plan day not found." };

  const { data: exercises } = await db
    .from("rehab_plan_exercises")
    .select("*, rehab_exercise_definitions(name), user_rehab_exercises(custom_name)")
    .eq("rehab_plan_day_id", planDay.id)
    .order("display_order");
  const exerciseIds = (exercises ?? []).map((e: DbRow) => e.id);
  const { data: prescriptions } = exerciseIds.length
    ? await db
        .from("rehab_set_prescriptions")
        .select("*")
        .in("rehab_plan_exercise_id", exerciseIds)
        .order("set_index")
    : { data: [] };

  const restrictions = await loadActiveRestrictions(db, String(plan.id));
  const clinicianSnapshot = await loadClinicianSnapshot(
    db,
    plan.clinician_source_id ? String(plan.clinician_source_id) : null,
  );

  const dailyRecord = await ensureDailyRecord(db, userId, parsed.data.localDate);
  if (!dailyRecord) return { ok: false, error: "Could not prepare today's record." };

  const sessionSnapshot = {
    planName: plan.name,
    phaseName: phase?.name ?? null,
    dayName: planDay.name,
    exercises: (exercises ?? []).map((e: DbRow) => ({
      id: e.id,
      name:
        relationRow(e.rehab_exercise_definitions)?.name ??
        relationRow(e.user_rehab_exercises)?.custom_name ??
        "Exercise",
    })),
  };

  const { data: session, error: sessionError } = await db
    .from("rehab_sessions")
    .insert({
      user_id: userId,
      daily_record_id: dailyRecord.id,
      source_plan_id: plan.id,
      source_plan_day_id: planDay.id,
      source_plan_version: numberValue(plan.version),
      title: String(planDay.name || plan.name),
      side: plan.side,
      status: "in_progress",
      clinician_source_snapshot: clinicianSnapshot ?? {},
      restriction_snapshot_json: restrictions,
      session_snapshot_json: sessionSnapshot,
    })
    .select("*")
    .single();
  if (sessionError || !session)
    return {
      ok: false,
      error: sessionError?.message ?? "Could not start rehab session.",
    };

  const createdExercises: DbRow[] = [];
  const createdSets: DbRow[] = [];
  let order = 0;
  for (const exercise of exercises ?? []) {
    const exerciseDef = relationRow(exercise.rehab_exercise_definitions);
    const userExercise = relationRow(exercise.user_rehab_exercises);
    const { data: sessionExercise, error: exerciseError } = await db
      .from("rehab_session_exercises")
      .insert({
        rehab_session_id: session.id,
        source_exercise_id: exercise.id,
        exercise_name_snapshot: String(
          exerciseDef?.name ?? userExercise?.custom_name ?? "Exercise",
        ),
        side: exercise.side,
        exercise_order: order,
        instructions_snapshot: exercise.instructions_snapshot,
        stop_conditions_snapshot: exercise.stop_conditions_snapshot,
      })
      .select("*")
      .single();
    if (exerciseError || !sessionExercise)
      return {
        ok: false,
        error: exerciseError?.message ?? "Could not materialize session exercises.",
      };
    createdExercises.push(sessionExercise);
    order += 1;

    const exercisePrescriptions = (prescriptions ?? [])
      .filter((p: DbRow) => p.rehab_plan_exercise_id === exercise.id)
      .sort((a: DbRow, b: DbRow) => numberValue(a.set_index) - numberValue(b.set_index));
    if (exercisePrescriptions.length) {
      const { data: setRows, error: setError } = await db
        .from("rehab_sets")
        .insert(
          exercisePrescriptions.map((p: DbRow) => ({
            rehab_session_exercise_id: sessionExercise.id,
            set_index: p.set_index,
            side: exercise.side,
            status: "pending",
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
    session: sessionView(session, createdExercises, createdSets, []),
    message: "Rehab session started",
  };
}

export async function startScheduledRehabSessionAction(
  input: unknown,
): Promise<SessionResult> {
  const parsed = startScheduledRehabSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid scheduled rehab." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: scheduled } = await db
    .from("scheduled_rehab_sessions")
    .select("*")
    .eq("id", parsed.data.scheduledRehabSessionId)
    .maybeSingle();
  if (!scheduled) return { ok: false, error: "Scheduled rehab not found." };

  const result = scheduled.rehab_plan_day_id
    ? await startFromPlanDayAction({
        planDayId: scheduled.rehab_plan_day_id,
        localDate: scheduled.local_date,
      })
    : await startBlankRehabSessionAction({
        title: scheduled.title,
        localDate: scheduled.local_date,
      });
  if (!result.ok) return result;

  await db
    .from("rehab_sessions")
    .update({ scheduled_rehab_session_id: scheduled.id })
    .eq("id", result.session.id);
  await db
    .from("scheduled_rehab_sessions")
    .update({ status: "started" })
    .eq("id", scheduled.id);

  revalidatePath(ROUTES.today);
  return {
    ...result,
    session: { ...result.session, scheduledRehabSessionId: String(scheduled.id) },
  };
}

async function resolveSetContext(db: RehabDb, setId: string) {
  const { data: setRow } = await db
    .from("rehab_sets")
    .select("*, rehab_session_exercises(rehab_session_id, source_exercise_id)")
    .eq("id", setId)
    .maybeSingle();
  if (!setRow) return null;
  const exercise = relationRow((setRow as DbRow).rehab_session_exercises);
  if (!exercise) return null;
  const sessionId = String(exercise.rehab_session_id);
  const { data: session } = await db
    .from("rehab_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;
  return { setRow, session, sessionId, sourceExerciseId: exercise.source_exercise_id };
}

async function painLimitForSet(db: RehabDb, setRow: DbRow): Promise<number | null> {
  const exercise = relationRow(setRow.rehab_session_exercises);
  if (!exercise?.source_exercise_id) return null;
  const { data: rx } = await db
    .from("rehab_set_prescriptions")
    .select("pain_limit")
    .eq("rehab_plan_exercise_id", exercise.source_exercise_id)
    .eq("set_index", setRow.set_index)
    .maybeSingle();
  return rx ? numberOrNull(rx.pain_limit) : null;
}

export async function completeSetAction(input: unknown): Promise<SessionResult> {
  const parsed = completeRehabSetSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid set." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const ctx = await resolveSetContext(db, parsed.data.setId);
  if (!ctx) return { ok: false, error: "Set not found." };
  const bump = await bumpSessionVersion(db, ctx.sessionId, parsed.data.version);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const now = new Date().toISOString();
  const { error: setError } = await db
    .from("rehab_sets")
    .update({
      status: "completed",
      completed_at: now,
      reps: parsed.data.reps ?? null,
      duration_seconds: parsed.data.durationSeconds ?? null,
      hold_seconds: parsed.data.holdSeconds ?? null,
      load: parsed.data.load ?? null,
      load_unit: parsed.data.loadUnit ?? null,
      assistance_type: parsed.data.assistanceType ?? null,
      assistance_amount: parsed.data.assistanceAmount ?? null,
      rom_achieved: parsed.data.romAchieved ?? null,
      pain_before: parsed.data.painBefore ?? null,
      pain_during: parsed.data.painDuring ?? null,
      pain_after: parsed.data.painAfter ?? null,
      swelling: parsed.data.swelling ?? null,
      instability: parsed.data.instability ?? null,
      confidence: parsed.data.confidence ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.setId);
  if (setError) return { ok: false, error: setError.message };

  const painLimit = await painLimitForSet(db, ctx.setRow);
  await insertAlertsForSet(db, userId, ctx.sessionId, parsed.data.setId, {
    painLimit,
    painBefore: parsed.data.painBefore ?? null,
    painDuring: parsed.data.painDuring ?? null,
    painAfter: parsed.data.painAfter ?? null,
    swelling: parsed.data.swelling ?? null,
    instability: parsed.data.instability ?? null,
    stopConditionTriggered: parsed.data.stopConditionTriggered ?? false,
    userStoppedSet: false,
  });

  revalidatePath(ROUTES.today);
  const session = await loadSessionView(db, ctx.session);
  return { ok: true, session, message: "Set completed" };
}

export async function skipSetAction(input: unknown): Promise<SessionResult> {
  const parsed = skipRehabSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid skip request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const ctx = await resolveSetContext(db, parsed.data.setId);
  if (!ctx) return { ok: false, error: "Set not found." };
  const bump = await bumpSessionVersion(db, ctx.sessionId, parsed.data.version);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("rehab_sets")
    .update({ status: "skipped", completed_at: new Date().toISOString() })
    .eq("id", parsed.data.setId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: await loadSessionView(db, ctx.session),
    message: "Set skipped",
  };
}

export async function stopSetAction(input: unknown): Promise<SessionResult> {
  const parsed = stopRehabSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid stop request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const ctx = await resolveSetContext(db, parsed.data.setId);
  if (!ctx) return { ok: false, error: "Set not found." };
  const bump = await bumpSessionVersion(db, ctx.sessionId, parsed.data.version);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("rehab_sets")
    .update({
      status: "stopped",
      completed_at: new Date().toISOString(),
      pain_before: parsed.data.painBefore ?? null,
      pain_during: parsed.data.painDuring ?? null,
      pain_after: parsed.data.painAfter ?? null,
      swelling: parsed.data.swelling ?? null,
      instability: parsed.data.instability ?? null,
      confidence: parsed.data.confidence ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.setId);
  if (error) return { ok: false, error: error.message };

  const painLimit = await painLimitForSet(db, ctx.setRow);
  await insertAlertsForSet(db, userId, ctx.sessionId, parsed.data.setId, {
    painLimit,
    painBefore: parsed.data.painBefore ?? null,
    painDuring: parsed.data.painDuring ?? null,
    painAfter: parsed.data.painAfter ?? null,
    swelling: parsed.data.swelling ?? null,
    instability: parsed.data.instability ?? null,
    stopConditionTriggered: parsed.data.stopConditionTriggered ?? false,
    userStoppedSet: true,
  });

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: await loadSessionView(db, ctx.session),
    message: "Set stopped",
  };
}

export async function recordObservationAction(input: unknown): Promise<SessionResult> {
  const parsed = recordObservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid observation." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: session } = await db
    .from("rehab_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };

  const bump = await bumpSessionVersion(db, parsed.data.sessionId, parsed.data.version);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db.from("rehab_session_observations").insert({
    rehab_session_id: parsed.data.sessionId,
    observation_type: parsed.data.observationType,
    value_numeric: parsed.data.valueNumeric ?? null,
    value_text: parsed.data.valueText ?? null,
    side: parsed.data.side ?? "not_applicable",
    body_area: parsed.data.bodyArea ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: await loadSessionView(db, session),
    message: "Observation recorded",
  };
}

export async function acknowledgeAlertAction(input: unknown): Promise<SessionResult> {
  const parsed = acknowledgeAlertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid acknowledgment." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: session } = await db
    .from("rehab_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };

  const bump = await bumpSessionVersion(db, parsed.data.sessionId, parsed.data.version);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("rehab_alert_events")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", parsed.data.alertId)
    .eq("rehab_session_id", parsed.data.sessionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: await loadSessionView(db, session),
    message: "Alert acknowledged",
  };
}

export async function finishSessionAction(input: unknown): Promise<SessionResult> {
  const parsed = finishRehabSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid finish request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data: session } = await db
    .from("rehab_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };

  const bump = await bumpSessionVersion(db, parsed.data.sessionId, parsed.data.version);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: exercises } = await db
    .from("rehab_session_exercises")
    .select("id")
    .eq("rehab_session_id", parsed.data.sessionId);
  const exerciseIds = (exercises ?? []).map((e: DbRow) => e.id);
  const { data: sets } = exerciseIds.length
    ? await db
        .from("rehab_sets")
        .select("status")
        .in("rehab_session_exercise_id", exerciseIds)
    : { data: [] };

  const completedAt = new Date().toISOString();
  const durationSeconds = sessionDurationSeconds(String(session.started_at), completedAt);
  const { error } = await db
    .from("rehab_sessions")
    .update({
      status: "completed",
      completed_at: completedAt,
      duration_seconds: durationSeconds,
    })
    .eq("id", parsed.data.sessionId);
  if (error) return { ok: false, error: error.message };

  const completedSetCount = (sets ?? []).filter(
    (s: DbRow) => s.status === "completed" || s.status === "stopped",
  ).length;
  await updateRehabDailyStatus(db, userId, session.daily_record_id, {
    status: "completed",
    summaryText: `${completedSetCount} set${completedSetCount === 1 ? "" : "s"} completed`,
  });

  if (session.scheduled_rehab_session_id) {
    await db
      .from("scheduled_rehab_sessions")
      .update({ status: "completed" })
      .eq("id", session.scheduled_rehab_session_id);
  }

  revalidatePath(ROUTES.today);
  revalidatePath(`/rehab/sessions/${parsed.data.sessionId}/summary`);
  return {
    ok: true,
    session: await loadSessionView(db, {
      ...session,
      status: "completed",
      completed_at: completedAt,
    }),
    message: "Rehab session finished",
  };
}

export async function discardSessionAction(input: unknown): Promise<SessionResult> {
  const parsed = discardRehabSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid discard request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: session } = await db
    .from("rehab_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };

  const bump = await bumpSessionVersion(db, parsed.data.sessionId, parsed.data.version);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("rehab_sessions")
    .update({ status: "discarded", completed_at: new Date().toISOString() })
    .eq("id", parsed.data.sessionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    session: await loadSessionView(db, { ...session, status: "discarded" }),
    message: "Rehab session discarded",
  };
}

export async function previousPerformanceAction(
  input: unknown,
): Promise<RehabPreviousPerformanceView[]> {
  const parsed = previousPerformanceSchema.safeParse(input);
  if (!parsed.success) return [];
  const context = await authenticatedDb();
  if (!context) return [];
  const { db } = context;

  let exerciseQuery = db.from("rehab_session_exercises").select("id");
  if (parsed.data.sourceExerciseId) {
    exerciseQuery = exerciseQuery.eq("source_exercise_id", parsed.data.sourceExerciseId);
  } else if (parsed.data.exerciseName) {
    exerciseQuery = exerciseQuery.eq("exercise_name_snapshot", parsed.data.exerciseName);
  } else {
    return [];
  }
  const { data: sessionExercises } = await exerciseQuery;
  const ids = (sessionExercises ?? []).map((row: DbRow) => row.id);
  if (!ids.length) return [];

  const { data: sets } = await db
    .from("rehab_sets")
    .select("*")
    .in("rehab_session_exercise_id", ids)
    .eq("set_index", parsed.data.setIndex)
    .in("status", ["completed", "stopped", "partial"])
    .order("completed_at", { ascending: false })
    .limit(parsed.data.limit ?? 3);
  if (!sets) return [];

  return sets.map((row: DbRow) => ({
    setIndex: numberValue(row.set_index),
    reps: numberOrNull(row.reps),
    durationSeconds: numberOrNull(row.duration_seconds),
    holdSeconds: numberOrNull(row.hold_seconds),
    assistanceType: (row.assistance_type as string | null) ?? null,
    assistanceAmount: (row.assistance_amount as string | null) ?? null,
    romAchieved: numberOrNull(row.rom_achieved),
    painBefore: numberOrNull(row.pain_before),
    painDuring: numberOrNull(row.pain_during),
    painAfter: numberOrNull(row.pain_after),
    swelling: row.swelling as RehabPreviousPerformanceView["swelling"],
    instability: row.instability as RehabPreviousPerformanceView["instability"],
    confidence: numberOrNull(row.confidence),
    notes: (row.notes as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
  }));
}

export async function loadSummaryAction(input: unknown): Promise<SummaryResult> {
  const parsed = loadSummarySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid summary request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: session } = await db
    .from("rehab_sessions")
    .select("*, daily_records(local_date)")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };

  const view = await loadSessionView(db, session);
  const allSets = view.exercises.flatMap((e) => e.sets);

  const { data: priorSession } = await db
    .from("rehab_sessions")
    .select("id")
    .eq("status", "completed")
    .lt("completed_at", session.completed_at ?? new Date().toISOString())
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let painTrendLabel: string | null = null;
  if (priorSession) {
    const priorView = await loadSessionView(db, priorSession);
    const priorSets = priorView.exercises.flatMap((e) => e.sets);
    painTrendLabel = comparePainTrend({
      previousMaxPain: sessionMaxPain(priorSets),
      currentMaxPain: sessionMaxPain(allSets),
    });
  }

  const dailyRecord = relationRow((session as DbRow).daily_records);
  const snapshot = session.session_snapshot_json as DbRow | null;
  return {
    ok: true,
    summary: {
      sessionId: view.id,
      title: view.title,
      localDate: dailyRecord ? String(dailyRecord.local_date) : "",
      planName: snapshot?.planName ? String(snapshot.planName) : null,
      phaseName: snapshot?.phaseName ? String(snapshot.phaseName) : null,
      exercises: view.exercises,
      alerts: view.alerts,
      observations: view.observations,
      averageConfidence: averageConfidence(allSets),
      painTrendLabel,
    },
  };
}
