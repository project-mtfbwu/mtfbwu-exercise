import { createSupabaseServerClient } from "@/shared/database/server";
import {
  averageConfidence,
  countCompletedSets,
  sessionMaxPain,
} from "@/modules/rehab/calculations/helpers";
import { comparePainTrend } from "@/modules/rehab/calculations/helpers";

type DbRow = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RehabDb = { from(table: string): any };

export type RehabDayScheduledSummary = {
  id: string;
  title: string;
  status: string;
};

export type RehabDayActiveSessionSummary = {
  id: string;
  title: string;
  startedAt: string;
  totalSets: number;
  completedSets: number;
  unacknowledgedAlerts: number;
  averageConfidence: number | null;
  maxPain: number | null;
};

export type RehabDaySummary = {
  scheduled: RehabDayScheduledSummary | null;
  activeSession: RehabDayActiveSessionSummary | null;
  hasActiveRestrictions: boolean;
};

const EMPTY_SUMMARY: RehabDaySummary = {
  scheduled: null,
  activeSession: null,
  hasActiveRestrictions: false,
};

async function authenticatedDb(): Promise<{ db: RehabDb } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as RehabDb } : null;
}

export async function loadRehabDaySummary(localDate: string): Promise<RehabDaySummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return EMPTY_SUMMARY;
  const context = await authenticatedDb();
  if (!context) return EMPTY_SUMMARY;
  const { db } = context;
  const today = new Date().toISOString().slice(0, 10);

  const { data: scheduledRow } = await db
    .from("scheduled_rehab_sessions")
    .select("id, title, status")
    .eq("local_date", localDate)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: sessionRow } = await db
    .from("rehab_sessions")
    .select("id, title, started_at")
    .eq("status", "in_progress")
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let activeSession: RehabDayActiveSessionSummary | null = null;
  if (sessionRow) {
    const { data: exerciseRows } = await db
      .from("rehab_session_exercises")
      .select("id")
      .eq("rehab_session_id", sessionRow.id);
    const exerciseIds = (exerciseRows ?? []).map((row: DbRow) => row.id);
    const { data: setRows } = exerciseIds.length
      ? await db
          .from("rehab_sets")
          .select("status, pain_before, pain_during, pain_after, confidence")
          .in("rehab_session_exercise_id", exerciseIds)
      : { data: [] };
    const sets = (setRows ?? []) as DbRow[];
    const { data: alertRows } = await db
      .from("rehab_alert_events")
      .select("acknowledged_at")
      .eq("rehab_session_id", sessionRow.id);
    const alerts = alertRows ?? [];

    activeSession = {
      id: String(sessionRow.id),
      title: String(sessionRow.title ?? "Rehab"),
      startedAt: String(sessionRow.started_at),
      totalSets: sets.length,
      completedSets: countCompletedSets(
        sets.map((s) => ({ status: String(s.status) as "completed" })),
      ),
      unacknowledgedAlerts: alerts.filter((a: DbRow) => !a.acknowledged_at).length,
      averageConfidence: averageConfidence(
        sets.map((s) => ({
          status: String(s.status) as "completed",
          confidence: s.confidence != null ? Number(s.confidence) : null,
        })),
      ),
      maxPain: sessionMaxPain(
        sets.map((s) => ({
          status: String(s.status) as "completed",
          painBefore: s.pain_before != null ? Number(s.pain_before) : null,
          painDuring: s.pain_during != null ? Number(s.pain_during) : null,
          painAfter: s.pain_after != null ? Number(s.pain_after) : null,
        })),
      ),
    };
  }

  const { data: restrictionRows } = await db
    .from("rehab_restrictions")
    .select("id")
    .eq("active", true)
    .lte("effective_from", today)
    .or(`effective_until.is.null,effective_until.gte.${today}`)
    .limit(1);

  return {
    scheduled: scheduledRow
      ? {
          id: String(scheduledRow.id),
          title: String(scheduledRow.title),
          status: String(scheduledRow.status),
        }
      : null,
    activeSession,
    hasActiveRestrictions: Boolean(restrictionRows?.length),
  };
}

export function rehabPainTrendLabel(
  currentMaxPain: number | null,
  previousMaxPain: number | null,
): string | null {
  return comparePainTrend({ currentMaxPain, previousMaxPain });
}
