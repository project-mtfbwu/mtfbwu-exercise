"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import { sleepDateFromBedtime, sleepDurationSeconds } from "@/modules/sleep/calculations";
import {
  deleteSleepSessionSchema,
  saveSleepSessionSchema,
} from "@/modules/sleep/schemas";
import type { SleepSessionView } from "@/modules/sleep/types";

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

function sessionView(row: DbRow): SleepSessionView {
  return {
    id: String(row.id),
    sleepDate: String(row.sleep_date),
    timezone: String(row.timezone),
    bedtimeAt: String(row.bedtime_at),
    wakeAt: String(row.wake_at),
    durationSeconds: Number(row.duration_seconds),
    quality: (row.quality as SleepSessionView["quality"]) ?? null,
    interruptions: row.interruptions != null ? Number(row.interruptions) : null,
    nap: Boolean(row.nap),
    source: row.source as SleepSessionView["source"],
    note: (row.note as string | null) ?? null,
  };
}

export async function saveSleepSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = saveSleepSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const duration = sleepDurationSeconds(parsed.data.bedtimeAt, parsed.data.wakeAt);
  if (duration <= 0) return { ok: false, error: "Wake time must be after bedtime." };

  const sleepDate = sleepDateFromBedtime(parsed.data.bedtimeAt, parsed.data.timezone);
  const id = parsed.data.id ?? crypto.randomUUID();

  const { data, error } = await supabase
    .from("sleep_sessions")
    .upsert({
      id,
      user_id: userId,
      sleep_date: sleepDate,
      timezone: parsed.data.timezone,
      bedtime_at: parsed.data.bedtimeAt,
      wake_at: parsed.data.wakeAt,
      duration_seconds: duration,
      quality: parsed.data.quality ?? null,
      interruptions: parsed.data.interruptions ?? null,
      nap: parsed.data.nap,
      note: parsed.data.note ?? null,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Sleep logged.", id: String(data.id) };
}

export async function deleteSleepSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteSleepSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const { error } = await supabase
    .from("sleep_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Sleep entry removed." };
}

export async function listSleepSessionsAction(
  sleepDate: string,
): Promise<SleepSessionView[]> {
  const { supabase, userId } = await requireAuth();
  const { data, error } = await supabase
    .from("sleep_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("sleep_date", sleepDate)
    .is("deleted_at", null)
    .order("bedtime_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(sessionView);
}
