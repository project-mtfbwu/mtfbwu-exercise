/**
 * Pure helpers for the plan editor. No Supabase/Next.js imports, so these are
 * unit-testable without a database:
 *
 * - `bumpVersionOrConflict` — the optimistic-concurrency check shared by every
 *   plan-mutating action.
 * - `buildReorderPlan` — a two-phase (temp-then-final) sort-order plan, same
 *   shape as the board's `reorder_cards` outbox handler
 *   (`src/shared/offline/sync-coordinator.ts`), so an intermediate write never
 *   collides with a `unique (parent_id, sort_order)` constraint.
 * - `buildDaySeed` / `buildBlockSeed` / `buildBlockExerciseSeed` /
 *   `buildPrescriptionSeed` — turn raw plan-tree rows into insert-ready seed
 *   objects for "copy plan", "new version", and the duplicate-day/block/set
 *   actions. Ids are intentionally omitted — callers assign fresh parent ids
 *   as they walk the seed tree and insert level by level.
 */

export type DbRow = Record<string, unknown>;

export type VersionBumpResult =
  { ok: true; nextVersion: number } | { ok: false; conflict: true };

export function bumpVersionOrConflict(
  expectedVersion: number,
  actualVersion: number,
): VersionBumpResult {
  if (expectedVersion !== actualVersion) return { ok: false, conflict: true };
  return { ok: true, nextVersion: actualVersion + 1 };
}

export type ReorderStep = { id: string; sortOrder: number };
export type ReorderPlan = { tempSteps: ReorderStep[]; finalSteps: ReorderStep[] };

/**
 * Two-phase reorder: push every row past any plausible existing `sort_order`
 * first, then assign the final `0..n-1` order. Without the temp phase, an
 * in-place swap can momentarily collide with a sibling's current value under
 * the `unique (parent_id, sort_order)` constraint.
 */
export function buildReorderPlan(orderedIds: readonly string[]): ReorderPlan {
  const tempBase = 100_000;
  return {
    tempSteps: orderedIds.map((id, index) => ({ id, sortOrder: tempBase + index })),
    finalSteps: orderedIds.map((id, index) => ({ id, sortOrder: index })),
  };
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textOrNull(value: unknown): string | null {
  return (value as string | null | undefined) ?? null;
}

export type PrescriptionSeedRow = {
  set_index: number;
  set_role: string;
  completion_rule: string;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight_kg: number | null;
  target_duration_seconds: number | null;
  target_distance_meters: number | null;
  target_rpe: number | null;
  target_rir: number | null;
  tempo_eccentric_seconds: number | null;
  tempo_pause_bottom_seconds: number | null;
  tempo_concentric_seconds: number | null;
  tempo_pause_top_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

export type BlockExerciseSeedRow = {
  exercise_definition_id: string | null;
  user_exercise_id: string | null;
  sort_order: number;
  notes: string | null;
  prescriptions: PrescriptionSeedRow[];
};

export type BlockSeedRow = {
  block_type: string;
  title: string | null;
  sort_order: number;
  rounds: number | null;
  rest_seconds: number | null;
  transition_seconds: number | null;
  notes: string | null;
  exercises: BlockExerciseSeedRow[];
};

export type DaySeedRow = {
  name: string;
  day_of_week: number | null;
  sort_order: number;
  rest_day: boolean;
  notes: string | null;
  blocks: BlockSeedRow[];
};

export function buildPrescriptionSeed(row: DbRow): PrescriptionSeedRow {
  return {
    set_index: numOr(row.set_index, 1),
    set_role: String(row.set_role ?? "working"),
    completion_rule: String(row.completion_rule ?? "rep_range"),
    target_reps_min: numOrNull(row.target_reps_min),
    target_reps_max: numOrNull(row.target_reps_max),
    target_weight_kg: numOrNull(row.target_weight_kg),
    target_duration_seconds: numOrNull(row.target_duration_seconds),
    target_distance_meters: numOrNull(row.target_distance_meters),
    target_rpe: numOrNull(row.target_rpe),
    target_rir: numOrNull(row.target_rir),
    tempo_eccentric_seconds: numOrNull(row.tempo_eccentric_seconds),
    tempo_pause_bottom_seconds: numOrNull(row.tempo_pause_bottom_seconds),
    tempo_concentric_seconds: numOrNull(row.tempo_concentric_seconds),
    tempo_pause_top_seconds: numOrNull(row.tempo_pause_top_seconds),
    rest_seconds: numOrNull(row.rest_seconds),
    notes: textOrNull(row.notes),
  };
}

export function buildBlockExerciseSeed(
  row: DbRow,
  prescriptions: readonly DbRow[],
): BlockExerciseSeedRow {
  return {
    exercise_definition_id: row.exercise_definition_id
      ? String(row.exercise_definition_id)
      : null,
    user_exercise_id: row.user_exercise_id ? String(row.user_exercise_id) : null,
    sort_order: numOr(row.sort_order, 0),
    notes: textOrNull(row.notes),
    prescriptions: prescriptions
      .filter((p) => p.workout_block_exercise_id === row.id)
      .slice()
      .sort((a, b) => numOr(a.set_index, 0) - numOr(b.set_index, 0))
      .map(buildPrescriptionSeed),
  };
}

export function buildBlockSeed(
  row: DbRow,
  blockExercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): BlockSeedRow {
  return {
    block_type: String(row.block_type ?? "straight_sets"),
    title: textOrNull(row.title),
    sort_order: numOr(row.sort_order, 0),
    rounds: numOrNull(row.rounds),
    rest_seconds: numOrNull(row.rest_seconds),
    transition_seconds: numOrNull(row.transition_seconds),
    notes: textOrNull(row.notes),
    exercises: blockExercises
      .filter((be) => be.workout_block_id === row.id)
      .slice()
      .sort((a, b) => numOr(a.sort_order, 0) - numOr(b.sort_order, 0))
      .map((be) => buildBlockExerciseSeed(be, prescriptions)),
  };
}

export function buildDaySeed(
  row: DbRow,
  blocks: readonly DbRow[],
  blockExercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): DaySeedRow {
  return {
    name: String(row.name ?? ""),
    day_of_week: numOrNull(row.day_of_week),
    sort_order: numOr(row.sort_order, 0),
    rest_day: Boolean(row.rest_day),
    notes: textOrNull(row.notes),
    blocks: blocks
      .filter((b) => b.workout_plan_day_id === row.id)
      .slice()
      .sort((a, b) => numOr(a.sort_order, 0) - numOr(b.sort_order, 0))
      .map((b) => buildBlockSeed(b, blockExercises, prescriptions)),
  };
}

export function buildPlanTreeSeed(
  days: readonly DbRow[],
  blocks: readonly DbRow[],
  blockExercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): DaySeedRow[] {
  return days
    .slice()
    .sort((a, b) => numOr(a.sort_order, 0) - numOr(b.sort_order, 0))
    .map((day) => buildDaySeed(day, blocks, blockExercises, prescriptions));
}
