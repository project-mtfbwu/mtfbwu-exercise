import { createSupabaseServerClient } from "@/shared/database/server";
import type {
  MeditationDaySummary,
  MeditationSessionView,
} from "@/modules/meditation/types";

const EMPTY: MeditationDaySummary = {
  totalDurationSeconds: 0,
  sessionCount: 0,
  completedCount: 0,
  recentSessions: [],
};

function sessionView(row: Record<string, unknown>): MeditationSessionView {
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

export async function loadMeditationDaySummary(
  localDate: string,
): Promise<MeditationDaySummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return EMPTY;
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return EMPTY;

  const { data: rows } = await db
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("local_date", localDate)
    .is("deleted_at", null)
    .order("started_at", { ascending: false });

  const sessions = (rows ?? []).map(sessionView);
  return {
    totalDurationSeconds: sessions.reduce((s, x) => s + x.durationSeconds, 0),
    sessionCount: sessions.length,
    completedCount: sessions.filter((x) => x.completed).length,
    recentSessions: sessions.slice(0, 5),
  };
}
