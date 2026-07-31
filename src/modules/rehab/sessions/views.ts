import type {
  RehabAlertType,
  RehabAlertView,
  RehabClinicianSourceView,
  RehabInstabilityLevel,
  RehabPerformedSetView,
  RehabRestrictionSeverity,
  RehabRestrictionView,
  RehabSessionExerciseView,
  RehabSessionStatus,
  RehabSessionView,
  RehabSetStatus,
  RehabSide,
  RehabSwellingLevel,
} from "@/modules/rehab/types";
import {
  clinicianSourceView,
  numberOrNull,
  numberValue,
  observationView,
  restrictionView,
} from "@/modules/rehab/plans/views";

export type DbRow = Record<string, unknown>;

export function performedSetView(
  row: DbRow,
  painLimit: number | null = null,
): RehabPerformedSetView {
  return {
    id: String(row.id),
    setIndex: numberValue(row.set_index),
    status: row.status as RehabSetStatus,
    side: row.side as RehabSide,
    reps: numberOrNull(row.reps),
    durationSeconds: numberOrNull(row.duration_seconds),
    holdSeconds: numberOrNull(row.hold_seconds),
    load: numberOrNull(row.load),
    loadUnit: (row.load_unit as string | null) ?? null,
    assistanceType: (row.assistance_type as string | null) ?? null,
    assistanceAmount: (row.assistance_amount as string | null) ?? null,
    romAchieved: numberOrNull(row.rom_achieved),
    painBefore: numberOrNull(row.pain_before),
    painDuring: numberOrNull(row.pain_during),
    painAfter: numberOrNull(row.pain_after),
    swelling: (row.swelling as RehabSwellingLevel | null) ?? null,
    instability: (row.instability as RehabInstabilityLevel | null) ?? null,
    confidence: numberOrNull(row.confidence),
    notes: (row.notes as string | null) ?? null,
    painLimit,
  };
}

export function sessionExerciseView(
  row: DbRow,
  sets: readonly DbRow[],
  painLimitsBySetIndex: ReadonlyMap<number, number | null> = new Map(),
): RehabSessionExerciseView {
  return {
    id: String(row.id),
    sourceExerciseId: row.source_exercise_id ? String(row.source_exercise_id) : null,
    exerciseName: String(row.exercise_name_snapshot),
    side: row.side as RehabSide,
    exerciseOrder: numberValue(row.exercise_order),
    instructionsSnapshot: String(row.instructions_snapshot ?? ""),
    stopConditionsSnapshot: String(row.stop_conditions_snapshot ?? ""),
    notes: (row.notes as string | null) ?? null,
    sets: sets
      .filter((s) => s.rehab_session_exercise_id === row.id)
      .map((s) =>
        performedSetView(s, painLimitsBySetIndex.get(numberValue(s.set_index)) ?? null),
      )
      .sort((a, b) => a.setIndex - b.setIndex),
  };
}

export function alertView(row: DbRow): RehabAlertView {
  return {
    id: String(row.id),
    alertType: row.alert_type as RehabAlertType,
    severity: row.severity as RehabRestrictionSeverity,
    messageSnapshot: String(row.message_snapshot),
    rehabSetId: row.rehab_set_id ? String(row.rehab_set_id) : null,
    acknowledgedAt: (row.acknowledged_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function parseClinicianSnapshot(value: unknown): RehabClinicianSourceView | null {
  if (!value || typeof value !== "object") return null;
  const row = value as DbRow;
  if (!row.id) return null;
  return clinicianSourceView(row);
}

function parseRestrictions(value: unknown): RehabRestrictionView[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => restrictionView(item as DbRow));
}

export function sessionView(
  row: DbRow,
  exercises: DbRow[],
  sets: DbRow[],
  alerts: DbRow[],
  observations: DbRow[] = [],
): RehabSessionView {
  const unacknowledgedAlertCount = alerts.filter((a) => !a.acknowledged_at).length;
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as RehabSessionStatus,
    version: numberValue(row.version),
    side: row.side as RehabSide,
    startedAt: String(row.started_at),
    completedAt: (row.completed_at as string | null) ?? null,
    durationSeconds: numberOrNull(row.duration_seconds),
    sourcePlanId: row.source_plan_id ? String(row.source_plan_id) : null,
    sourcePlanDayId: row.source_plan_day_id ? String(row.source_plan_day_id) : null,
    sourcePlanVersion: numberOrNull(row.source_plan_version),
    scheduledRehabSessionId: row.scheduled_rehab_session_id
      ? String(row.scheduled_rehab_session_id)
      : null,
    dailyRecordId: String(row.daily_record_id),
    clinicianSourceSnapshot: parseClinicianSnapshot(row.clinician_source_snapshot),
    restrictions: parseRestrictions(row.restriction_snapshot_json),
    alerts: alerts.map(alertView),
    observations: observations.map(observationView),
    unacknowledgedAlertCount,
    progressionPaused: unacknowledgedAlertCount > 0,
    exercises: exercises
      .slice()
      .sort((a, b) => numberValue(a.exercise_order) - numberValue(b.exercise_order))
      .map((e) => sessionExerciseView(e, sets)),
  };
}
