"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import type { PlanSummaryView } from "@/modules/workout/sessions/types";
import {
  buildBlockSeed,
  buildDaySeed,
  buildPlanTreeSeed,
  buildPrescriptionSeed,
  buildReorderPlan,
  bumpVersionOrConflict,
  type BlockExerciseSeedRow,
  type BlockSeedRow,
  type DaySeedRow,
} from "./plan-tree";
import { numberValue, planSummaryView, relationRow } from "./views";
import {
  addBlockExerciseSchema,
  addBlockSchema,
  addPlanDaySchema,
  addPrescriptionSchema,
  archivePlanSchema,
  copyPlanSchema,
  createPlanSchema,
  createUserExerciseSchema,
  deleteBlockExerciseSchema,
  deleteBlockSchema,
  deletePlanDaySchema,
  deletePrescriptionSchema,
  duplicateBlockSchema,
  duplicatePlanDaySchema,
  duplicatePrescriptionSchema,
  reorderBlockExercisesSchema,
  reorderBlocksSchema,
  reorderPlanDaysSchema,
  reorderPrescriptionsSchema,
  substituteBlockExerciseSchema,
  updateBlockSchema,
  updatePlanDaySchema,
  updatePlanMetaSchema,
  updatePrescriptionSchema,
  versionPlanSchema,
} from "./schemas";

export type IdResult =
  | { ok: true; id: string; message: string }
  | { ok: false; error: string; conflict?: boolean };
export type PlanActionResult =
  { ok: true; message: string } | { ok: false; error: string; conflict?: boolean };
export type PlanMutationResult =
  | { ok: true; plan: PlanSummaryView; message: string }
  | { ok: false; error: string; conflict?: boolean };

type DbRow = Record<string, unknown>;
// Same loose adapter as `sessions/actions.ts` — nested relation selects for
// ownership-chain lookups (block exercise -> block -> day -> plan) stay
// easier to express with an untyped `from` boundary.
type WorkoutDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

async function authenticatedDb(): Promise<{ db: WorkoutDb; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as WorkoutDb, userId: user.id } : null;
}

// ---------------------------------------------------------------------------
// Ownership-chain lookups: resolve the owning plan id for a nested child so
// mutations can run the shared version-guard before writing.
// ---------------------------------------------------------------------------

async function planIdForDay(db: WorkoutDb, dayId: string): Promise<string | null> {
  const { data } = await db
    .from("workout_plan_days")
    .select("workout_plan_id")
    .eq("id", dayId)
    .maybeSingle();
  return data ? String(data.workout_plan_id) : null;
}

async function planIdForBlock(db: WorkoutDb, blockId: string): Promise<string | null> {
  const { data } = await db
    .from("workout_blocks")
    .select("workout_plan_days(workout_plan_id)")
    .eq("id", blockId)
    .maybeSingle();
  if (!data) return null;
  const day = relationRow((data as DbRow).workout_plan_days);
  return day ? String(day.workout_plan_id) : null;
}

async function planIdForBlockExercise(
  db: WorkoutDb,
  blockExerciseId: string,
): Promise<string | null> {
  const { data } = await db
    .from("workout_block_exercises")
    .select("workout_blocks(workout_plan_days(workout_plan_id))")
    .eq("id", blockExerciseId)
    .maybeSingle();
  if (!data) return null;
  const block = relationRow((data as DbRow).workout_blocks);
  const day = block ? relationRow(block.workout_plan_days) : null;
  return day ? String(day.workout_plan_id) : null;
}

async function planIdForPrescription(
  db: WorkoutDb,
  prescriptionId: string,
): Promise<string | null> {
  const { data } = await db
    .from("workout_set_prescriptions")
    .select("workout_block_exercises(workout_blocks(workout_plan_days(workout_plan_id)))")
    .eq("id", prescriptionId)
    .maybeSingle();
  if (!data) return null;
  const blockExercise = relationRow((data as DbRow).workout_block_exercises);
  const block = blockExercise ? relationRow(blockExercise.workout_blocks) : null;
  const day = block ? relationRow(block.workout_plan_days) : null;
  return day ? String(day.workout_plan_id) : null;
}

