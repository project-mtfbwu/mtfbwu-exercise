import type {
  DistanceUnit,
  DumbbellSemantics,
  LoadUnit,
  SetCompletionStatus,
  SetKind,
} from "@/modules/workout/calculations";

export const WORKOUT_PROTOCOLS = ["straight", "superset", "circuit", "dropset"] as const;
export type WorkoutProtocol = (typeof WORKOUT_PROTOCOLS)[number];

export const WORKOUT_SESSION_STATUSES = [
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type WorkoutSessionStatus = (typeof WORKOUT_SESSION_STATUSES)[number];

export type ExerciseSummaryView = {
  id: string;
  slug: string;
  name: string;
  equipment: string | null;
  primaryMuscles: readonly string[];
};

/** A single prescribed set target within a template item, e.g. `{reps, weight, rir, rest_sec}`. */
export type TemplateSetTarget = {
  targetReps: number | null;
  targetLoad: number | null;
  loadUnit: LoadUnit;
  targetRir: number | null;
  restSeconds: number | null;
};

export type WorkoutTemplateItemView = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  /** Links items sharing a superset/circuit; null for straight sets. */
  groupId: string | null;
  protocol: WorkoutProtocol;
  targetSets: TemplateSetTarget[];
};

export type WorkoutTemplateView = {
  id: string;
  name: string;
  notes: string | null;
  items: WorkoutTemplateItemView[];
};

/**
 * What a user actually did for one set. Editing a template never rewrites
 * this — sessions may snapshot exercise names/targets at start time.
 */
export type PerformedSetView = {
  id: string;
  setIndex: number;
  kind: SetKind;
  status: SetCompletionStatus;
  reps: number | null;
  load: number | null;
  loadUnit: LoadUnit;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: DistanceUnit | null;
  rir: number | null;
  isUnilateral: boolean;
  dumbbellSemantics: DumbbellSemantics | null;
};

export type WorkoutSessionItemView = {
  id: string;
  exerciseId: string;
  /** Denormalized at session start so catalog edits don't rewrite history. */
  exerciseName: string;
  sortOrder: number;
  groupId: string | null;
  protocol: WorkoutProtocol;
  sets: PerformedSetView[];
};

export type WorkoutSessionView = {
  id: string;
  templateId: string | null;
  startedAt: string;
  completedAt: string | null;
  status: WorkoutSessionStatus;
  notes: string | null;
  perceivedEffort: number | null;
  items: WorkoutSessionItemView[];
};
