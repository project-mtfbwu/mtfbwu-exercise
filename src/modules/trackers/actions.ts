"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  archiveUserTrackerSchema,
  createCustomTrackerSchema,
  deleteTrackerEventSchema,
  deleteTrackerReminderSchema,
  enableTrackerSchema,
  restoreUserTrackerSchema,
  saveTrackerEventSchema,
  saveTrackerReminderSchema,
  setTrackerTargetSchema,
  updateCustomTrackerSchema,
} from "@/modules/trackers/schemas";
import type {
  TrackerDefinitionView,
  TrackerEventView,
  TrackerReminderView,
  UserTrackerView,
} from "@/modules/trackers/types";

type ActionResult =
  { ok: true; message: string; id?: string } | { ok: false; error: string };
type DbRow = Record<string, unknown>;

function revalidate() {
  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.settings);
  revalidatePath(ROUTES.customize);
  revalidatePath(ROUTES.profile);
}

async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function listTrackerCatalogAction(): Promise<TrackerDefinitionView[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("tracker_definitions")
    .select("*")
    .eq("active", true)
    .order("display_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DbRow) => ({
    id: String(row.id),
    stableKey: String(row.stable_key),
    displayName: String(row.display_name),
    description: (row.description as string | null) ?? null,
    trackerType: row.tracker_type as TrackerDefinitionView["trackerType"],
    valueType: row.value_type as TrackerDefinitionView["valueType"],
    defaultUnit: (row.default_unit as string | null) ?? null,
    supportsTarget: Boolean(row.supports_target),
    supportsStreak: Boolean(row.supports_streak),
  }));
}

export async function listUserTrackersAction(
  includeArchived = false,
): Promise<UserTrackerView[]> {
  const { supabase, userId } = await requireAuth();
  let query = supabase
    .from("user_trackers")
    .select("*, tracker_definitions(stable_key, display_name)")
    .eq("user_id", userId);
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query.order("display_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DbRow) => {
    const catalog = row.tracker_definitions as DbRow | null;
    const customName = (row.custom_name as string | null)?.trim() ?? null;
    return {
      id: String(row.id),
      trackerDefinitionId: row.tracker_definition_id
        ? String(row.tracker_definition_id)
        : null,
      customName,
      customDescription: (row.custom_description as string | null) ?? null,
      enabled: Boolean(row.enabled),
      unit: (row.unit as string | null) ?? null,
      archivedAt: (row.archived_at as string | null) ?? null,
      displayName: customName || String(catalog?.display_name ?? "Tracker"),
      stableKey: catalog?.stable_key ? String(catalog.stable_key) : null,
    };
  });
}

