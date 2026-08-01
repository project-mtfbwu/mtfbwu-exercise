import { createSupabaseServerClient } from "@/shared/database/server";
import type { WeightEntryView } from "@/modules/measurements/types";
import type { ProgressPhotoSetView } from "@/modules/progress-photos/types";

export type ProgressTimelineItem =
  | { kind: "weight"; date: string; recordedAt: string; entry: WeightEntryView }
  | {
      kind: "measurement";
      date: string;
      recordedAt: string;
      entryId: string;
      title: string | null;
      valueCount: number;
    }
  | { kind: "photo_set"; date: string; capturedAt: string; set: ProgressPhotoSetView }
  | { kind: "note"; date: string; noteId: string; noteType: string; valueText: string };

type ProgressDb = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ProgressTimelineFilters = {
  startDate?: string;
  endDate?: string;
  includeWeight?: boolean;
  includeMeasurements?: boolean;
  includePhotos?: boolean;
  includeNotes?: boolean;
};

export async function loadProgressTimeline(
  filters: ProgressTimelineFilters = {},
): Promise<ProgressTimelineItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const db: ProgressDb = supabase;
  const items: ProgressTimelineItem[] = [];
  const {
    startDate,
    endDate,
    includeWeight = true,
    includeMeasurements = true,
    includePhotos = true,
    includeNotes = true,
  } = filters;

  if (includeWeight) {
    let query = db
      .from("body_weight_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("local_date", { ascending: false })
      .order("recorded_at", { ascending: false })
      .limit(100);
    if (startDate) query = query.gte("local_date", startDate);
    if (endDate) query = query.lte("local_date", endDate);
    const { data } = await query;
    for (const row of data ?? []) {
      items.push({
        kind: "weight",
        date: String(row.local_date),
        recordedAt: String(row.recorded_at),
        entry: {
          id: String(row.id),
          localDate: String(row.local_date),
          recordedAt: String(row.recorded_at),
          timezone: String(row.timezone),
          weightValue: row.weight_value != null ? Number(row.weight_value) : null,
          weightUnit: String(row.weight_unit) as "kg" | "lb",
          normalizedKg: row.normalized_kg != null ? Number(row.normalized_kg) : null,
          source: row.source as WeightEntryView["source"],
          note: (row.note as string | null) ?? null,
        },
      });
    }
  }

  if (includeMeasurements) {
    let query = db
      .from("body_measurement_entries")
      .select("id, local_date, recorded_at, title")
      .eq("user_id", user.id)
      .order("local_date", { ascending: false })
      .limit(100);
    if (startDate) query = query.gte("local_date", startDate);
    if (endDate) query = query.lte("local_date", endDate);
    const { data: entries } = await query;
    const entryIds = (entries ?? []).map((e) => String(e.id));
    const { data: values } = entryIds.length
      ? await db
          .from("body_measurement_values")
          .select("body_measurement_entry_id")
          .in("body_measurement_entry_id", entryIds)
      : { data: [] };
    const countByEntry = new Map<string, number>();
    for (const v of values ?? []) {
      const key = String(v.body_measurement_entry_id);
      countByEntry.set(key, (countByEntry.get(key) ?? 0) + 1);
    }
    for (const entry of entries ?? []) {
      items.push({
        kind: "measurement",
        date: String(entry.local_date),
        recordedAt: String(entry.recorded_at),
        entryId: String(entry.id),
        title: (entry.title as string | null) ?? null,
        valueCount: countByEntry.get(String(entry.id)) ?? 0,
      });
    }
  }

  if (includePhotos) {
    const { listPhotoSetsAction } = await import("@/modules/progress-photos/actions");
    const sets = await listPhotoSetsAction(50);
    for (const set of sets) {
      if (startDate && set.localDate < startDate) continue;
      if (endDate && set.localDate > endDate) continue;
      items.push({
        kind: "photo_set",
        date: set.localDate,
        capturedAt: set.capturedAt,
        set,
      });
    }
  }

  if (includeNotes) {
    let query = db
      .from("progress_notes")
      .select("id, local_date, note_type, value_text")
      .eq("user_id", user.id)
      .order("local_date", { ascending: false })
      .limit(100);
    if (startDate) query = query.gte("local_date", startDate);
    if (endDate) query = query.lte("local_date", endDate);
    const { data } = await query;
    for (const row of data ?? []) {
      items.push({
        kind: "note",
        date: String(row.local_date),
        noteId: String(row.id),
        noteType: String(row.note_type),
        valueText: String(row.value_text),
      });
    }
  }

  return items.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    const aTime =
      "recordedAt" in a ? a.recordedAt : "capturedAt" in a ? a.capturedAt : "";
    const bTime =
      "recordedAt" in b ? b.recordedAt : "capturedAt" in b ? b.capturedAt : "";
    return bTime.localeCompare(aTime);
  });
}