// ---------------------------------------------------------------------------
// Optimistic concurrency: every structural edit must supply the plan version
// it read. Editing a plan never touches `workout_sessions`/`workout_sets` —
// only `workout_plans.version` moves, so in-progress or completed sessions
// (which snapshot their own structure) are unaffected.
// ---------------------------------------------------------------------------

type BumpResult =
  { ok: true; version: number } | { ok: false; error: string; conflict: boolean };

async function bumpPlanVersion(
  db: WorkoutDb,
  planId: string,
  expectedVersion: number,
): Promise<BumpResult> {
  const { data: plan } = await db
    .from("workout_plans")
    .select("id, version")
    .eq("id", planId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Plan not found.", conflict: true };

  const bump = bumpVersionOrConflict(expectedVersion, numberValue(plan.version));
  if (!bump.ok) {
    return {
      ok: false,
      error: "Plan changed elsewhere — refresh and try again.",
      conflict: true,
    };
  }

  const { error } = await db
    .from("workout_plans")
    .update({ version: bump.nextVersion })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message, conflict: false };

  return { ok: true, version: bump.nextVersion };
}

// ---------------------------------------------------------------------------
// Tree loading + insertion (shared by copy / new-version / duplicate-*)
// ---------------------------------------------------------------------------

type PlanTree = {
  plan: DbRow;
  days: DbRow[];
  blocks: DbRow[];
  blockExercises: DbRow[];
  prescriptions: DbRow[];
};

async function loadPlanTree(db: WorkoutDb, planId: string): Promise<PlanTree | null> {
  const { data: plan } = await db
    .from("workout_plans")
    .select("*")
    .eq("id", planId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!plan) return null;

  const { data: days } = await db
    .from("workout_plan_days")
    .select("*")
    .eq("workout_plan_id", planId)
    .order("sort_order");
  const dayIds = (days ?? []).map((d: DbRow) => d.id);

  const { data: blocks } = dayIds.length
    ? await db
        .from("workout_blocks")
        .select("*")
        .in("workout_plan_day_id", dayIds)
        .order("sort_order")
    : { data: [] };
  const blockIds = (blocks ?? []).map((b: DbRow) => b.id);

  const { data: blockExercises } = blockIds.length
    ? await db
        .from("workout_block_exercises")
        .select("*, exercise_definitions(name), user_exercises(custom_name)")
        .in("workout_block_id", blockIds)
        .order("sort_order")
    : { data: [] };
  const blockExerciseIds = (blockExercises ?? []).map((be: DbRow) => be.id);

  const { data: prescriptions } = blockExerciseIds.length
    ? await db
        .from("workout_set_prescriptions")
        .select("*")
        .in("workout_block_exercise_id", blockExerciseIds)
        .order("set_index")
    : { data: [] };

  return {
    plan,
    days: days ?? [],
    blocks: blocks ?? [],
    blockExercises: blockExercises ?? [],
    prescriptions: prescriptions ?? [],
  };
}

async function insertExercisesForBlock(
  db: WorkoutDb,
  blockId: string,
  exercises: readonly BlockExerciseSeedRow[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const exercise of exercises) {
    const { data: exerciseRow, error: exerciseError } = await db
      .from("workout_block_exercises")
      .insert({
        workout_block_id: blockId,
        exercise_definition_id: exercise.exercise_definition_id,
        user_exercise_id: exercise.user_exercise_id,
        sort_order: exercise.sort_order,
        notes: exercise.notes,
      })
      .select("id")
      .single();
    if (exerciseError || !exerciseRow)
      return {
        ok: false,
        error: exerciseError?.message ?? "Could not copy block exercise.",
      };

    if (exercise.prescriptions.length) {
      const { error: prescriptionError } = await db
        .from("workout_set_prescriptions")
        .insert(
          exercise.prescriptions.map((p) => ({
            workout_block_exercise_id: exerciseRow.id,
            set_index: p.set_index,
            set_role: p.set_role,
            completion_rule: p.completion_rule,
            target_reps_min: p.target_reps_min,
            target_reps_max: p.target_reps_max,
            target_weight_kg: p.target_weight_kg,
            target_duration_seconds: p.target_duration_seconds,
            target_distance_meters: p.target_distance_meters,
            target_rpe: p.target_rpe,
            target_rir: p.target_rir,
            tempo_eccentric_seconds: p.tempo_eccentric_seconds,
            tempo_pause_bottom_seconds: p.tempo_pause_bottom_seconds,
            tempo_concentric_seconds: p.tempo_concentric_seconds,
            tempo_pause_top_seconds: p.tempo_pause_top_seconds,
            rest_seconds: p.rest_seconds,
            notes: p.notes,
          })),
        );
      if (prescriptionError) return { ok: false, error: prescriptionError.message };
    }
  }
  return { ok: true };
}