export async function enableTrackerAction(input: unknown): Promise<ActionResult> {
  const parsed = enableTrackerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const { data: catalog } = await supabase
    .from("tracker_definitions")
    .select("default_unit")
    .eq("id", parsed.data.trackerDefinitionId)
    .maybeSingle();
  if (!catalog) return { ok: false, error: "Tracker not found." };

  const { data: existing } = await supabase
    .from("user_trackers")
    .select("id")
    .eq("user_id", userId)
    .eq("tracker_definition_id", parsed.data.trackerDefinitionId)
    .is("archived_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_trackers")
      .update({ enabled: true, unit: parsed.data.unit ?? catalog.default_unit })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("user_trackers").insert({
      user_id: userId,
      tracker_definition_id: parsed.data.trackerDefinitionId,
      unit: parsed.data.unit ?? catalog.default_unit,
      enabled: true,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, message: "Tracker enabled." };
}

export async function createCustomTrackerAction(input: unknown): Promise<ActionResult> {
  const parsed = createCustomTrackerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { data, error } = await supabase
    .from("user_trackers")
    .insert({
      user_id: userId,
      custom_name: parsed.data.customName,
      custom_description: parsed.data.customDescription ?? null,
      unit: parsed.data.unit ?? null,
      enabled: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Custom tracker created.", id: String(data.id) };
}

export async function updateCustomTrackerAction(input: unknown): Promise<ActionResult> {
  const parsed = updateCustomTrackerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("user_trackers")
    .update({ custom_name: parsed.data.customName })
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .is("tracker_definition_id", null);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Tracker renamed." };
}

export async function setTrackerTargetAction(input: unknown): Promise<ActionResult> {
  const parsed = setTrackerTargetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const { data: tracker } = await supabase
    .from("user_trackers")
    .select("id")
    .eq("id", parsed.data.userTrackerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!tracker) return { ok: false, error: "Tracker not found." };

  const { error } = await supabase.from("tracker_targets").upsert({
    user_tracker_id: parsed.data.userTrackerId,
    effective_from: parsed.data.effectiveFrom,
    target_value: parsed.data.targetValue ?? null,
    target_unit: parsed.data.targetUnit ?? null,
    target_frequency: parsed.data.targetFrequency,
    days_of_week: parsed.data.daysOfWeek ?? null,
    confirmed_by_user: parsed.data.confirmedByUser ?? false,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Target saved." };
}

export async function saveTrackerEventAction(input: unknown): Promise<ActionResult> {
  const parsed = saveTrackerEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const id = parsed.data.id ?? crypto.randomUUID();
  const { data, error } = await supabase
    .from("tracker_events")
    .upsert({
      id,
      user_id: userId,
      user_tracker_id: parsed.data.userTrackerId,
      local_date: parsed.data.localDate,
      timezone: parsed.data.timezone,
      occurred_at: new Date().toISOString(),
      value_numeric: parsed.data.valueNumeric ?? null,
      value_boolean: parsed.data.valueBoolean ?? null,
      value_text: parsed.data.valueText ?? null,
      duration_seconds: parsed.data.durationSeconds ?? null,
      unit: parsed.data.unit ?? null,
      note: parsed.data.note ?? null,
      source: "manual",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("recalculate_tracker_daily_summary", {
    p_user_tracker_id: parsed.data.userTrackerId,
    p_local_date: parsed.data.localDate,
  });

  revalidate();
  return { ok: true, message: "Event saved.", id: String(data.id) };
}

export async function deleteTrackerEventAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteTrackerEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const { data: event } = await supabase
    .from("tracker_events")
    .select("user_tracker_id, local_date")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("tracker_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  if (event) {
    await supabase.rpc("recalculate_tracker_daily_summary", {
      p_user_tracker_id: event.user_tracker_id,
      p_local_date: event.local_date,
    });
  }
  revalidate();
  return { ok: true, message: "Event removed." };
}

export async function archiveUserTrackerAction(input: unknown): Promise<ActionResult> {
  const parsed = archiveUserTrackerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("user_trackers")
    .update({ archived_at: new Date().toISOString(), enabled: false })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Tracker archived." };
}

export async function restoreUserTrackerAction(input: unknown): Promise<ActionResult> {
  const parsed = restoreUserTrackerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("user_trackers")
    .update({ archived_at: null, enabled: true })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Tracker restored." };
}

export async function listTrackerEventsAction(
  userTrackerId: string,
  localDate: string,
): Promise<TrackerEventView[]> {
  const { supabase, userId } = await requireAuth();
  const { data, error } = await supabase
    .from("tracker_events")
    .select("*")
    .eq("user_id", userId)
    .eq("user_tracker_id", userTrackerId)
    .eq("local_date", localDate)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DbRow) => ({
    id: String(row.id),
    userTrackerId: String(row.user_tracker_id),
    localDate: String(row.local_date),
    occurredAt: String(row.occurred_at),
    valueNumeric: row.value_numeric != null ? Number(row.value_numeric) : null,
    valueBoolean: row.value_boolean != null ? Boolean(row.value_boolean) : null,
    valueText: (row.value_text as string | null) ?? null,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    unit: (row.unit as string | null) ?? null,
    source: row.source as TrackerEventView["source"],
    note: (row.note as string | null) ?? null,
  }));
}

function reminderLabel(
  row: DbRow,
  trackerNames: Map<string, string>,
  supplementNames: Map<string, string>,
): string {
  const type = String(row.reminder_type);
  if (type === "bedtime") return "Bedtime";
  if (type === "wake") return "Wake";
  if (type === "custom") return "Custom reminder";
  const trackerId = row.user_tracker_id ? String(row.user_tracker_id) : null;
  if (trackerId && trackerNames.has(trackerId)) {
    return `Tracker · ${trackerNames.get(trackerId)}`;
  }
  const supplementId = row.user_supplement_id ? String(row.user_supplement_id) : null;
  if (supplementId && supplementNames.has(supplementId)) {
    return `Supplement · ${supplementNames.get(supplementId)}`;
  }
  return type === "supplement" ? "Supplement reminder" : "Tracker reminder";
}

export async function listTrackerRemindersAction(): Promise<TrackerReminderView[]> {
  const { supabase, userId } = await requireAuth();
  const [remindersRes, trackersRes, supplementsRes] = await Promise.all([
    supabase
      .from("tracker_reminders")
      .select("*")
      .eq("user_id", userId)
      .order("local_time"),
    supabase
      .from("user_trackers")
      .select("id, custom_name, tracker_definitions(display_name)")
      .eq("user_id", userId),
    supabase
      .from("user_supplements")
      .select("id, custom_name, supplement_definitions(display_name)")
      .eq("user_id", userId),
  ]);
  if (remindersRes.error) throw new Error(remindersRes.error.message);

  const trackerNames = new Map<string, string>();
  for (const row of trackersRes.data ?? []) {
    const catalog = row.tracker_definitions as DbRow | null;
    const customName = (row.custom_name as string | null)?.trim() ?? null;
    trackerNames.set(
      String(row.id),
      customName || String(catalog?.display_name ?? "Tracker"),
    );
  }
  const supplementNames = new Map<string, string>();
  for (const row of supplementsRes.data ?? []) {
    const catalog = row.supplement_definitions as DbRow | null;
    const customName = (row.custom_name as string | null)?.trim() ?? null;
    supplementNames.set(
      String(row.id),
      customName || String(catalog?.display_name ?? "Supplement"),
    );
  }

  return (remindersRes.data ?? []).map((row: DbRow) => ({
    id: String(row.id),
    reminderType: row.reminder_type as TrackerReminderView["reminderType"],
    userTrackerId: row.user_tracker_id ? String(row.user_tracker_id) : null,
    userSupplementId: row.user_supplement_id ? String(row.user_supplement_id) : null,
    localTime: String(row.local_time).slice(0, 5),
    timezone: String(row.timezone),
    daysOfWeek: (row.days_of_week as number[]) ?? [],
    enabled: Boolean(row.enabled),
    label: reminderLabel(row, trackerNames, supplementNames),
  }));
}

export async function saveTrackerReminderAction(input: unknown): Promise<ActionResult> {
  const parsed = saveTrackerReminderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const id = parsed.data.id ?? crypto.randomUUID();
  const localTime =
    parsed.data.localTime.length === 5
      ? `${parsed.data.localTime}:00`
      : parsed.data.localTime;

  const { error } = await supabase.from("tracker_reminders").upsert({
    id,
    user_id: userId,
    reminder_type: parsed.data.reminderType,
    user_tracker_id:
      parsed.data.reminderType === "tracker" ? (parsed.data.userTrackerId ?? null) : null,
    user_supplement_id:
      parsed.data.reminderType === "supplement"
        ? (parsed.data.userSupplementId ?? null)
        : null,
    local_time: localTime,
    timezone: parsed.data.timezone,
    days_of_week: parsed.data.daysOfWeek,
    enabled: parsed.data.enabled,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Reminder preference saved.", id };
}

export async function deleteTrackerReminderAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteTrackerReminderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("tracker_reminders")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Reminder removed." };
}
