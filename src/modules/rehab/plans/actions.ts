"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import type {
  RehabExerciseCatalogView,
  RehabPlanSummaryView,
} from "@/modules/rehab/types";
import {
  buildDaySeed,
  buildPhaseSeed,
  buildPlanTreeSeed,
  buildReorderPlan,
  bumpVersionOrConflict,
  type DaySeedRow,
  type PhaseSeedRow,
} from "./plan-tree";
import { clinicianSourceView, numberValue, planSummaryView, relationRow } from "./views";
import {
  addDaySchema,
  addExerciseSchema,
  addPhaseSchema,
  addPrescriptionSchema,
  addRestrictionSchema,
  archivePlanSchema,
  copyPlanSchema,
  createClinicianSourceSchema,
  createPlanSchema,
  deleteClinicianSourceSchema,
  duplicateDaySchema,
  duplicatePhaseSchema,
  getPlanSchema,
  reorderPhasesSchema,
  reorderDaysSchema,
  reorderExercisesSchema,
  reorderPrescriptionsSchema,
  reorderRestrictionsSchema,
  updateClinicianSourceSchema,
  updatePlanSchema,
} from "./schemas";

export type IdResult =
  | { ok: true; id: string; message: string }
  | { ok: false; error: string; conflict?: boolean };
export type PlanActionResult =
  { ok: true; message: string } | { ok: false; error: string; conflict?: boolean };
export type PlanMutationResult =
  | { ok: true; plan: RehabPlanSummaryView; message: string }
  | { ok: false; error: string; conflict?: boolean };

type DbRow = Record<string, unknown>;
type RehabDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, args?: Record<string, unknown>): any;
};

async function authenticatedDb(): Promise<{ db: RehabDb; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as RehabDb, userId: user.id } : null;
}

async function planIdForPhase(db: RehabDb, phaseId: string): Promise<string | null> {
  const { data } = await db
    .from("rehab_plan_phases")
    .select("rehab_plan_id")
    .eq("id", phaseId)
    .maybeSingle();
  return data ? String(data.rehab_plan_id) : null;
}

async function planIdForDay(db: RehabDb, dayId: string): Promise<string | null> {
  const { data } = await db
    .from("rehab_plan_days")
    .select("rehab_plan_phases(rehab_plan_id)")
    .eq("id", dayId)
    .maybeSingle();
  if (!data) return null;
  const phase = relationRow((data as DbRow).rehab_plan_phases);
  return phase ? String(phase.rehab_plan_id) : null;
}

async function planIdForExercise(
  db: RehabDb,
  exerciseId: string,
): Promise<string | null> {
  const { data } = await db
    .from("rehab_plan_exercises")
    .select("rehab_plan_days(rehab_plan_phases(rehab_plan_id))")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!data) return null;
  const day = relationRow((data as DbRow).rehab_plan_days);
  const phase = day ? relationRow(day.rehab_plan_phases) : null;
  return phase ? String(phase.rehab_plan_id) : null;
}

type BumpResult =
  { ok: true; version: number } | { ok: false; error: string; conflict: boolean };

async function bumpPlanVersion(
  db: RehabDb,
  planId: string,
  expectedVersion: number,
): Promise<BumpResult> {
  const { data: plan } = await db
    .from("rehab_plans")
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
    .from("rehab_plans")
    .update({ version: bump.nextVersion })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message, conflict: false };
  return { ok: true, version: bump.nextVersion };
}

