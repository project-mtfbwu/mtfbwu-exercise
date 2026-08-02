"use server";

import { createSupabaseServerClient } from "@/shared/database/server";
import { shiftLocalDate, todayLocalDate } from "@/shared/utils/local-date";
import { moduleActivityMap } from "@/modules/daily/completion";
import { loadDailyOverview } from "@/modules/daily/load-daily-overview";
import type { DailyModuleKey, HistoryPage } from "@/modules/daily/types";

export type HistoryFilters = {
  modules?: DailyModuleKey[];
  cursor?: string | null;
  limit?: number;
};

function summaryLineForDate(
  localDate: string,
  activeModules: Partial<Record<DailyModuleKey, boolean>>,
): string {
  const active = Object.entries(activeModules)
    .filter(([, v]) => v)
    .map(([k]) => k.replace("_", " "));
  if (active.length === 0) return `${localDate} · no activity`;
  return `${localDate} · ${active.slice(0, 3).join(", ")}${active.length > 3 ? "…" : ""}`;
}

export async function loadHistoryPageAction(
  timezone: string,
  filters: HistoryFilters = {},
): Promise<HistoryPage> {
  const limit = Math.min(filters.limit ?? 14, 31);
  const endDate = filters.cursor ?? todayLocalDate(timezone);
  const startDate = shiftLocalDate(endDate, -(limit - 1));

  const items = [];
  let cursor = endDate;
  while (cursor >= startDate && items.length < limit) {
    const overview = await loadDailyOverview(cursor, timezone);
    if (overview) {
      const modules = moduleActivityMap(overview);
      const filtered =
        filters.modules?.length && !filters.modules.some((m) => modules[m]);
      if (!filtered) {
        items.push({
          localDate: cursor,
          summaryLine: summaryLineForDate(cursor, modules),
          modules,
        });
      }
    }
    cursor = shiftLocalDate(cursor, -1);
  }

  const nextCursor =
    items.length >= limit ? shiftLocalDate(items[items.length - 1]!.localDate, -1) : null;

  return { items, nextCursor };
}

export async function countNutritionDaysAction(): Promise<number> {
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return 0;
  const { count } = await db
    .from("meal_logs")
    .select("local_date", { count: "exact", head: true })
    .eq("user_id", user.id);
  return count ?? 0;
}
