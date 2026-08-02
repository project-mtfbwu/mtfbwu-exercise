import { createSupabaseServerClient } from "@/shared/database/server";
import {
  buildDayMapForMonth,
  bumpDayIndicator,
  countCustomEventsByDate,
  monthRange,
  type DayIndicator,
  type MonthIndicators,
} from "@/modules/calendar/month-indicator-helpers";

export type { DayIndicator, MonthIndicators };

type LooseDb = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: unknown,
      ) => {
        gte: (
          col: string,
          val: string,
        ) => {
          lte: (
            col: string,
            val: string,
          ) => Promise<{ data: Record<string, unknown>[] | null }>;
        };
        is: (
          col: string,
          val: null,
        ) => {
          eq: (
            col: string,
            val: unknown,
          ) => Promise<{ data: Record<string, unknown>[] | null }>;
        };
      };
      in: (
        col: string,
        vals: string[],
      ) => Promise<{ data: Record<string, unknown>[] | null }>;
    };
  };
};

/** Compact presence/counts per local date for calendar month grid. */
export async function loadMonthIndicators(
  year: number,
  month: number,
  timezone: string,
): Promise<MonthIndicators> {
  void timezone;
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { year, month, days: [] };

  const dayMap = buildDayMapForMonth(year, month);
  const { start, end } = monthRange(year, month);

  const loose = db as unknown as LooseDb;
  const userId = user.id;

  const { data: customTrackers } = await db
    .from("user_trackers")
    .select("id")
    .eq("user_id", userId)
    .is("tracker_definition_id", null)
    .is("archived_at", null)
    .eq("enabled", true);

  const customTrackerIds = new Set<string>(
    (customTrackers ?? []).map((row) => String(row.id)),
  );

  const { data: dailyRecords } = await loose
    .from("daily_records")
    .select("id, local_date")
    .eq("user_id", userId)
    .gte("local_date", start)
    .lte("local_date", end);

  const recordIds = (dailyRecords ?? []).map((r) => String(r.id));
  const dateByRecord = new Map(
    (dailyRecords ?? []).map((r) => [String(r.id), String(r.local_date)]),
  );

  const bump = (date: string, field: Parameters<typeof bumpDayIndicator>[2]) => {
    bumpDayIndicator(dayMap, date, field);
  };

  if (recordIds.length) {
    const { data: meals } = await loose
      .from("meal_logs")
      .select("daily_record_id")
      .in("daily_record_id", recordIds);
    for (const row of meals ?? []) {
      const date = dateByRecord.get(String(row.daily_record_id));
      if (date) bump(date, "nutrition");
    }

    const { data: workouts } = await loose
      .from("workout_sessions")
      .select("daily_record_id")
      .in("daily_record_id", recordIds);
    for (const row of workouts ?? []) {
      const date = dateByRecord.get(String(row.daily_record_id));
      if (date) bump(date, "workout");
    }

    const { data: rehabs } = await loose
      .from("rehab_sessions")
      .select("daily_record_id")
      .in("daily_record_id", recordIds);
    for (const row of rehabs ?? []) {
      const date = dateByRecord.get(String(row.daily_record_id));
      if (date) bump(date, "rehab");
    }
  }

  const domainQueries = await Promise.all([
    loose
      .from("body_weight_entries")
      .select("local_date")
      .eq("user_id", userId)
      .gte("local_date", start)
      .lte("local_date", end),
    loose
      .from("body_measurement_entries")
      .select("local_date")
      .eq("user_id", userId)
      .gte("local_date", start)
      .lte("local_date", end),
    loose
      .from("progress_photo_sets")
      .select("local_date")
      .eq("user_id", userId)
      .gte("local_date", start)
      .lte("local_date", end),
    loose
      .from("hydration_entries")
      .select("local_date")
      .eq("user_id", userId)
      .gte("local_date", start)
      .lte("local_date", end),
    loose
      .from("meditation_sessions")
      .select("local_date")
      .eq("user_id", userId)
      .gte("local_date", start)
      .lte("local_date", end),
    loose
      .from("sleep_sessions")
      .select("sleep_date")
      .eq("user_id", userId)
      .gte("sleep_date", start)
      .lte("sleep_date", end),
    loose
      .from("supplement_intakes")
      .select("local_date")
      .eq("user_id", userId)
      .gte("local_date", start)
      .lte("local_date", end),
    loose
      .from("tracker_events")
      .select("local_date, user_tracker_id")
      .eq("user_id", userId)
      .gte("local_date", start)
      .lte("local_date", end),
  ]);

  for (const row of domainQueries[0].data ?? []) bump(String(row.local_date), "progress");
  for (const row of domainQueries[1].data ?? []) bump(String(row.local_date), "progress");
  for (const row of domainQueries[2].data ?? []) bump(String(row.local_date), "progress");
  for (const row of domainQueries[3].data ?? [])
    bump(String(row.local_date), "hydration");
  for (const row of domainQueries[4].data ?? [])
    bump(String(row.local_date), "meditation");
  for (const row of domainQueries[5].data ?? []) bump(String(row.sleep_date), "sleep");
  for (const row of domainQueries[6].data ?? [])
    bump(String(row.local_date), "supplements");

  const customCounts = countCustomEventsByDate(
    (domainQueries[7].data ?? []) as { local_date: string; user_tracker_id: string }[],
    customTrackerIds,
  );
  for (const [date, count] of customCounts) {
    const day = dayMap.get(date);
    if (!day) continue;
    day.custom += count;
    if (count > 0) day.hasAny = true;
  }

  return { year, month, days: [...dayMap.values()] };
}