async function applyReorder(
  db: RehabDb,
  table: string,
  orderedIds: readonly string[],
  scopeColumn: string,
  scopeValue: string,
  sortColumn: "display_order" | "day_index" | "set_index" = "display_order",
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

type PlanTree = {
  plan: DbRow;
  phases: DbRow[];
  days: DbRow[];
  exercises: DbRow[];
  prescriptions: DbRow[];
  restrictions: DbRow[];
};

async function loadPlanTree(db: RehabDb, planId: string): Promise<PlanTree | null> {
  const { data: plan } = await db
    .from("rehab_plans")
    .select("*")
    .eq("id", planId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!plan) return null;

  const { data: phases } = await db
    .from("rehab_plan_phases")
    .select("*")
    .eq("rehab_plan_id", planId)
    .order("display_order");
  const phaseIds = (phases ?? []).map((p: DbRow) => p.id);

  const { data: days } = phaseIds.length
    ? await db
        .from("rehab_plan_days")
        .select("*")
        .in("rehab_plan_phase_id", phaseIds)
        .order("day_index")
    : { data: [] };
  const dayIds = (days ?? []).map((d: DbRow) => d.id);

  const { data: exercises } = dayIds.length
    ? await db
        .from("rehab_plan_exercises")
        .select("*, rehab_exercise_definitions(name), user_rehab_exercises(custom_name)")
        .in("rehab_plan_day_id", dayIds)
        .order("display_order")
    : { data: [] };
  const exerciseIds = (exercises ?? []).map((e: DbRow) => e.id);

  const { data: prescriptions } = exerciseIds.length
    ? await db
        .from("rehab_set_prescriptions")
        .select("*")
        .in("rehab_plan_exercise_id", exerciseIds)
        .order("set_index")
    : { data: [] };

  const { data: restrictions } = await db
    .from("rehab_restrictions")
    .select("*")
    .eq("rehab_plan_id", planId)
    .order("display_order");

  return {
    plan,
    phases: phases ?? [],
    days: days ?? [],
    exercises: exercises ?? [],
    prescriptions: prescriptions ?? [],
    restrictions: restrictions ?? [],
  };
}

async function insertPhaseTree(
  db: RehabDb,
  planId: string,
  phases: readonly PhaseSeedRow[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const phase of phases) {
    const { data: phaseRow, error: phaseError } = await db
      .from("rehab_plan_phases")
      .insert({
        rehab_plan_id: planId,
        name: phase.name,
        phase_type: phase.phase_type,
        display_order: phase.display_order,
        start_date: phase.start_date,
        end_date: phase.end_date,
        clinician_notes: phase.clinician_notes,
      })
      .select("id")
      .single();
    if (phaseError || !phaseRow)
      return { ok: false, error: phaseError?.message ?? "Could not insert phase." };

    for (const day of phase.days) {
      const { data: dayRow, error: dayError } = await db
        .from("rehab_plan_days")
        .insert({
          rehab_plan_phase_id: phaseRow.id,
          name: day.name,
          day_index: day.day_index,
          description: day.description,
          estimated_duration_minutes: day.estimated_duration_minutes,
        })
        .select("id")
        .single();
      if (dayError || !dayRow)
        return { ok: false, error: dayError?.message ?? "Could not insert day." };

      for (const exercise of day.exercises) {
        const { data: exerciseRow, error: exerciseError } = await db
          .from("rehab_plan_exercises")
          .insert({
            rehab_plan_day_id: dayRow.id,
            rehab_exercise_definition_id: exercise.rehab_exercise_definition_id,
            user_rehab_exercise_id: exercise.user_rehab_exercise_id,
            display_order: exercise.display_order,
            side: exercise.side,
            instructions_snapshot: exercise.instructions_snapshot,
            stop_conditions_snapshot: exercise.stop_conditions_snapshot,
          })
          .select("id")
          .single();
        if (exerciseError || !exerciseRow)
          return {
            ok: false,
            error: exerciseError?.message ?? "Could not insert exercise.",
          };

        if (exercise.prescriptions.length) {
          const { error: rxError } = await db.from("rehab_set_prescriptions").insert(
            exercise.prescriptions.map((p) => ({
              rehab_plan_exercise_id: exerciseRow.id,
              ...p,
            })),
          );
          if (rxError) return { ok: false, error: rxError.message };
        }
      }
    }
  }
  return { ok: true };
}

async function insertDaySeed(
  db: RehabDb,
  phaseId: string,
  day: DaySeedRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: dayRow, error: dayError } = await db
    .from("rehab_plan_days")
    .insert({
      rehab_plan_phase_id: phaseId,
      name: day.name,
      day_index: day.day_index,
      description: day.description,
      estimated_duration_minutes: day.estimated_duration_minutes,
    })
    .select("id")
    .single();
  if (dayError || !dayRow)
    return { ok: false, error: dayError?.message ?? "Could not insert day." };

  for (const exercise of day.exercises) {
    const { data: exerciseRow, error: exerciseError } = await db
      .from("rehab_plan_exercises")
      .insert({
        rehab_plan_day_id: dayRow.id,
        rehab_exercise_definition_id: exercise.rehab_exercise_definition_id,
        user_rehab_exercise_id: exercise.user_rehab_exercise_id,
        display_order: exercise.display_order,
        side: exercise.side,
        instructions_snapshot: exercise.instructions_snapshot,
        stop_conditions_snapshot: exercise.stop_conditions_snapshot,
      })
      .select("id")
      .single();
    if (exerciseError || !exerciseRow)
      return {
        ok: false,
        error: exerciseError?.message ?? "Could not insert exercise.",
      };

    if (exercise.prescriptions.length) {
      const { error: rxError } = await db.from("rehab_set_prescriptions").insert(
        exercise.prescriptions.map((p) => ({
          rehab_plan_exercise_id: exerciseRow.id,
          ...p,
        })),
      );
      if (rxError) return { ok: false, error: rxError.message };
    }
  }
  return { ok: true };
}

