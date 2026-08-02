import { createSupabaseServerClient } from "@/shared/database/server";
import { sumHydrationMl } from "@/modules/hydration/calculations";
import type { HydrationDaySummary, HydrationEntryView } from "@/modules/hydration/types";

type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const EMPTY: HydrationDaySummary = {
  totalMl: 0,
  entryCount: 0,
  target: null,
  recentEntries: [],
};

function entryView(row: Record<string, unknown>): HydrationEntryView {
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

async function auth(): Promise<{ db: Db; userId: string } | null> {
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  return { db, userId: user.id };
}

async function loadHydrationTarget(
  db: Db,
  userId: string,
  localDate: string,
): Promise<HydrationDaySummary["target"]> {
  const { data: userTracker } = await db
    .from("user_trackers")
    .select("id, tracker_definitions!inner(stable_key)")
    .eq("user_id", userId)
    .eq("enabled", true)
    .is("archived_at", null)
    .eq("tracker_definitions.stable_key", "hydration")
    .maybeSingle();

  if (!userTracker) return null;

  const { data: target } = await db
    .from("tracker_targets")
    .select("*")
    .eq("user_tracker_id", userTracker.id)
    .lte("effective_from", localDate)
    .or(`effective_until.is.null,effective_until.gte.${localDate}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!target) return null;

  return {
    targetMl: target.target_value != null ? Number(target.target_value) : null,
    confirmedByUser: Boolean(target.confirmed_by_user),
    effectiveFrom: String(target.effective_from),
  };
}

export async function loadHydrationDaySummary(
  localDate: string,
): Promise<HydrationDaySummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return EMPTY;
  const ctx = await auth();
  if (!ctx) return EMPTY;
  const { db, userId } = ctx;

  const { data: rows } = await db
    .from("hydration_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false });

  const entries = (rows ?? []).map(entryView);
  const target = await loadHydrationTarget(db, userId, localDate);

  return {
    totalMl: sumHydrationMl(entries),
    entryCount: entries.length,
    target,
    recentEntries: entries.slice(0, 5),
  };
}