async function insertBlocksForDay(
  db: WorkoutDb,
  dayId: string,
  blocks: readonly BlockSeedRow[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const block of blocks) {
    const { data: blockRow, error: blockError } = await db
      .from("workout_blocks")
      .insert({
        workout_plan_day_id: dayId,
        block_type: block.block_type,
        title: block.title,
        sort_order: block.sort_order,
        rounds: block.rounds,
        rest_seconds: block.rest_seconds,
        transition_seconds: block.transition_seconds,
        notes: block.notes,
      })
      .select("id")
      .single();
    if (blockError || !blockRow)
      return { ok: false, error: blockError?.message ?? "Could not copy block." };

    const result = await insertExercisesForBlock(
      db,
      String(blockRow.id),
      block.exercises,
    );
    if (!result.ok) return result;
  }
  return { ok: true };
}

async function insertPlanTree(
  db: WorkoutDb,
  newPlanId: string,
  days: readonly DaySeedRow[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const day of days) {
    const { data: dayRow, error: dayError } = await db
      .from("workout_plan_days")
      .insert({
        workout_plan_id: newPlanId,
        name: day.name,
        day_of_week: day.day_of_week,
        sort_order: day.sort_order,
        rest_day: day.rest_day,
        notes: day.notes,
      })
      .select("id")
      .single();
    if (dayError || !dayRow)
      return { ok: false, error: dayError?.message ?? "Could not copy plan day." };

    const result = await insertBlocksForDay(db, String(dayRow.id), day.blocks);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reorder (two-phase, avoids `unique (parent_id, sort_order)` collisions —
// same pattern as `reorder_cards` in `src/shared/offline/sync-coordinator.ts`)
// ---------------------------------------------------------------------------

async function applyReorder(
  db: WorkoutDb,
  table: string,
  orderedIds: readonly string[],
  scopeColumn: string,
  scopeValue: string,
  sortColumn: "sort_order" | "set_index" = "sort_order",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tempSteps, finalSteps } = buildReorderPlan(orderedIds);
  for (const step of tempSteps) {
    const { error } = await db
      .from(table)
      .update({ [sortColumn]: step.sortOrder })
      .eq("id", step.id)
      .eq(scopeColumn, scopeValue);
    if (error) return { ok: false, error: error.message };
  }
  for (const step of finalSteps) {
    const { error } = await db
      .from(table)
      .update({ [sortColumn]: step.sortOrder })
      .eq("id", step.id)
      .eq(scopeColumn, scopeValue);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getPlanAction(planId: string): Promise<PlanSummaryView | null> {
  if (typeof planId !== "string" || !planId) return null;
  const context = await authenticatedDb();
  if (!context) return null;
  const tree = await loadPlanTree(context.db, planId);
  if (!tree) return null;
  return planSummaryView(
    tree.plan,
    tree.days,
    tree.blocks,
    tree.blockExercises,
    tree.prescriptions,
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export async function createPlanAction(input: unknown): Promise<IdResult> {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const name = parsed.data.name.trim();
  const { data: plan, error } = await db
    .from("workout_plans")
    .insert({
      user_id: userId,
      name,
      description: parsed.data.description?.trim() || null,
      objective: parsed.data.objective?.trim() || null,
      source: "user_created",
      active: true,
    })
    .select("id")
    .single();
  if (error || !plan)
    return { ok: false, error: error?.message ?? "Could not create plan." };

  revalidatePath(ROUTES.plans);
  return { ok: true, id: String(plan.id), message: `"${name}" created.` };
}

export async function updatePlanMetaAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = updatePlanMetaSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("workout_plans")
    .update({
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      objective: parsed.data.objective?.trim() || null,
    })
    .eq("id", parsed.data.planId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Plan updated" };
}

/**
 * Soft delete: `deleted_at` + `active = false`. RLS hides deleted plans from
 * select/update, but the row (and every performed session that references
 * it) survives untouched — history is never rewritten by plan edits.
 */
export async function archivePlanAction(input: unknown): Promise<PlanActionResult> {
  const parsed = archivePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: plan } = await db
    .from("workout_plans")
    .select("id, name, version")
    .eq("id", parsed.data.planId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Plan not found." };
  const bump = bumpVersionOrConflict(
    parsed.data.expectedVersion,
    numberValue(plan.version),
  );
  if (!bump.ok)
    return {
      ok: false,
      error: "Plan changed elsewhere — refresh and try again.",
      conflict: true,
    };

  const { error } = await db
    .from("workout_plans")
    .update({
      active: false,
      deleted_at: new Date().toISOString(),
      version: bump.nextVersion,
    })
    .eq("id", plan.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.plans);
  return { ok: true, message: `"${plan.name}" archived.` };
}

/** Deep copy of the whole plan tree as an independent, active, version-1 plan. */
export async function copyPlanAction(input: unknown): Promise<IdResult> {
  const parsed = copyPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const tree = await loadPlanTree(db, parsed.data.planId);
  if (!tree) return { ok: false, error: "Plan not found." };

  const name = `Copy of ${String(tree.plan.name)}`;
  const { data: newPlan, error: planError } = await db
    .from("workout_plans")
    .insert({
      user_id: userId,
      name,
      description: tree.plan.description ?? null,
      objective: tree.plan.objective ?? null,
      version: 1,
      active: true,
      source: "user_copy",
    })
    .select("id")
    .single();
  if (planError || !newPlan)
    return { ok: false, error: planError?.message ?? "Could not copy plan." };

  const seeds = buildPlanTreeSeed(
    tree.days,
    tree.blocks,
    tree.blockExercises,
    tree.prescriptions,
  );
  const insertResult = await insertPlanTree(db, String(newPlan.id), seeds);
  if (!insertResult.ok) return { ok: false, error: insertResult.error };

  revalidatePath(ROUTES.plans);
  return { ok: true, id: String(newPlan.id), message: `"${name}" created.` };
}

/**
 * Creates a new, independent plan row that is a deep copy of the source tree
 * with `version = source.version + 1`. The source plan is left untouched and
 * active — this is a fork, not an in-place rewrite, so any session already
 * referencing the source plan's version keeps its own snapshot valid.
 */
export async function versionPlanAction(input: unknown): Promise<IdResult> {
  const parsed = versionPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const tree = await loadPlanTree(db, parsed.data.planId);
  if (!tree) return { ok: false, error: "Plan not found." };
  const bump = bumpVersionOrConflict(
    parsed.data.expectedVersion,
    numberValue(tree.plan.version),
  );
  if (!bump.ok)
    return {
      ok: false,
      error: "Plan changed elsewhere — refresh and try again.",
      conflict: true,
    };

  const { data: newPlan, error: planError } = await db
    .from("workout_plans")
    .insert({
      user_id: userId,
      name: String(tree.plan.name),
      description: tree.plan.description ?? null,
      objective: tree.plan.objective ?? null,
      version: bump.nextVersion,
      active: true,
      source: "user_created",
    })
    .select("id")
    .single();
  if (planError || !newPlan)
    return { ok: false, error: planError?.message ?? "Could not version plan." };

  const seeds = buildPlanTreeSeed(
    tree.days,
    tree.blocks,
    tree.blockExercises,
    tree.prescriptions,
  );
  const insertResult = await insertPlanTree(db, String(newPlan.id), seeds);
  if (!insertResult.ok) return { ok: false, error: insertResult.error };

  revalidatePath(ROUTES.plans);
  return {
    ok: true,
    id: String(newPlan.id),
    message: `Created version ${bump.nextVersion} of "${String(tree.plan.name)}".`,
  };
}

// ---------------------------------------------------------------------------
// Plan days
// ---------------------------------------------------------------------------

export async function addPlanDayAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addPlanDaySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid day." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: existing } = await db
    .from("workout_plan_days")
    .select("sort_order")
    .eq("workout_plan_id", parsed.data.planId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = numberValue(existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await db.from("workout_plan_days").insert({
    workout_plan_id: parsed.data.planId,
    name: parsed.data.name?.trim() || `Day ${nextOrder + 1}`,
    day_of_week: parsed.data.dayOfWeek ?? null,
    rest_day: parsed.data.restDay ?? false,
    sort_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Day added" };
}

export async function updatePlanDayAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = updatePlanDaySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid day." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForDay(db, parsed.data.dayId);
  if (!planId) return { ok: false, error: "Plan day not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const update: DbRow = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim();
  if (parsed.data.dayOfWeek !== undefined) update.day_of_week = parsed.data.dayOfWeek;
  if (parsed.data.restDay !== undefined) update.rest_day = parsed.data.restDay;

  const { error } = await db
    .from("workout_plan_days")
    .update(update)
    .eq("id", parsed.data.dayId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Day updated" };
}

export async function deletePlanDayAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = deletePlanDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForDay(db, parsed.data.dayId);
  if (!planId) return { ok: false, error: "Plan day not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("workout_plan_days")
    .delete()
    .eq("id", parsed.data.dayId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Day deleted" };
}

export async function duplicatePlanDayAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = duplicatePlanDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: day } = await db
    .from("workout_plan_days")
    .select("*")
    .eq("id", parsed.data.dayId)
    .maybeSingle();
  if (!day) return { ok: false, error: "Plan day not found." };
  const planId = String(day.workout_plan_id);
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: blocks } = await db
    .from("workout_blocks")
    .select("*")
    .eq("workout_plan_day_id", day.id)
    .order("sort_order");
  const blockIds = (blocks ?? []).map((b: DbRow) => b.id);
  const { data: blockExercises } = blockIds.length
    ? await db
        .from("workout_block_exercises")
        .select("*")
        .in("workout_block_id", blockIds)
        .order("sort_order")
    : { data: [] };
  const blockExerciseIds = (blockExercises ?? []).map((be: DbRow) => be.id);
  const { data: prescriptions } = blockExerciseIds.length
    ? await db
        .from("workout_set_prescriptions")
        .select("*")
        .in("workout_block_exercise_id", blockExerciseIds)
        .order("set_index")
    : { data: [] };

  const { data: existing } = await db
    .from("workout_plan_days")
    .select("sort_order")
    .eq("workout_plan_id", planId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = numberValue(existing?.[0]?.sort_order ?? -1) + 1;

  const seed = buildDaySeed(
    { ...day, sort_order: nextOrder, name: `${String(day.name)} (copy)` },
    blocks ?? [],
    blockExercises ?? [],
    prescriptions ?? [],
  );

  const { data: newDay, error: dayError } = await db
    .from("workout_plan_days")
    .insert({
      workout_plan_id: planId,
      name: seed.name,
      day_of_week: seed.day_of_week,
      sort_order: seed.sort_order,
      rest_day: seed.rest_day,
      notes: seed.notes,
    })
    .select("id")
    .single();
  if (dayError || !newDay)
    return { ok: false, error: dayError?.message ?? "Could not duplicate day." };

  const insertResult = await insertBlocksForDay(db, String(newDay.id), seed.blocks);
  if (!insertResult.ok) return { ok: false, error: insertResult.error };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Day duplicated" };
}

export async function reorderPlanDaysAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = reorderPlanDaysSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "workout_plan_days",
    parsed.data.orderedDayIds,
    "workout_plan_id",
    parsed.data.planId,
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await getPlanAction(parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Days reordered" };
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export async function addBlockAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addBlockSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid block." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: day } = await db
    .from("workout_plan_days")
    .select("workout_plan_id")
    .eq("id", parsed.data.planDayId)
    .maybeSingle();
  if (!day) return { ok: false, error: "Plan day not found." };
  const planId = String(day.workout_plan_id);
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: existing } = await db
    .from("workout_blocks")
    .select("sort_order")
    .eq("workout_plan_day_id", parsed.data.planDayId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = numberValue(existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await db.from("workout_blocks").insert({
    workout_plan_day_id: parsed.data.planDayId,
    block_type: parsed.data.blockType,
    title: parsed.data.title?.trim() || null,
    sort_order: nextOrder,
    rounds: parsed.data.rounds ?? null,
    rest_seconds: parsed.data.restSeconds ?? null,
    transition_seconds: parsed.data.transitionSeconds ?? null,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Block added" };
}

export async function updateBlockAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = updateBlockSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid block." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlock(db, parsed.data.blockId);
  if (!planId) return { ok: false, error: "Block not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const update: DbRow = {};
  if (parsed.data.blockType !== undefined) update.block_type = parsed.data.blockType;
  if (parsed.data.title !== undefined) update.title = parsed.data.title?.trim() || null;
  if (parsed.data.rounds !== undefined) update.rounds = parsed.data.rounds;
  if (parsed.data.restSeconds !== undefined)
    update.rest_seconds = parsed.data.restSeconds;
  if (parsed.data.transitionSeconds !== undefined)
    update.transition_seconds = parsed.data.transitionSeconds;

  const { error } = await db
    .from("workout_blocks")
    .update(update)
    .eq("id", parsed.data.blockId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Block updated" };
}

export async function deleteBlockAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = deleteBlockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlock(db, parsed.data.blockId);
  if (!planId) return { ok: false, error: "Block not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("workout_blocks")
    .delete()
    .eq("id", parsed.data.blockId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Block deleted" };
}

export async function duplicateBlockAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = duplicateBlockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: block } = await db
    .from("workout_blocks")
    .select("*")
    .eq("id", parsed.data.blockId)
    .maybeSingle();
  if (!block) return { ok: false, error: "Block not found." };
  const planId = await planIdForBlock(db, parsed.data.blockId);
  if (!planId) return { ok: false, error: "Block not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: blockExercises } = await db
    .from("workout_block_exercises")
    .select("*")
    .eq("workout_block_id", block.id)
    .order("sort_order");
  const blockExerciseIds = (blockExercises ?? []).map((be: DbRow) => be.id);
  const { data: prescriptions } = blockExerciseIds.length
    ? await db
        .from("workout_set_prescriptions")
        .select("*")
        .in("workout_block_exercise_id", blockExerciseIds)
        .order("set_index")
    : { data: [] };

  const { data: existing } = await db
    .from("workout_blocks")
    .select("sort_order")
    .eq("workout_plan_day_id", block.workout_plan_day_id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = numberValue(existing?.[0]?.sort_order ?? -1) + 1;

  const seed = buildBlockSeed(
    { ...block, sort_order: nextOrder },
    blockExercises ?? [],
    prescriptions ?? [],
  );

  const insertResult = await insertBlocksForDay(db, String(block.workout_plan_day_id), [
    seed,
  ]);
  if (!insertResult.ok) return { ok: false, error: insertResult.error };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Block duplicated" };
}

export async function reorderBlocksAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = reorderBlocksSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: day } = await db
    .from("workout_plan_days")
    .select("workout_plan_id")
    .eq("id", parsed.data.planDayId)
    .maybeSingle();
  if (!day) return { ok: false, error: "Plan day not found." };
  const planId = String(day.workout_plan_id);
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "workout_blocks",
    parsed.data.orderedBlockIds,
    "workout_plan_day_id",
    parsed.data.planDayId,
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Blocks reordered" };
}

// ---------------------------------------------------------------------------
// Block exercises
// ---------------------------------------------------------------------------

export async function addBlockExerciseAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = addBlockExerciseSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid exercise." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlock(db, parsed.data.blockId);
  if (!planId) return { ok: false, error: "Block not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: existing } = await db
    .from("workout_block_exercises")
    .select("sort_order")
    .eq("workout_block_id", parsed.data.blockId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = numberValue(existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await db.from("workout_block_exercises").insert({
    workout_block_id: parsed.data.blockId,
    exercise_definition_id: parsed.data.exerciseDefinitionId ?? null,
    user_exercise_id: parsed.data.userExerciseId ?? null,
    sort_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Exercise added" };
}

/** Swaps the catalog/custom exercise a block exercise points to; prescriptions
 * (sets) stay attached and untouched. */
export async function substituteBlockExerciseAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = substituteBlockExerciseSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid exercise." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlockExercise(db, parsed.data.blockExerciseId);
  if (!planId) return { ok: false, error: "Exercise not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("workout_block_exercises")
    .update({
      exercise_definition_id: parsed.data.exerciseDefinitionId ?? null,
      user_exercise_id: parsed.data.userExerciseId ?? null,
    })
    .eq("id", parsed.data.blockExerciseId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Exercise substituted" };
}

export async function deleteBlockExerciseAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = deleteBlockExerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlockExercise(db, parsed.data.blockExerciseId);
  if (!planId) return { ok: false, error: "Exercise not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("workout_block_exercises")
    .delete()
    .eq("id", parsed.data.blockExerciseId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Exercise removed" };
}

export async function reorderBlockExercisesAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = reorderBlockExercisesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlock(db, parsed.data.blockId);
  if (!planId) return { ok: false, error: "Block not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "workout_block_exercises",
    parsed.data.orderedBlockExerciseIds,
    "workout_block_id",
    parsed.data.blockId,
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Exercises reordered" };
}

// ---------------------------------------------------------------------------
// User (custom) exercises — not plan-scoped, so no version bump.
// ---------------------------------------------------------------------------

export async function createUserExerciseAction(input: unknown): Promise<IdResult> {
  const parsed = createUserExerciseSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid exercise." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const customName = parsed.data.customName.trim();
  const { data, error } = await db
    .from("user_exercises")
    .insert({
      user_id: userId,
      custom_name: customName,
      private_notes: parsed.data.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not create exercise." };

  return {
    ok: true,
    id: String(data.id),
    message: `"${customName}" added to your exercises.`,
  };
}

// ---------------------------------------------------------------------------
// Set prescriptions
// ---------------------------------------------------------------------------

function prescriptionInsertPayload(data: {
  completionRule?: string;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetWeightKg?: number;
  targetDurationSeconds?: number;
  targetDistanceMeters?: number;
  targetRpe?: number;
  targetRir?: number;
  tempoEccentricSeconds?: number;
  tempoPauseBottomSeconds?: number;
  tempoConcentricSeconds?: number;
  tempoPauseTopSeconds?: number;
  restSeconds?: number;
  notes?: string;
}): DbRow {
  return {
    completion_rule: data.completionRule ?? "rep_range",
    target_reps_min: data.targetRepsMin ?? null,
    target_reps_max: data.targetRepsMax ?? null,
    target_weight_kg: data.targetWeightKg ?? null,
    target_duration_seconds: data.targetDurationSeconds ?? null,
    target_distance_meters: data.targetDistanceMeters ?? null,
    target_rpe: data.targetRpe ?? null,
    target_rir: data.targetRir ?? null,
    tempo_eccentric_seconds: data.tempoEccentricSeconds ?? null,
    tempo_pause_bottom_seconds: data.tempoPauseBottomSeconds ?? null,
    tempo_concentric_seconds: data.tempoConcentricSeconds ?? null,
    tempo_pause_top_seconds: data.tempoPauseTopSeconds ?? null,
    rest_seconds: data.restSeconds ?? null,
    notes: data.notes?.trim() || null,
  };
}

export async function addPrescriptionAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addPrescriptionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid set." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlockExercise(db, parsed.data.blockExerciseId);
  if (!planId) return { ok: false, error: "Exercise not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: existing } = await db
    .from("workout_set_prescriptions")
    .select("set_index")
    .eq("workout_block_exercise_id", parsed.data.blockExerciseId)
    .order("set_index", { ascending: false })
    .limit(1);
  const nextIndex = numberValue(existing?.[0]?.set_index ?? 0) + 1;

  const { error } = await db.from("workout_set_prescriptions").insert({
    workout_block_exercise_id: parsed.data.blockExerciseId,
    set_index: nextIndex,
    set_role: parsed.data.setRole,
    ...prescriptionInsertPayload(parsed.data),
  });
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Set added" };
}

export async function updatePrescriptionAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = updatePrescriptionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid set." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForPrescription(db, parsed.data.prescriptionId);
  if (!planId) return { ok: false, error: "Set not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const fields = parsed.data;
  const update: DbRow = {};
  if (fields.setRole !== undefined) update.set_role = fields.setRole;
  if (fields.completionRule !== undefined) update.completion_rule = fields.completionRule;
  if (fields.targetRepsMin !== undefined) update.target_reps_min = fields.targetRepsMin;
  if (fields.targetRepsMax !== undefined) update.target_reps_max = fields.targetRepsMax;
  if (fields.targetWeightKg !== undefined)
    update.target_weight_kg = fields.targetWeightKg;
  if (fields.targetDurationSeconds !== undefined)
    update.target_duration_seconds = fields.targetDurationSeconds;
  if (fields.targetDistanceMeters !== undefined)
    update.target_distance_meters = fields.targetDistanceMeters;
  if (fields.targetRpe !== undefined) update.target_rpe = fields.targetRpe;
  if (fields.targetRir !== undefined) update.target_rir = fields.targetRir;
  if (fields.tempoEccentricSeconds !== undefined)
    update.tempo_eccentric_seconds = fields.tempoEccentricSeconds;
  if (fields.tempoPauseBottomSeconds !== undefined)
    update.tempo_pause_bottom_seconds = fields.tempoPauseBottomSeconds;
  if (fields.tempoConcentricSeconds !== undefined)
    update.tempo_concentric_seconds = fields.tempoConcentricSeconds;
  if (fields.tempoPauseTopSeconds !== undefined)
    update.tempo_pause_top_seconds = fields.tempoPauseTopSeconds;
  if (fields.restSeconds !== undefined) update.rest_seconds = fields.restSeconds;
  if (fields.notes !== undefined) update.notes = fields.notes.trim() || null;

  const { error } = await db
    .from("workout_set_prescriptions")
    .update(update)
    .eq("id", parsed.data.prescriptionId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Set updated" };
}

export async function deletePrescriptionAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = deletePrescriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForPrescription(db, parsed.data.prescriptionId);
  if (!planId) return { ok: false, error: "Set not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("workout_set_prescriptions")
    .delete()
    .eq("id", parsed.data.prescriptionId);
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Set deleted" };
}

export async function duplicatePrescriptionAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = duplicatePrescriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: prescription } = await db
    .from("workout_set_prescriptions")
    .select("*")
    .eq("id", parsed.data.prescriptionId)
    .maybeSingle();
  if (!prescription) return { ok: false, error: "Set not found." };
  const planId = await planIdForPrescription(db, parsed.data.prescriptionId);
  if (!planId) return { ok: false, error: "Set not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: existing } = await db
    .from("workout_set_prescriptions")
    .select("set_index")
    .eq("workout_block_exercise_id", prescription.workout_block_exercise_id)
    .order("set_index", { ascending: false })
    .limit(1);
  const nextIndex = numberValue(existing?.[0]?.set_index ?? 0) + 1;

  const seed = buildPrescriptionSeed({ ...prescription, set_index: nextIndex });
  const { error } = await db.from("workout_set_prescriptions").insert({
    workout_block_exercise_id: prescription.workout_block_exercise_id,
    set_index: seed.set_index,
    set_role: seed.set_role,
    completion_rule: seed.completion_rule,
    target_reps_min: seed.target_reps_min,
    target_reps_max: seed.target_reps_max,
    target_weight_kg: seed.target_weight_kg,
    target_duration_seconds: seed.target_duration_seconds,
    target_distance_meters: seed.target_distance_meters,
    target_rpe: seed.target_rpe,
    target_rir: seed.target_rir,
    tempo_eccentric_seconds: seed.tempo_eccentric_seconds,
    tempo_pause_bottom_seconds: seed.tempo_pause_bottom_seconds,
    tempo_concentric_seconds: seed.tempo_concentric_seconds,
    tempo_pause_top_seconds: seed.tempo_pause_top_seconds,
    rest_seconds: seed.rest_seconds,
    notes: seed.notes,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Set duplicated" };
}

export async function reorderPrescriptionsAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = reorderPrescriptionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForBlockExercise(db, parsed.data.blockExerciseId);
  if (!planId) return { ok: false, error: "Exercise not found." };
  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "workout_set_prescriptions",
    parsed.data.orderedPrescriptionIds,
    "workout_block_exercise_id",
    parsed.data.blockExerciseId,
    "set_index",
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await getPlanAction(planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.plans);
  return { ok: true, plan, message: "Sets reordered" };
}