async function loadPlanView(
  db: RehabDb,
  planId: string,
): Promise<RehabPlanSummaryView | null> {
  const tree = await loadPlanTree(db, planId);
  if (!tree) return null;
  return planSummaryView(
    tree.plan,
    tree.phases,
    tree.days,
    tree.exercises,
    tree.prescriptions,
    tree.restrictions,
  );
}

export async function listPlansAction(): Promise<RehabPlanSummaryView[]> {
  const context = await authenticatedDb();
  if (!context) return [];
  const { db } = context;
  const { data: plans, error } = await db
    .from("rehab_plans")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error || !plans) return [];

  const results: RehabPlanSummaryView[] = [];
  for (const plan of plans) {
    const view = await loadPlanView(db, String(plan.id));
    if (view) results.push(view);
  }
  return results;
}

export async function getPlanAction(
  input: unknown,
): Promise<RehabPlanSummaryView | null> {
  const parsed = getPlanSchema.safeParse(input);
  if (!parsed.success) return null;
  const context = await authenticatedDb();
  if (!context) return null;
  return loadPlanView(context.db, parsed.data.planId);
}

export async function listCatalogAction(): Promise<RehabExerciseCatalogView[]> {
  const context = await authenticatedDb();
  if (!context) return [];
  const { data, error } = await context.db
    .from("rehab_exercise_definitions")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error || !data) return [];
  return data.map((row: DbRow) => ({
    id: String(row.id),
    stableKey: String(row.stable_key),
    name: String(row.name),
    exerciseCategory: String(row.exercise_category),
    bilateral: Boolean(row.bilateral),
    loadSupported: Boolean(row.load_supported),
    holdSupported: Boolean(row.hold_supported),
    durationSupported: Boolean(row.duration_supported),
    assistanceSupported: Boolean(row.assistance_supported),
    romTrackingSupported: Boolean(row.rom_tracking_supported),
  }));
}

export async function createPlanAction(input: unknown): Promise<IdResult> {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data, error } = await db
    .from("rehab_plans")
    .insert({
      user_id: userId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      objective: parsed.data.objective ?? null,
      side: parsed.data.side ?? "not_applicable",
      body_area_id: parsed.data.bodyAreaId ?? null,
      clinician_source_id: parsed.data.clinicianSourceId ?? null,
    })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not create plan." };

  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, id: String(data.id), message: "Rehab plan created" };
}

export async function updatePlanAction(input: unknown): Promise<PlanActionResult> {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid plan update." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { error } = await db
    .from("rehab_plans")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      objective: parsed.data.objective,
      side: parsed.data.side,
      body_area_id: parsed.data.bodyAreaId,
      clinician_source_id: parsed.data.clinicianSourceId,
    })
    .eq("id", parsed.data.planId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, message: "Plan updated" };
}

export async function archivePlanAction(input: unknown): Promise<PlanActionResult> {
  const parsed = archivePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid archive request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { data: plan } = await db
    .from("rehab_plans")
    .select("id, version")
    .eq("id", parsed.data.planId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Plan not found.", conflict: true };

  const bump = bumpVersionOrConflict(
    parsed.data.expectedVersion,
    numberValue(plan.version),
  );
  if (!bump.ok) {
    return {
      ok: false,
      error: "Plan changed elsewhere — refresh and try again.",
      conflict: true,
    };
  }

  const { error } = await db.rpc("archive_rehab_plan", {
    p_plan_id: parsed.data.planId,
    p_expected_version: parsed.data.expectedVersion,
  });
  if (error) {
    const message = error.message ?? "Could not archive plan.";
    return {
      ok: false,
      error: message,
      conflict: message.toLowerCase().includes("conflict"),
    };
  }

  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, message: "Plan archived" };
}

