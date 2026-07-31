/**
 * Shared plan-tree row-to-view mappers used by both `sessions/actions.ts`
 * (starting a session snapshots a plan day) and `plans/actions.ts` (the plan
 * editor). Plain data mapping only — no Supabase calls, so this file can be
 * imported from either "use server" module without pulling in a client.
 */

import type {
  PlanBlockExerciseView,
  PlanBlockView,
  PlanDayView,
  PlanSummaryView,
  SetPrescriptionView,
  WorkoutBlockType,
  WorkoutSetRole,
} from "@/modules/workout/sessions/types";

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

export function prescriptionView(row: DbRow): SetPrescriptionView {
  return {
    id: String(row.id),
    setIndex: numberValue(row.set_index),
    setRole: row.set_role as WorkoutSetRole,
    completionRule: String(row.completion_rule),
    targetRepsMin: numberOrNull(row.target_reps_min),
    targetRepsMax: numberOrNull(row.target_reps_max),
    targetWeightKg: numberOrNull(row.target_weight_kg),
    targetDurationSeconds: numberOrNull(row.target_duration_seconds),
    targetDistanceMeters: numberOrNull(row.target_distance_meters),
    targetRpe: numberOrNull(row.target_rpe),
    targetRir: numberOrNull(row.target_rir),
    tempoEccentricSeconds: numberOrNull(row.tempo_eccentric_seconds),
    tempoPauseBottomSeconds: numberOrNull(row.tempo_pause_bottom_seconds),
    tempoConcentricSeconds: numberOrNull(row.tempo_concentric_seconds),
    tempoPauseTopSeconds: numberOrNull(row.tempo_pause_top_seconds),
    restSeconds: numberOrNull(row.rest_seconds),
    notes: (row.notes as string | null) ?? null,
  };
}

export function blockExerciseView(
  row: DbRow,
  prescriptions: readonly DbRow[],
): PlanBlockExerciseView {
  const exerciseDef = relationRow(row.exercise_definitions);
  const userExercise = relationRow(row.user_exercises);
  return {
    id: String(row.id),
    exerciseDefinitionId: row.exercise_definition_id
      ? String(row.exercise_definition_id)
      : null,
    userExerciseId: row.user_exercise_id ? String(row.user_exercise_id) : null,
    exerciseName: String(exerciseDef?.name ?? userExercise?.custom_name ?? "Exercise"),
    sortOrder: numberValue(row.sort_order),
    prescriptions: prescriptions
      .filter((p) => p.workout_block_exercise_id === row.id)
      .map(prescriptionView)
      .sort((a, b) => a.setIndex - b.setIndex),
  };
}

export function blockView(
  row: DbRow,
  blockExercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): PlanBlockView {
  return {
    id: String(row.id),
    blockType: row.block_type as WorkoutBlockType,
    title: (row.title as string | null) ?? null,
    sortOrder: numberValue(row.sort_order),
    rounds: numberOrNull(row.rounds),
    restSeconds: numberOrNull(row.rest_seconds),
    transitionSeconds: numberOrNull(row.transition_seconds),
    exercises: blockExercises
      .filter((be) => be.workout_block_id === row.id)
      .map((be) => blockExerciseView(be, prescriptions))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function planDayView(
  row: DbRow,
  blocks: readonly DbRow[],
  blockExercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): PlanDayView {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    dayOfWeek: numberOrNull(row.day_of_week),
    sortOrder: numberValue(row.sort_order),
    restDay: Boolean(row.rest_day),
    blocks: blocks
      .filter((b) => b.workout_plan_day_id === row.id)
      .map((b) => blockView(b, blockExercises, prescriptions))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function planSummaryView(
  plan: DbRow,
  days: readonly DbRow[],
  blocks: readonly DbRow[] = [],
  blockExercises: readonly DbRow[] = [],
  prescriptions: readonly DbRow[] = [],
): PlanSummaryView {
  return {
    id: String(plan.id),
    name: String(plan.name),
    description: (plan.description as string | null) ?? null,
    objective: (plan.objective as string | null) ?? null,
    active: Boolean(plan.active),
    version: numberValue(plan.version),
    days: days
      .map((d) => planDayView(d, blocks, blockExercises, prescriptions))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
