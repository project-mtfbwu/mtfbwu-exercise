"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  addHydrationEntrySchema,
  deleteHydrationEntrySchema,
  setHydrationTargetSchema,
} from "@/modules/hydration/schemas";
import type { HydrationEntryView } from "@/modules/hydration/types";

type ActionResult =
  { ok: true; message: string; id?: string } | { ok: false; error: string };
type DbRow = Record<string, unknown>;

function revalidate() {
  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.calendar);
  revalidatePath(ROUTES.history);
}

async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function entryView(row: DbRow): HydrationEntryView {
  return {
    id: String(row.id),
    localDate: String(row.local_date),
    occurredAt: String(row.occurred_at),
    amountMl: Number(row.amount_ml),
    vesselLabel: (row.vessel_label as string | null) ?? null,
    source: row.source as HydrationEntryView["source"],
    note: (row.note as string | null) ?? null,
  };
}

export async function addHydrationEntryAction(input: unknown): Promise<ActionResult> {
  const parsed = addHydrationEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const id = parsed.data.id ?? crypto.randomUUID();
  const { data, error } = await supabase
    .from("hydration_entries")
    .upsert({
      id,
      user_id: userId,
      daily_record_id: parsed.data.dailyRecordId ?? null,
      local_date: parsed.data.localDate,
      occurred_at: new Date().toISOString(),
      amount_ml: parsed.data.amountMl,
      vessel_label: parsed.data.vesselLabel ?? null,
      note: parsed.data.note ?? null,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Hydration logged.", id: String(data.id) };
}

export async function deleteHydrationEntryAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteHydrationEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const { error } = await supabase
    .from("hydration_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Entry removed." };
}

export async function listHydrationEntriesAction(
  localDate: string,
): Promise<HydrationEntryView[]> {
  const { supabase, userId } = await requireAuth();
  const { data, error } = await supabase
    .from("hydration_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(entryView);
}

export async function setHydrationTargetAction(input: unknown): Promise<ActionResult> {
  const parsed = setHydrationTargetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const { data: tracker } = await supabase
    .from("user_trackers")
    .select("id")
    .eq("id", parsed.data.userTrackerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!tracker) return { ok: false, error: "Hydration tracker not found." };

  const { error } = await supabase.from("tracker_targets").upsert({
    user_tracker_id: parsed.data.userTrackerId,
    effective_from: parsed.data.effectiveFrom,
    target_value: parsed.data.targetMl,
    target_unit: "ml",
    target_frequency: "daily",
    confirmed_by_user: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Hydration target saved." };
}

export async function getHydrationUserTrackerIdAction(): Promise<string | null> {
  const { supabase, userId } = await requireAuth();
  const { data } = await supabase
    .from("user_trackers")
    .select("id, tracker_definitions!inner(stable_key)")
    .eq("user_id", userId)
    .eq("enabled", true)
    .is("archived_at", null)
    .eq("tracker_definitions.stable_key", "hydration")
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}
