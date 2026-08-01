"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import type { ProgressDateRange } from "@/shared/database/types";

export type ProgressSummaryPreferencesView = {
  id: string;
  defaultDateRange: ProgressDateRange;
  showWeight: boolean;
  showMeasurements: boolean;
  showPhotos: boolean;
  selectedMeasurementKeys: string[];
};

type ProgressDb = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const preferencesSchema = z.object({
  defaultDateRange: z.enum(["7d", "30d", "90d", "180d", "365d", "all"]).optional(),
  showWeight: z.boolean().optional(),
  showMeasurements: z.boolean().optional(),
  showPhotos: z.boolean().optional(),
  selectedMeasurementKeys: z.array(z.string()).optional(),
});

async function requireDb(): Promise<{ db: ProgressDb; userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { db: supabase, userId: user.id };
}

function viewFromRow(row: Record<string, unknown>): ProgressSummaryPreferencesView {
  return {
    id: String(row.id),
    defaultDateRange: row.default_date_range as ProgressDateRange,
    showWeight: Boolean(row.show_weight),
    showMeasurements: Boolean(row.show_measurements),
    showPhotos: Boolean(row.show_photos),
    selectedMeasurementKeys: (row.selected_measurement_keys as string[]) ?? [],
  };
}

export async function loadSummaryPreferencesAction(): Promise<ProgressSummaryPreferencesView> {
  const { db, userId } = await requireDb();
  const { data, error } = await db
    .from("progress_summary_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return viewFromRow(data);

  const { data: created, error: insertError } = await db
    .from("progress_summary_preferences")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (insertError) throw new Error(insertError.message);
  return viewFromRow(created);
}

export async function saveSummaryPreferencesAction(
  input: z.infer<typeof preferencesSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireDb();
  const existing = await loadSummaryPreferencesAction();
  const { error } = await db
    .from("progress_summary_preferences")
    .update({
      ...(parsed.data.defaultDateRange !== undefined
        ? { default_date_range: parsed.data.defaultDateRange }
        : {}),
      ...(parsed.data.showWeight !== undefined
        ? { show_weight: parsed.data.showWeight }
        : {}),
      ...(parsed.data.showMeasurements !== undefined
        ? { show_measurements: parsed.data.showMeasurements }
        : {}),
      ...(parsed.data.showPhotos !== undefined
        ? { show_photos: parsed.data.showPhotos }
        : {}),
      ...(parsed.data.selectedMeasurementKeys !== undefined
        ? { selected_measurement_keys: parsed.data.selectedMeasurementKeys }
        : {}),
    })
    .eq("id", existing.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTES.progress);
  return { ok: true };
}
