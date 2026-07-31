/**
 * View types for the persisted workout engine (plans/days/blocks/sessions).
 * These intentionally do NOT reuse `@/modules/workout/types` — that file
 * predates the Increment 6 migrations and its enums (`WorkoutProtocol`,
 * `WorkoutSessionStatus`, …) do not match the shipped schema (e.g. the
 * database uses `workout_session_status` = `in_progress | paused | completed
 * | discarded`, not `in_progress | completed | cancelled`). See the
 * schema-mismatch notes in `AGENTS.md`-adjacent PR notes for detail.
 */

export const WORKOUT_BLOCK_TYPES = [
  "warmup",
  "straight_sets",
  "superset",
  "triset",
  "circuit",
  "amrap",
  "emom",
  "for_time",
  "drop_set",
  "stripping_set",
  "one_to_ten",
  "cardio",
  "mobility",
  "cooldown",
  "custom",
] as const;
export type WorkoutBlockType = (typeof WORKOUT_BLOCK_TYPES)[number];

export const WORKOUT_SET_ROLES = [
  "warmup",
  "working",
  "top_set",
  "backoff",
  "drop_set",
  "drop",
  "amrap",
  "max_effort",
  "failure",
  "timed_hold",
  "technique",
] as const;
export type WorkoutSetRole = (typeof WORKOUT_SET_ROLES)[number];

export const WORKOUT_SET_STATUSES = [
  "pending",
  "completed",
  "skipped",
  "failed",
  "partial",
] as const;
export type WorkoutSetStatus = (typeof WORKOUT_SET_STATUSES)[number];

export const WORKOUT_SESSION_STATUSES = [
  "in_progress",
  "paused",
  "completed",
  "discarded",
] as const;
export type WorkoutSessionStatus = (typeof WORKOUT_SESSION_STATUSES)[number];

export const WORKOUT_LOAD_UNITS = [
  "kg",
  "lb",
  "bodyweight",
  "assisted_bodyweight",
] as const;
export type WorkoutLoadUnit = (typeof WORKOUT_LOAD_UNITS)[number];

export type ExerciseCatalogView = {
  id: string;
  stableKey: string;
  name: string;
  exerciseType: string;
  equipmentKey: string | null;
  unilateral: boolean;
  bodyweight: boolean;
  timed: boolean;
  distanceBased: boolean;
};

export type SetPrescriptionView = {
  id: string;
  setIndex: number;
  setRole: WorkoutSetRole;
  completionRule: string;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeightKg: number | null;
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
  targetRpe: number | null;
  targetRir: number | null;
  /** Seconds per tempo phase: lowering / pause at bottom / lifting / pause at top. */
  tempoEccentricSeconds: number | null;
  tempoPauseBottomSeconds: number | null;
  tempoConcentricSeconds: number | null;
  tempoPauseTopSeconds: number | null;
  restSeconds: number | null;
  notes: string | null;
};

export type PlanBlockExerciseView = {
  id: string;
  exerciseDefinitionId: string | null;
  userExerciseId: string | null;
  exerciseName: string;
  sortOrder: number;
  prescriptions: SetPrescriptionView[];
};

export type PlanBlockView = {
  id: string;
  blockType: WorkoutBlockType;
  title: string | null;
  sortOrder: number;
  /** Round count for circuit/amrap/emom-style blocks. */
  rounds: number | null;
  /** Block-level rest default; per-set overrides live on the prescription. */
  restSeconds: number | null;
  /** Rest between exercises within the block (supersets/circuits). */
  transitionSeconds: number | null;
  exercises: PlanBlockExerciseView[];
};

export type PlanDayView = {
  id: string;
  name: string;
  dayOfWeek: number | null;
  sortOrder: number;
  restDay: boolean;
  blocks: PlanBlockView[];
};

export type PlanSummaryView = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  active: boolean;
  version: number;
  days: PlanDayView[];
};

export type PerformedSetView = {
  id: string;
  setIndex: number;
  setRole: WorkoutSetRole;
  status: WorkoutSetStatus;
  reps: number | null;
  loadKg: number | null;
  loadUnit: WorkoutLoadUnit;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rpe: number | null;
  rir: number | null;
  /** Free text, e.g. a copied/repeated session's "Suggested: 8 reps @ 60 kg". */
  notes: string | null;
};

export type WorkoutSessionExerciseView = {
  id: string;
  exerciseDefinitionId: string | null;
  userExerciseId: string | null;
  exerciseName: string;
  blockType: WorkoutBlockType | null;
  blockOrder: number;
  sortOrder: number;
  sets: PerformedSetView[];
};

export type WorkoutSessionView = {
  id: string;
  title: string;
  status: WorkoutSessionStatus;
  /** Optimistic-concurrency guard. `workout_sets` has no version column of
   * its own, so set-level mutations (`completeSetAction`/`skipSetAction`)
   * check and bump this session-level version instead. */
  version: number;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  totalVolume: number | null;
  sessionRpe: number | null;
  notes: string | null;
  workoutPlanId: string | null;
  workoutPlanDayId: string | null;
  scheduledWorkoutId: string | null;
  exercises: WorkoutSessionExerciseView[];
};

export type PerformedSetHistoryView = {
  id: string;
  reps: number | null;
  loadKg: number | null;
  loadUnit: WorkoutLoadUnit;
  durationSeconds: number | null;
  rpe: number | null;
  completedAt: string | null;
};

export type ScheduledWorkoutView = {
  id: string;
  workoutPlanId: string | null;
  workoutPlanDayId: string | null;
  localDate: string;
  title: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Personal records
// ---------------------------------------------------------------------------

export const PERSONAL_RECORD_TYPES = ["estimated_1rm", "max_load", "max_reps"] as const;
export type PersonalRecordType = (typeof PERSONAL_RECORD_TYPES)[number];

export const PERSONAL_RECORD_STATUSES = ["pending", "confirmed", "dismissed"] as const;
export type PersonalRecordStatus = (typeof PERSONAL_RECORD_STATUSES)[number];

/**
 * `personal_records` has no `estimation_method` column of its own — that
 * (and the prior-best value it beat) is encoded into the row's free-text
 * `notes` column via `encodePersonalRecordMeta`/`decodePersonalRecordMeta`
 * in `personal-record-candidates.ts`, avoiding a schema change for what is
 * purely presentational context.
 */
export type PersonalRecordView = {
  id: string;
  exerciseDefinitionId: string | null;
  userExerciseId: string | null;
  exerciseLabel: string;
  recordType: PersonalRecordType | string;
  value: number;
  unit: string;
  achievedAt: string;
  workoutSetId: string | null;
  status: PersonalRecordStatus;
  estimationMethod: "epley" | "brzycki" | null;
  priorBest: number | null;
};

// ---------------------------------------------------------------------------
// Session start options (copy yesterday / repeat last / scheduled / resume)
// ---------------------------------------------------------------------------

export type SessionStartOptionSummary = { id: string; title: string };
export type CompletedSessionStartOptionSummary = SessionStartOptionSummary & {
  completedAt: string;
};

export type SessionStartOptionsView = {
  scheduled: SessionStartOptionSummary | null;
  lastCompleted: CompletedSessionStartOptionSummary | null;
  yesterdayCompleted: CompletedSessionStartOptionSummary | null;
  activeSession: SessionStartOptionSummary | null;
};
