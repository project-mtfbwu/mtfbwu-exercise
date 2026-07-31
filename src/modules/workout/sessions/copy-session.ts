/**
 * Pure materialization for "copy yesterday" / "repeat last session": turns a
 * performed session's shape into insert-ready rows for a brand-new session.
 * Deliberately produces no ids of its own — like `startFromPlanDayAction`,
 * the database assigns fresh primary keys on insert, so the copy can never
 * share an id (or therefore any mutation) with its source. Reps/load are
 * left null on the new sets; the source performance is preserved only as a
 * human-readable suggestion in each set's `notes`, never as a completed
 * value — see ADR 0007 (performed history must not fabricate completions).
 */

export type CopySessionSourceSet = {
  setIndex: number;
  setRole: string;
  reps: number | null;
  loadKg: number | null;
  loadUnit: string;
};

export type CopySessionSourceExercise = {
  exerciseDefinitionId: string | null;
  userExerciseId: string | null;
  exerciseName: string;
  blockType: string | null;
  blockOrder: number;
  sortOrder: number;
  sets: readonly CopySessionSourceSet[];
};

export type CopySessionSource = {
  title: string;
  workoutPlanId: string | null;
  workoutPlanDayId: string | null;
  sourcePlanVersion: number | null;
  snapshotJson: unknown;
  exercises: readonly CopySessionSourceExercise[];
};

export type CopySessionSetPlan = {
  setIndex: number;
  setRole: string;
  status: "pending";
  notes: string | null;
};

export type CopySessionExercisePlan = {
  exerciseDefinitionId: string | null;
  userExerciseId: string | null;
  displayNameSnapshot: string;
  blockTypeSnapshot: string | null;
  blockOrder: number;
  /** Position among the new session's exercises (always contiguous from 0). */
  sortOrder: number;
  /** Position within its block, copied from the source's `sortOrder`. */
  exerciseOrder: number;
  sets: CopySessionSetPlan[];
};

export type CopySessionPlan = {
  title: string;
  workoutPlanId: string | null;
  workoutPlanDayId: string | null;
  sourcePlanVersion: number | null;
  snapshotJson: unknown;
  exercises: CopySessionExercisePlan[];
};

/** e.g. `"Suggested: 8 reps @ 60 kg"` — omits whichever half was not recorded. */
export function formatSetSuggestion(
  reps: number | null,
  loadKg: number | null,
  loadUnit: string,
): string | null {
  if (reps === null && loadKg === null) return null;
  const parts: string[] = [];
  if (reps !== null) parts.push(`${reps} rep${reps === 1 ? "" : "s"}`);
  if (loadKg !== null) {
    const unitLabel =
      loadUnit === "bodyweight" || loadUnit === "assisted_bodyweight" ? "kg" : loadUnit;
    parts.push(`@ ${loadKg} ${unitLabel}`);
  }
  return `Suggested: ${parts.join(" ")}`;
}

export function buildCopySessionPlan(source: CopySessionSource): CopySessionPlan {
  return {
    title: source.title,
    workoutPlanId: source.workoutPlanId,
    workoutPlanDayId: source.workoutPlanDayId,
    sourcePlanVersion: source.sourcePlanVersion,
    snapshotJson: source.snapshotJson,
    exercises: source.exercises.map((exercise, index) => ({
      exerciseDefinitionId: exercise.exerciseDefinitionId,
      userExerciseId: exercise.userExerciseId,
      displayNameSnapshot: exercise.exerciseName,
      blockTypeSnapshot: exercise.blockType,
      blockOrder: exercise.blockOrder,
      sortOrder: index,
      exerciseOrder: exercise.sortOrder,
      sets: exercise.sets.map((set) => ({
        setIndex: set.setIndex,
        setRole: set.setRole,
        status: "pending" as const,
        notes: formatSetSuggestion(set.reps, set.loadKg, set.loadUnit),
      })),
    })),
  };
}
