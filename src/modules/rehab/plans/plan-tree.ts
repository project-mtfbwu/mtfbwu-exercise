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

export function buildReorderPlan(orderedIds: readonly string[]): ReorderPlan {
  const tempBase = 100_000;
  return {
    tempSteps: orderedIds.map((id, index) => ({ id, sortOrder: tempBase + index })),
    finalSteps: orderedIds.map((id, index) => ({ id, sortOrder: index })),
  };
}

/** Moves `id` one slot up (−1) or down (+1); no-op at list boundaries or unknown id. */
export function moveIdInOrder(
  ids: readonly string[],
  id: string,
  direction: "up" | "down",
): string[] {
  const index = ids.indexOf(id);
  if (index < 0) return [...ids];
  const delta = direction === "up" ? -1 : 1;
  const target = index + delta;
  if (target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  const [item] = next.splice(index, 1);
  if (item === undefined) return [...ids];
  next.splice(target, 0, item);
  return next;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: unknown): string | null {
  return (value as string | null | undefined) ?? null;
}

export type PrescriptionSeedRow = {
  set_index: number;
  completion_rule: string;
  target_reps: number | null;
  target_duration_seconds: number | null;
  target_hold_seconds: number | null;
  target_load: number | null;
  target_load_unit: string | null;
  tempo_eccentric_seconds: number | null;
  tempo_pause_bottom_seconds: number | null;
  tempo_concentric_seconds: number | null;
  tempo_pause_top_seconds: number | null;
  rest_seconds: number | null;
  assistance_type: string | null;
  assistance_amount: string | null;
  rom_min_degrees: number | null;
  rom_max_degrees: number | null;
  pain_limit: number | null;
  notes: string | null;
};

export type ExerciseSeedRow = {
  rehab_exercise_definition_id: string | null;
  user_rehab_exercise_id: string | null;
  display_order: number;
  side: string;
  instructions_snapshot: string;
  stop_conditions_snapshot: string;
  prescriptions: PrescriptionSeedRow[];
};

export type DaySeedRow = {
  name: string;
  day_index: number;
  description: string | null;
  estimated_duration_minutes: number | null;
  exercises: ExerciseSeedRow[];
};

export type PhaseSeedRow = {
  name: string;
  phase_type: string;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  clinician_notes: string | null;
  days: DaySeedRow[];
};

export function buildPrescriptionSeed(row: DbRow): PrescriptionSeedRow {
  return {
    set_index: Number(row.set_index) || 1,
    completion_rule: String(row.completion_rule ?? "manual"),
    target_reps: numOrNull(row.target_reps),
    target_duration_seconds: numOrNull(row.target_duration_seconds),
    target_hold_seconds: numOrNull(row.target_hold_seconds),
    target_load: numOrNull(row.target_load),
    target_load_unit: textOrNull(row.target_load_unit),
    tempo_eccentric_seconds: numOrNull(row.tempo_eccentric_seconds),
    tempo_pause_bottom_seconds: numOrNull(row.tempo_pause_bottom_seconds),
    tempo_concentric_seconds: numOrNull(row.tempo_concentric_seconds),
    tempo_pause_top_seconds: numOrNull(row.tempo_pause_top_seconds),
    rest_seconds: numOrNull(row.rest_seconds),
    assistance_type: textOrNull(row.assistance_type),
    assistance_amount: textOrNull(row.assistance_amount),
    rom_min_degrees: numOrNull(row.rom_min_degrees),
    rom_max_degrees: numOrNull(row.rom_max_degrees),
    pain_limit: numOrNull(row.pain_limit),
    notes: textOrNull(row.notes),
  };
}

export function buildExerciseSeed(
  row: DbRow,
  prescriptions: readonly DbRow[],
): ExerciseSeedRow {
  return {
    rehab_exercise_definition_id: row.rehab_exercise_definition_id
      ? String(row.rehab_exercise_definition_id)
      : null,
    user_rehab_exercise_id: row.user_rehab_exercise_id
      ? String(row.user_rehab_exercise_id)
      : null,
    display_order: Number(row.display_order) || 0,
    side: String(row.side ?? "not_applicable"),
    instructions_snapshot: String(row.instructions_snapshot ?? ""),
    stop_conditions_snapshot: String(row.stop_conditions_snapshot ?? ""),
    prescriptions: prescriptions
      .filter((p) => p.rehab_plan_exercise_id === row.id)
      .map(buildPrescriptionSeed)
      .sort((a, b) => a.set_index - b.set_index),
  };
}

export function buildDaySeed(
  row: DbRow,
  exercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): DaySeedRow {
  return {
    name: String(row.name),
    day_index: Number(row.day_index) || 0,
    description: textOrNull(row.description),
    estimated_duration_minutes: numOrNull(row.estimated_duration_minutes),
    exercises: exercises
      .filter((e) => e.rehab_plan_day_id === row.id)
      .map((e) => buildExerciseSeed(e, prescriptions))
      .sort((a, b) => a.display_order - b.display_order),
  };
}

export function buildPhaseSeed(
  row: DbRow,
  days: readonly DbRow[],
  exercises: readonly DbRow[],
  prescriptions: readonly DbRow[],
): PhaseSeedRow {
  return {
    name: String(row.name),
    phase_type: String(row.phase_type ?? "custom"),
    display_order: Number(row.display_order) || 0,
    start_date: textOrNull(row.start_date),
    end_date: textOrNull(row.end_date),
    clinician_notes: textOrNull(row.clinician_notes),
    days: days
      .filter((d) => d.rehab_plan_phase_id === row.id)
      .map((d) => buildDaySeed(d, exercises, prescriptions))
      .sort((a, b) => a.day_index - b.day_index),
  };
}

export function buildPlanTreeSeed(input: {
  plan: DbRow;
  phases: readonly DbRow[];
  days: readonly DbRow[];
  exercises: readonly DbRow[];
  prescriptions: readonly DbRow[];
}): { plan: DbRow; phases: PhaseSeedRow[] } {
  return {
    plan: input.plan,
    phases: input.phases
      .filter((p) => p.rehab_plan_id === input.plan.id)
      .map((p) => buildPhaseSeed(p, input.days, input.exercises, input.prescriptions))
      .sort((a, b) => a.display_order - b.display_order),
  };
}