export async function copyPlanAction(input: unknown): Promise<IdResult> {
  const parsed = copyPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid copy request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const tree = await loadPlanTree(db, parsed.data.planId);
  if (!tree) return { ok: false, error: "Plan not found." };
  const seed = buildPlanTreeSeed(tree);

  const { data: newPlan, error } = await db
    .from("rehab_plans")
    .insert({
      user_id: userId,
      name: `${tree.plan.name} (copy)`,
      description: tree.plan.description,
      objective: tree.plan.objective,
      side: tree.plan.side,
      body_area_id: tree.plan.body_area_id,
      clinician_source_id: tree.plan.clinician_source_id,
    })
    .select("id")
    .single();
  if (error || !newPlan)
    return { ok: false, error: error?.message ?? "Could not copy plan." };

  const inserted = await insertPhaseTree(db, String(newPlan.id), seed.phases);
  if (!inserted.ok) return { ok: false, error: inserted.error };

  for (const restriction of tree.restrictions) {
    await db.from("rehab_restrictions").insert({
      rehab_plan_id: newPlan.id,
      restriction_type: restriction.restriction_type,
      body_area_id: restriction.body_area_id,
      side: restriction.side,
      value_text: restriction.value_text,
      numeric_min: restriction.numeric_min,
      numeric_max: restriction.numeric_max,
      unit: restriction.unit,
      severity: restriction.severity,
      source: restriction.source,
      effective_from: restriction.effective_from,
      effective_until: restriction.effective_until,
      active: restriction.active,
    });
  }

  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, id: String(newPlan.id), message: "Plan copied" };
}

export async function newVersionPlanAction(input: unknown): Promise<IdResult> {
  return copyPlanAction(input);
}

export async function addPhaseAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addPhaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid phase request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: phases } = await db
    .from("rehab_plan_phases")
    .select("display_order")
    .eq("rehab_plan_id", parsed.data.planId)
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = phases?.length ? numberValue(phases[0].display_order) + 1 : 0;

  const { error } = await db.from("rehab_plan_phases").insert({
    rehab_plan_id: parsed.data.planId,
    name: parsed.data.name,
    phase_type: parsed.data.phaseType ?? "custom",
    display_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await loadPlanView(db, parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Phase added" };
}

export async function reorderPhasesAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = reorderPhasesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reorder request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "rehab_plan_phases",
    parsed.data.orderedPhaseIds,
    "rehab_plan_id",
    parsed.data.planId,
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await loadPlanView(db, parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found after reorder." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Phases reordered" };
}

export async function reorderDaysAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = reorderDaysSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reorder request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForPhase(db, parsed.data.phaseId);
  if (!planId) return { ok: false, error: "Phase not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "rehab_plan_days",
    parsed.data.orderedDayIds,
    "rehab_plan_phase_id",
    parsed.data.phaseId,
    "day_index",
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after reorder." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Days reordered" };
}

export async function reorderExercisesAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = reorderExercisesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reorder request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForDay(db, parsed.data.dayId);
  if (!planId) return { ok: false, error: "Day not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "rehab_plan_exercises",
    parsed.data.orderedExerciseIds,
    "rehab_plan_day_id",
    parsed.data.dayId,
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after reorder." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Exercises reordered" };
}

export async function reorderPrescriptionsAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = reorderPrescriptionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reorder request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForExercise(db, parsed.data.exerciseId);
  if (!planId) return { ok: false, error: "Exercise not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "rehab_set_prescriptions",
    parsed.data.orderedPrescriptionIds,
    "rehab_plan_exercise_id",
    parsed.data.exerciseId,
    "set_index",
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after reorder." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Prescriptions reordered" };
}

export async function reorderRestrictionsAction(
  input: unknown,
): Promise<PlanMutationResult> {
  const parsed = reorderRestrictionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reorder request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const reorder = await applyReorder(
    db,
    "rehab_restrictions",
    parsed.data.orderedRestrictionIds,
    "rehab_plan_id",
    parsed.data.planId,
  );
  if (!reorder.ok) return { ok: false, error: reorder.error };

  const plan = await loadPlanView(db, parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found after reorder." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Restrictions reordered" };
}

