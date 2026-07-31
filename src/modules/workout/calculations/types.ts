/**
 * A `load` value is always paired with the unit it was recorded in. Strength
 * calculations normalize to kilograms; `bodyweight` / `assisted_bodyweight`
 * carry no numeric load of their own here — the caller resolves the user's
 * bodyweight and folds it into `load` before these sets reach volume math.
 */
export type LoadUnit = "kg" | "lb" | "bodyweight" | "assisted_bodyweight";

export type DistanceUnit = "m" | "km" | "mi" | "yd";

/**
 * Dumbbell work is ambiguous unless the logging convention is explicit:
 * - `per_hand` — `load` is the weight of a single dumbbell; both hands work
 *   simultaneously, so total lifted load is `load * 2`.
 * - `total_combined` — `load` already represents the combined total (e.g. a
 *   single heavy dumbbell, or a user who prefers to log the sum).
 */
export type DumbbellSemantics = "per_hand" | "total_combined";

export const SET_KINDS = ["strength", "timed", "distance"] as const;
export type SetKind = (typeof SET_KINDS)[number];

export const SET_COMPLETION_STATUSES = ["completed", "partial", "skipped"] as const;
export type SetCompletionStatus = (typeof SET_COMPLETION_STATUSES)[number];

/**
 * Minimal shape volume/duration calculations need from a performed set.
 * Deliberately narrower than a persisted `performed_sets` row so pure
 * calculation functions stay decoupled from storage/query shapes.
 */
export interface PerformedSetLike {
  kind: SetKind;
  status: SetCompletionStatus;
  /** Reps actually performed. Irrelevant for `timed`/`distance` sets. */
  reps: number | null;
  /**
   * Load already resolved to a single comparable number in `loadUnit`. For
   * `bodyweight`/`assisted_bodyweight` sets this is the caller-resolved
   * effective load (bodyweight plus/minus any added or assisted weight), or
   * `null` when the caller has not resolved it yet — such sets contribute no
   * volume until resolved.
   */
  load: number | null;
  loadUnit: LoadUnit;
  /** Single-limb/single-side work (e.g. Bulgarian split squat, single-arm row). */
  isUnilateral?: boolean;
  /** Only meaningful when the set's equipment is a pair of dumbbells. */
  dumbbellSemantics?: DumbbellSemantics;
  /** Seconds held/worked for `timed` sets (planks, isometrics, farmer carries). */
  durationSeconds?: number | null;
  /** Distance covered for `distance` sets (rows, runs, bike). */
  distance?: number | null;
  distanceUnit?: DistanceUnit;
}

/**
 * Sets for a single exercise within a session, grouped so callers can compute
 * per-exercise volume and roll several exercises up into a session total.
 */
export interface VolumeInput {
  exerciseId?: string;
  sets: readonly PerformedSetLike[];
}

export interface SetCountSummary {
  totalSets: number;
  completedSets: number;
}
