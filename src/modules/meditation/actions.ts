"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  deleteMeditationSessionSchema,
  saveMeditationSessionSchema,
} from "@/modules/meditation/schemas";
import type { MeditationSessionView } from "@/modules/meditation/types";

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

function sessionView(row: DbRow): MeditationSessionView {
  return {
    id: String(row.id),
    localDate: String(row.local_date),
    startedAt: String(row.started_at),
    completedAt: (row.completed_at as string | null) ?? null,
    durationSeconds: Number(row.duration_seconds),
    meditationType: row.meditation_type as MeditationSessionView["meditationType"],
    completed: Boolean(row.completed),
    note: (row.note as string | null) ?? null,
  };
}

export async function saveMeditationSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = saveMeditationSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const id = parsed.data.id ?? crypto.randomUUID();
  const { data, error } = await supabase
    .from("meditation_sessions")
    .upsert({
      id,
      user_id: userId,
      daily_record_id: parsed.data.dailyRecordId ?? null,
      local_date: parsed.data.localDate,
      started_at: parsed.data.startedAt,
      completed_at: parsed.data.completedAt ?? new Date().toISOString(),
      duration_seconds: parsed.data.durationSeconds,
      meditation_type: parsed.data.meditationType,
      completed: parsed.data.completed,
      note: parsed.data.note ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Meditation session saved.", id: String(data.id) };
}

export async function deleteMeditationSessionAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = deleteMeditationSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();

  const { error } = await supabase
    .from("meditation_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Session removed." };
}

export async function listMeditationSessionsAction(
  localDate: string,
): Promise<MeditationSessionView[]> {
  const { supabase, userId } = await requireAuth();
  const { data, error } = await supabase
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .is("deleted_at", null)
    .order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(sessionView);
}
