import type { PerformedSetLike, SetCountSummary, VolumeInput } from "./types";

/**
 * Volume for one set: `load * reps`, doubled only when the set is explicitly
 * logged as `per_hand` dumbbell work (both dumbbells worked at once).
 *
 * Only `strength` sets with `completed` or `partial` status count — the user
 * did perform reps against a load even if fewer than planned. `skipped` sets
 * contribute nothing. `timed` and `distance` sets have no load*reps volume
 * and are always excluded (see `duration.ts` for time-based totals).
 *
 * Unilateral sets are NOT auto-doubled: logging one leg at a time does not
 * imply the load was lifted twice. Only `dumbbellSemantics: "per_hand"`
 * triggers doubling, regardless of `isUnilateral`.
 */
export function setVolume(set: PerformedSetLike): number {
  if (set.kind !== "strength") return 0;
  if (set.status === "skipped") return 0;
  if (set.load === null || set.reps === null) return 0;
  if (!Number.isFinite(set.load) || !Number.isFinite(set.reps)) return 0;
  if (set.load <= 0 || set.reps <= 0) return 0;

  const loadMultiplier = set.dumbbellSemantics === "per_hand" ? 2 : 1;
  return set.load * loadMultiplier * set.reps;
}

/**
 * Sums volume across a single exercise's sets, including drop sets (each
 * drop is its own set in the array, so successive reduced-load sets simply
 * add together).
 */
export function exerciseVolume(sets: readonly PerformedSetLike[]): number {
  return sets.reduce((total, set) => total + setVolume(set), 0);
}

/** Sums `exerciseVolume` across every exercise performed in a session. */
export function totalSessionVolume(exercises: readonly VolumeInput[]): number {
  return exercises.reduce((total, exercise) => total + exerciseVolume(exercise.sets), 0);
}

export function countSets(sets: readonly PerformedSetLike[]): number {
  return sets.length;
}

export function countCompletedSets(sets: readonly PerformedSetLike[]): number {
  return sets.filter((set) => set.status === "completed").length;
}

export function summarizeSetCounts(sets: readonly PerformedSetLike[]): SetCountSummary {
  return {
    totalSets: countSets(sets),
    completedSets: countCompletedSets(sets),
  };
}
