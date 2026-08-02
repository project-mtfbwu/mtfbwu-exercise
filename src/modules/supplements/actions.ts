"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  createUserSupplementSchema,
  deleteSupplementIntakeSchema,
  recordSupplementIntakeSchema,
  updateUserSupplementSchema,
} from "@/modules/supplements/schemas";
import type {
  SupplementDefinitionView,
  UserSupplementView,
} from "@/modules/supplements/types";

type ActionResult =
  { ok: true; message: string; id?: string } | { ok: false; error: string };
type DbRow = Record<string, unknown>;

function revalidate() {
  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.calendar);
  revalidatePath(ROUTES.settings);
}

async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function listSupplementDefinitionsAction(): Promise<
  SupplementDefinitionView[]
> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("supplement_definitions")
    .select("*")
    .eq("active", true)
    .order("display_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DbRow) => ({
    id: String(row.id),
    stableKey: (row.stable_key as string | null) ?? null,
    displayName: String(row.display_name),
    form: row.form as SupplementDefinitionView["form"],
    defaultUnit: (row.default_unit as string | null) ?? null,
  }));
}

export async function listUserSupplementsAction(): Promise<UserSupplementView[]> {
  const { supabase, userId } = await requireAuth();
  const { data, error } = await supabase
    .from("user_supplements")
    .select("*, supplement_definitions(display_name)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DbRow) => {
    const catalog = row.supplement_definitions as DbRow | null;
    const customName = (row.custom_name as string | null)?.trim() ?? null;
    return {
      id: String(row.id),
      supplementDefinitionId: row.supplement_definition_id
        ? String(row.supplement_definition_id)
        : null,
      customName,
      brand: (row.brand as string | null) ?? null,
      servingAmount: row.serving_amount != null ? Number(row.serving_amount) : null,
      servingUnit: (row.serving_unit as string | null) ?? null,
      instructionsText: (row.instructions_text as string | null) ?? null,
      active: Boolean(row.active),
      displayName: customName || String(catalog?.display_name ?? "Supplement"),
    };
  });
}

export async function createUserSupplementAction(input: unknown): Promise<ActionResult> {
  const parsed = createUserSupplementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  if (!parsed.data.supplementDefinitionId && !parsed.data.customName) {
    return { ok: false, error: "Choose a catalog supplement or enter a custom name." };
  }
  const { supabase, userId } = await requireAuth();
  const { data, error } = await supabase
    .from("user_supplements")
    .insert({
      user_id: userId,
      supplement_definition_id: parsed.data.supplementDefinitionId ?? null,
      custom_name: parsed.data.customName ?? null,
      brand: parsed.data.brand ?? null,
      serving_amount: parsed.data.servingAmount ?? null,
      serving_unit: parsed.data.servingUnit ?? null,
      instructions_text: parsed.data.instructionsText ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Supplement added.", id: String(data.id) };
}

export async function updateUserSupplementAction(input: unknown): Promise<ActionResult> {
  const parsed = updateUserSupplementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("user_supplements")
    .update({
      custom_name: parsed.data.customName,
      brand: parsed.data.brand,
      serving_amount: parsed.data.servingAmount,
      serving_unit: parsed.data.servingUnit,
      instructions_text: parsed.data.instructionsText,
      active: parsed.data.active,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Supplement updated." };
}

export async function recordSupplementIntakeAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = recordSupplementIntakeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const id = parsed.data.id ?? crypto.randomUUID();
  const { data, error } = await supabase
    .from("supplement_intakes")
    .upsert({
      id,
      user_id: userId,
      user_supplement_id: parsed.data.userSupplementId,
      daily_record_id: parsed.data.dailyRecordId ?? null,
      local_date: parsed.data.localDate,
      taken_at: new Date().toISOString(),
      status: parsed.data.status,
      amount: parsed.data.amount ?? null,
      unit: parsed.data.unit ?? null,
      note: parsed.data.note ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Intake recorded.", id: String(data.id) };
}

export async function deleteSupplementIntakeAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = deleteSupplementIntakeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("supplement_intakes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Intake removed." };
}
