import type {
  RehabClinicianSourceView,
  RehabObservationType,
  RehabPlanDayView,
  RehabPlanExerciseView,
  RehabPlanPhaseView,
  RehabPlanSummaryView,
  RehabPrescriptionView,
  RehabRestrictionView,
  RehabCompletionRule,
  RehabPhaseType,
  RehabRestrictionSeverity,
  RehabRestrictionType,
  RehabSide,
  RehabClinicianSourceType,
  RehabObservationView,
} from "@/modules/rehab/types";

export type DbRow = Record<string, unknown>;

export function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function relationRow(value: unknown): DbRow | null {
  if (Array.isArray(value)) return (value[0] as DbRow | null) ?? null;
  return (value as DbRow | null) ?? null;
}

export function prescriptionView(row: DbRow): RehabPrescriptionView {
  return {
    id: String(row.id),
    setIndex: numberValue(row.set_index),
    completionRule: row.completion_rule as RehabCompletionRule,
    targetReps: numberOrNull(row.target_reps),
    targetDurationSeconds: numberOrNull(row.target_duration_seconds),
    targetHoldSeconds: numberOrNull(row.target_hold_seconds),
    targetLoad: numberOrNull(row.target_load),
    targetLoadUnit: (row.target_load_unit as string | null) ?? null,
    tempoEccentricSeconds: numberOrNull(row.tempo_eccentric_seconds),
    tempoPauseBottomSeconds: numberOrNull(row.tempo_pause_bottom_seconds),
    tempoConcentricSeconds: numberOrNull(row.tempo_concentric_seconds),
    tempoPauseTopSeconds: numberOrNull(row.tempo_pause_top_seconds),
    restSeconds: numberOrNull(row.rest_seconds),
    assistanceType: (row.assistance_type as string | null) ?? null,
    assistanceAmount: (row.assistance_amount as string | null) ?? null,
    romMinDegrees: numberOrNull(row.rom_min_degrees),
    romMaxDegrees: numberOrNull(row.rom_max_degrees),
    painLimit: numberOrNull(row.pain_limit),
    notes: (row.notes as string | null) ?? null,
  };
}

export function planExerciseView(
  row: DbRow,
  prescriptions: readonly DbRow[],
): RehabPlanExerciseView {
  const exerciseDef = relationRow(row.rehab_exercise_definitions);
  const userExercise = relationRow(row.user_rehab_exercises);
  return {
    id: String(row.id),
    rehabExerciseDefinitionId: row.rehab_exercise_definition_id
      ? String(row.rehab_exercise_definition_id)
      : null,
    userRehabExerciseId: row.user_rehab_exercise_id
      ? String(row.user_rehab_exercise_id)
      : null,
    exerciseName: String(exerciseDef?.name ?? userExercise?.custom_name ?? "Exercise"),
    displayOrder: numberValue(row.display_order),
    side: row.side as RehabSide,
    instructionsSnapshot: String(row.instructions_snapshot ?? ""),
    stopConditionsSnapshot: String(row.stop_conditions_snapshot ?? ""),
    prescriptions: prescriptions
      .filter((p) => p.rehab_plan_exercise_id === row.id)
      .map(prescriptionView)
      .sort((a, b) => a.setIndex - b.setIndex),
  };
}

export function planDayView(
  row: DbRow,
  exercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): RehabPlanDayView {
  return {
    id: String(row.id),
    name: String(row.name),
    dayIndex: numberValue(row.day_index),
    description: (row.description as string | null) ?? null,
    estimatedDurationMinutes: numberOrNull(row.estimated_duration_minutes),
    exercises: exercises
      .filter((e) => e.rehab_plan_day_id === row.id)
      .map((e) => planExerciseView(e, prescriptions))
      .sort((a, b) => a.displayOrder - b.displayOrder),
  };
}

export function planPhaseView(
  row: DbRow,
  days: readonly DbRow[],
  exercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): RehabPlanPhaseView {
  return {
    id: String(row.id),
    name: String(row.name),
    phaseType: row.phase_type as RehabPhaseType,
    displayOrder: numberValue(row.display_order),
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    clinicianNotes: (row.clinician_notes as string | null) ?? null,
    days: days
      .filter((d) => d.rehab_plan_phase_id === row.id)
      .map((d) => planDayView(d, exercises, prescriptions))
      .sort((a, b) => a.dayIndex - b.dayIndex),
  };
}

export function restrictionView(row: DbRow): RehabRestrictionView {
  return {
    id: String(row.id),
    restrictionType: row.restriction_type as RehabRestrictionType,
    bodyAreaId: row.body_area_id ? String(row.body_area_id) : null,
    side: row.side as RehabSide,
    valueText: String(row.value_text),
    numericMin: numberOrNull(row.numeric_min),
    numericMax: numberOrNull(row.numeric_max),
    unit: (row.unit as string | null) ?? null,
    severity: row.severity as RehabRestrictionSeverity,
    source: String(row.source ?? "user"),
    effectiveFrom: String(row.effective_from),
    effectiveUntil: (row.effective_until as string | null) ?? null,
    active: Boolean(row.active),
    displayOrder: numberValue(row.display_order),
  };
}

export function observationView(row: DbRow): RehabObservationView {
  return {
    id: String(row.id),
    observationType: row.observation_type as RehabObservationType,
    valueNumeric: numberOrNull(row.value_numeric),
    valueText: (row.value_text as string | null) ?? null,
    side: row.side as RehabSide,
    bodyArea: (row.body_area as string | null) ?? null,
    recordedAt: String(row.recorded_at ?? row.created_at),
  };
}

export function clinicianSourceView(row: DbRow): RehabClinicianSourceView {
  return {
    id: String(row.id),
    sourceType: row.source_type as RehabClinicianSourceType,
    clinicianName: (row.clinician_name as string | null) ?? null,
    clinicName: (row.clinic_name as string | null) ?? null,
    documentTitle: (row.document_title as string | null) ?? null,
    documentDate: (row.document_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    confirmedByUser: Boolean(row.confirmed_by_user),
  };
}

export function planSummaryView(
  plan: DbRow,
  phases: readonly DbRow[],
  days: readonly DbRow[],
  exercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
  restrictions: readonly DbRow[],
): RehabPlanSummaryView {
  return {
    id: String(plan.id),
    name: String(plan.name),
    description: (plan.description as string | null) ?? null,
    objective: (plan.objective as string | null) ?? null,
    side: plan.side as RehabSide,
    bodyAreaId: plan.body_area_id ? String(plan.body_area_id) : null,
    clinicianSourceId: plan.clinician_source_id ? String(plan.clinician_source_id) : null,
    active: Boolean(plan.active),
    version: numberValue(plan.version),
    phases: phases
      .filter((p) => p.rehab_plan_id === plan.id)
      .map((p) => planPhaseView(p, days, exercises, prescriptions))
      .sort((a, b) => a.displayOrder - b.displayOrder),
    restrictions: restrictions
      .filter((r) => r.rehab_plan_id === plan.id)
      .map(restrictionView)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  };
}
