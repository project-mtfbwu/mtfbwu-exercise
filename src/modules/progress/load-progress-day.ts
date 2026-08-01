import { createSupabaseServerClient } from "@/shared/database/server";
import { displayWeight } from "@/modules/measurements/units";
import type { UnitsSystem } from "@/shared/database/types";

type ProgressDb = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ProgressDaySummary = {
  weightEntry: { normalizedKg: number; display: string } | null;
  measurementCount: number;
  photoSetCount: number;
  noteCount: number;
  latestPhotoSetDate: string | null;
};

const EMPTY: ProgressDaySummary = {
  weightEntry: null,
  measurementCount: 0,
  photoSetCount: 0,
  noteCount: 0,
  latestPhotoSetDate: null,
};

async function authenticatedDb(): Promise<{
  db: ProgressDb;
  userId: string;
  units: UnitsSystem;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("units_system")
    .eq("id", user.id)
    .maybeSingle();

  return {
    db: supabase,
    userId: user.id,
    units: (profile?.units_system as UnitsSystem) ?? "metric",
  };
}

export async function loadProgressDaySummary(
  localDate: string,
): Promise<ProgressDaySummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return EMPTY;
  const context = await authenticatedDb();
  if (!context) return EMPTY;
  const { db, userId, units } = context;

  const { data: weightRow } = await db
    .from("body_weight_entries")
    .select("normalized_kg")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: measurementCount } = await db
    .from("body_measurement_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("local_date", localDate);

  const { count: photoSetCount } = await db
    .from("progress_photo_sets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("local_date", localDate);

  const { count: noteCount } = await db
    .from("progress_notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("local_date", localDate);

  const { data: latestPhoto } = await db
    .from("progress_photo_sets")
    .select("local_date")
    .eq("user_id", userId)
    .order("local_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const normalizedKg =
    weightRow?.normalized_kg != null ? Number(weightRow.normalized_kg) : null;

  return {
    weightEntry:
      normalizedKg != null
        ? {
            normalizedKg,
            display: displayWeight(
              normalizedKg,
              units === "imperial" ? "imperial" : "metric",
            ),
          }
        : null,
    measurementCount: measurementCount ?? 0,
    photoSetCount: photoSetCount ?? 0,
    noteCount: noteCount ?? 0,
    latestPhotoSetDate: latestPhoto?.local_date ? String(latestPhoto.local_date) : null,
  };
}
