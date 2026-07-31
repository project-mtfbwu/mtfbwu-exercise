import type { WorkoutBlockType, WorkoutSetRole } from "@/modules/workout/sessions/types";

export const BLOCK_TYPE_LABELS: Record<WorkoutBlockType, string> = {
  warmup: "Warm-up",
  straight_sets: "Straight sets",
  superset: "Superset",
  triset: "Tri-set",
  circuit: "Circuit",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For time",
  drop_set: "Drop set",
  stripping_set: "Stripping set",
  one_to_ten: "1–10",
  cardio: "Cardio",
  mobility: "Mobility",
  cooldown: "Cooldown",
  custom: "Custom",
};

export const SET_ROLE_LABELS: Record<WorkoutSetRole, string> = {
  warmup: "Warm-up",
  working: "Working",
  top_set: "Top set",
  backoff: "Backoff",
  drop_set: "Drop",
  drop: "Drop",
  amrap: "AMRAP",
  max_effort: "Max effort",
  failure: "Failure",
  timed_hold: "Timed hold",
  technique: "Technique",
};

/** Block types where a "rounds" count is meaningful (circuits/timed formats). */
export const ROUNDS_BLOCK_TYPES: readonly WorkoutBlockType[] = [
  "superset",
  "triset",
  "circuit",
  "amrap",
  "emom",
];

/** Block types where rest-between-exercises ("transition") is meaningful. */
export const TRANSITION_BLOCK_TYPES: readonly WorkoutBlockType[] = [
  "superset",
  "triset",
  "circuit",
];

/** Short, non-clinical helper copy for block types that need extra explanation. */
export function blockTypeGuidance(blockType: WorkoutBlockType): string | null {
  switch (blockType) {
    case "drop_set":
      return 'Drop set: log each drop as its own prescription row (set role "Drop"), reducing load each time.';
    case "stripping_set":
      return "Stripping set: work to failure, strip weight, and continue without rest until the bar is empty. Add one row per strip.";
    case "one_to_ten":
      return "1–10 method: after a near-max single, ladder reps 2 → 10, resting between rungs as needed.";
    case "cardio":
      return "Cardio block: prescribe duration and/or distance on each set rather than reps and load.";
    case "amrap":
      return "AMRAP: set the block's round/time budget, then leave reps open — log actual reps during the session.";
    case "emom":
      return "EMOM: set rounds to the number of minutes; each round's prescription is the per-minute work.";
    default:
      return null;
  }
}

/** Reorders `ids` by moving the item at `index` by `delta` (−1 up, +1 down); no-op past either end. */
export function moveIds(ids: readonly string[], index: number, delta: number): string[] {
  const target = index + delta;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) {
    return [...ids];
  }
  const next = [...ids];
  const [item] = next.splice(index, 1);
  if (item === undefined) return [...ids];
  next.splice(target, 0, item);
  return next;
}

/** Parses an optional numeric input string; empty string maps to `undefined` (no change), not `0`. */
export function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const COMPLETION_RULE_SUGGESTIONS = [
  "rep_range",
  "amrap",
  "max_effort",
  "time",
  "distance",
  "failure",
  "ladder",
] as const;