export async function addDayAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid day request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForPhase(db, parsed.data.phaseId);
  if (!planId) return { ok: false, error: "Phase not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: days } = await db
    .from("rehab_plan_days")
    .select("day_index")
    .eq("rehab_plan_phase_id", parsed.data.phaseId)
    .order("day_index", { ascending: false })
    .limit(1);
  const nextIndex = days?.length ? numberValue(days[0].day_index) + 1 : 0;

  const { error } = await db.from("rehab_plan_days").insert({
    rehab_plan_phase_id: parsed.data.phaseId,
    name: parsed.data.name ?? `Day ${nextIndex + 1}`,
    day_index: nextIndex,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Day added" };
}

export async function duplicatePhaseAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = duplicatePhaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid duplicate request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForPhase(db, parsed.data.phaseId);
  if (!planId) return { ok: false, error: "Phase not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const tree = await loadPlanTree(db, planId);
  if (!tree) return { ok: false, error: "Plan not found." };
  const phaseRow = tree.phases.find((p) => String(p.id) === parsed.data.phaseId);
  if (!phaseRow) return { ok: false, error: "Phase not found." };

  const phaseSeed = buildPhaseSeed(
    phaseRow,
    tree.days,
    tree.exercises,
    tree.prescriptions,
  );
  phaseSeed.name = `${phaseSeed.name} (copy)`;
  const maxOrder = tree.phases.reduce(
    (max, row) => Math.max(max, numberValue(row.display_order)),
    -1,
  );
  phaseSeed.display_order = maxOrder + 1;

  const inserted = await insertPhaseTree(db, planId, [phaseSeed]);
  if (!inserted.ok) return { ok: false, error: inserted.error };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Phase duplicated" };
}

export async function duplicateDayAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = duplicateDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid duplicate request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForDay(db, parsed.data.dayId);
  if (!planId) return { ok: false, error: "Day not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const tree = await loadPlanTree(db, planId);
  if (!tree) return { ok: false, error: "Plan not found." };
  const dayRow = tree.days.find((d) => String(d.id) === parsed.data.dayId);
  if (!dayRow) return { ok: false, error: "Day not found." };

  const daySeed = buildDaySeed(dayRow, tree.exercises, tree.prescriptions);
  daySeed.name = `${daySeed.name} (copy)`;
  const phaseDays = tree.days.filter(
    (d) => d.rehab_plan_phase_id === dayRow.rehab_plan_phase_id,
  );
  const maxIndex = phaseDays.reduce(
    (max, row) => Math.max(max, numberValue(row.day_index)),
    -1,
  );
  daySeed.day_index = maxIndex + 1;

  const inserted = await insertDaySeed(db, String(dayRow.rehab_plan_phase_id), daySeed);
  if (!inserted.ok) return { ok: false, error: inserted.error };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Day duplicated" };
}

export async function addExerciseAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addExerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid exercise request." };
  if (!parsed.data.rehabExerciseDefinitionId && !parsed.data.userRehabExerciseId) {
    return { ok: false, error: "Select a catalog or custom exercise." };
  }
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForDay(db, parsed.data.dayId);
  if (!planId) return { ok: false, error: "Day not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: exercises } = await db
    .from("rehab_plan_exercises")
    .select("display_order")
    .eq("rehab_plan_day_id", parsed.data.dayId)
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = exercises?.length ? numberValue(exercises[0].display_order) + 1 : 0;

  const { error } = await db.from("rehab_plan_exercises").insert({
    rehab_plan_day_id: parsed.data.dayId,
    rehab_exercise_definition_id: parsed.data.rehabExerciseDefinitionId ?? null,
    user_rehab_exercise_id: parsed.data.userRehabExerciseId ?? null,
    display_order: nextOrder,
    side: parsed.data.side ?? "not_applicable",
    instructions_snapshot: parsed.data.instructionsSnapshot ?? "",
    stop_conditions_snapshot: parsed.data.stopConditionsSnapshot ?? "",
  });
  if (error) return { ok: false, error: error.message };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Exercise added" };
}

export async function addPrescriptionAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addPrescriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid prescription request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const planId = await planIdForExercise(db, parsed.data.exerciseId);
  if (!planId) return { ok: false, error: "Exercise not found." };

  const bump = await bumpPlanVersion(db, planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: existing } = await db
    .from("rehab_set_prescriptions")
    .select("set_index")
    .eq("rehab_plan_exercise_id", parsed.data.exerciseId)
    .order("set_index", { ascending: false })
    .limit(1);
  const nextIndex = existing?.length ? numberValue(existing[0].set_index) + 1 : 1;

  const { error } = await db.from("rehab_set_prescriptions").insert({
    rehab_plan_exercise_id: parsed.data.exerciseId,
    set_index: nextIndex,
    completion_rule: parsed.data.completionRule ?? "manual",
    target_reps: parsed.data.targetReps ?? null,
    target_duration_seconds: parsed.data.targetDurationSeconds ?? null,
    target_hold_seconds: parsed.data.targetHoldSeconds ?? null,
    pain_limit: parsed.data.painLimit ?? null,
    rom_min_degrees: parsed.data.romMinDegrees ?? null,
    rom_max_degrees: parsed.data.romMaxDegrees ?? null,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await loadPlanView(db, planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Prescription added" };
}

export async function addRestrictionAction(input: unknown): Promise<PlanMutationResult> {
  const parsed = addRestrictionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid restriction request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const bump = await bumpPlanVersion(db, parsed.data.planId, parsed.data.expectedVersion);
  if (!bump.ok) return { ok: false, error: bump.error, conflict: bump.conflict };

  const { data: existing } = await db
    .from("rehab_restrictions")
    .select("display_order")
    .eq("rehab_plan_id", parsed.data.planId)
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = existing?.length ? numberValue(existing[0].display_order) + 1 : 0;

  const { error } = await db.from("rehab_restrictions").insert({
    rehab_plan_id: parsed.data.planId,
    restriction_type: parsed.data.restrictionType,
    value_text: parsed.data.valueText,
    side: parsed.data.side ?? "not_applicable",
    severity: parsed.data.severity ?? "informational",
    source: parsed.data.source ?? "user",
    effective_from: parsed.data.effectiveFrom ?? new Date().toISOString().slice(0, 10),
    effective_until: parsed.data.effectiveUntil ?? null,
    numeric_min: parsed.data.numericMin ?? null,
    numeric_max: parsed.data.numericMax ?? null,
    unit: parsed.data.unit ?? null,
    active: true,
    display_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  const plan = await loadPlanView(db, parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found after update." };
  revalidatePath(ROUTES.rehabPlans);
  return { ok: true, plan, message: "Restriction added" };
}

export async function listClinicianSourcesAction() {
  const context = await authenticatedDb();
  if (!context) return [];
  const { data, error } = await context.db
    .from("rehab_clinician_sources")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(clinicianSourceView);
}

export async function createClinicianSourceAction(input: unknown): Promise<IdResult> {
  const parsed = createClinicianSourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid clinician source." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data, error } = await db
    .from("rehab_clinician_sources")
    .insert({
      user_id: userId,
      source_type: parsed.data.sourceType,
      clinician_name: parsed.data.clinicianName ?? null,
      clinic_name: parsed.data.clinicName ?? null,
      document_title: parsed.data.documentTitle ?? null,
      document_date: parsed.data.documentDate ?? null,
      notes: parsed.data.notes ?? null,
      confirmed_by_user: parsed.data.confirmedByUser ?? false,
    })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not save source." };
  return { ok: true, id: String(data.id), message: "Clinician source saved" };
}

export async function updateClinicianSourceAction(
  input: unknown,
): Promise<PlanActionResult> {
  const parsed = updateClinicianSourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid clinician source update." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db } = context;

  const { error } = await db
    .from("rehab_clinician_sources")
    .update({
      source_type: parsed.data.sourceType,
      clinician_name: parsed.data.clinicianName ?? null,
      clinic_name: parsed.data.clinicName ?? null,
      document_title: parsed.data.documentTitle ?? null,
      document_date: parsed.data.documentDate ?? null,
      notes: parsed.data.notes ?? null,
      confirmed_by_user: parsed.data.confirmedByUser ?? false,
    })
    .eq("id", parsed.data.sourceId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Clinician source updated" };
}

export async function deleteClinicianSourceAction(
  input: unknown,
): Promise<PlanActionResult> {
  const parsed = deleteClinicianSourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid delete request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { error } = await context.db
    .from("rehab_clinician_sources")
    .delete()
    .eq("id", parsed.data.sourceId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Clinician source deleted" };
}

export async function hasActiveRehabRestrictionsAction(): Promise<boolean> {
  const context = await authenticatedDb();
  if (!context) return false;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await context.db
    .from("rehab_restrictions")
    .select("id")
    .eq("active", true)
    .lte("effective_from", today)
    .or(`effective_until.is.null,effective_until.gte.${today}`)
    .limit(1);
  return Boolean(data?.length);
}
