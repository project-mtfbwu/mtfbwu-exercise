import { createSupabaseServerClient } from "@/shared/database/server";
import type { SleepDaySummary, SleepSessionView } from "@/modules/sleep/types";

const EMPTY: SleepDaySummary = {
  sessions: [],
  primarySession: null,
  totalDurationSeconds: 0,
};

function sessionView(row: Record<string, unknown>): SleepSessionView {
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

export async function loadSleepDaySummary(sleepDate: string): Promise<SleepDaySummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sleepDate)) return EMPTY;
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return EMPTY;

  const { data: rows } = await db
    .from("sleep_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("sleep_date", sleepDate)
    .is("deleted_at", null)
    .order("bedtime_at", { ascending: false });

  const sessions = (rows ?? []).map(sessionView);
  const primary = sessions.find((s) => !s.nap) ?? sessions[0] ?? null;
  return {
    sessions,
    primarySession: primary,
    totalDurationSeconds: sessions.reduce((s, x) => s + x.durationSeconds, 0),
  };
}
