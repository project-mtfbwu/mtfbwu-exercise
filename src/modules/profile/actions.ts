"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import type { AnimationMode, UnitsSystem } from "@/shared/database/types";

type ActionResult = { ok: true; message: string } | { ok: false; error: string };

export type ProfilePreferencesView = {
  preferredName: string | null;
  weekStartsOn: number;
  timeFormat: "12h" | "24h";
  weightUnit: string;
  lengthUnit: string;
  volumeUnit: string;
  showStreaks: boolean;
  showWeeklySummary: boolean;
};

export type DailyOverviewPreferencesView = {
  visibleSections: string[];
  summaryOrder: string[];
  showCompletionPercentage: boolean;
  showModuleCounts: boolean;
};

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  timezone: z.string().min(1).optional(),
  unitsSystem: z.enum(["metric", "imperial"]).optional(),
  animationMode: z.enum(["full", "reduced", "off"]).optional(),
});

const profilePrefsSchema = z.object({
  preferredName: z.string().max(80).optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  weightUnit: z.string().max(8).optional(),
  lengthUnit: z.string().max(8).optional(),
  volumeUnit: z.string().max(8).optional(),
  showStreaks: z.boolean().optional(),
  showWeeklySummary: z.boolean().optional(),
});

function revalidateProfile() {
  revalidatePath(ROUTES.profile);
  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.settings);
}

async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function loadProfilePreferencesAction(): Promise<ProfilePreferencesView | null> {
  const { supabase, userId } = await requireAuth();
  const { data } = await supabase
    .from("profile_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    return {
      preferredName: null,
      weekStartsOn: 1,
      timeFormat: "24h",
      weightUnit: "kg",
      lengthUnit: "cm",
      volumeUnit: "ml",
      showStreaks: true,
      showWeeklySummary: true,
    };
  }
  return {
    preferredName: (data.preferred_name as string | null) ?? null,
    weekStartsOn: Number(data.week_starts_on),
    timeFormat: data.time_format as "12h" | "24h",
    weightUnit: String(data.weight_unit),
    lengthUnit: String(data.length_unit),
    volumeUnit: String(data.volume_unit),
    showStreaks: Boolean(data.show_streaks),
    showWeeklySummary: Boolean(data.show_weekly_summary),
  };
}

export async function saveProfilePreferencesAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = profilePrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase.from("profile_preferences").upsert(
    {
      user_id: userId,
      preferred_name: parsed.data.preferredName,
      week_starts_on: parsed.data.weekStartsOn,
      time_format: parsed.data.timeFormat,
      weight_unit: parsed.data.weightUnit,
      length_unit: parsed.data.lengthUnit,
      volume_unit: parsed.data.volumeUnit,
      show_streaks: parsed.data.showStreaks,
      show_weekly_summary: parsed.data.showWeeklySummary,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidateProfile();
  return { ok: true, message: "Preferences saved." };
}

export async function loadDailyOverviewPreferencesAction(): Promise<DailyOverviewPreferencesView | null> {
  const { supabase, userId } = await requireAuth();
  const { data } = await supabase
    .from("daily_overview_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    return {
      visibleSections: [],
      summaryOrder: [],
      showCompletionPercentage: true,
      showModuleCounts: true,
    };
  }
  return {
    visibleSections: (data.visible_sections as string[]) ?? [],
    summaryOrder: (data.summary_order as string[]) ?? [],
    showCompletionPercentage: Boolean(data.show_completion_percentage),
    showModuleCounts: Boolean(data.show_module_counts),
  };
}

export async function saveDailyOverviewPreferencesAction(input: {
  visibleSections?: string[];
  summaryOrder?: string[];
  showCompletionPercentage?: boolean;
  showModuleCounts?: boolean;
}): Promise<ActionResult> {
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase.from("daily_overview_preferences").upsert(
    {
      user_id: userId,
      visible_sections: input.visibleSections ?? [],
      summary_order: input.summaryOrder ?? [],
      show_completion_percentage: input.showCompletionPercentage ?? true,
      show_module_counts: input.showModuleCounts ?? true,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidateProfile();
  return { ok: true, message: "Overview preferences saved." };
}

export async function updateProfileSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      units_system: parsed.data.unitsSystem as UnitsSystem | undefined,
      animation_mode: parsed.data.animationMode as AnimationMode | undefined,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidateProfile();
  return { ok: true, message: "Profile updated." };
}

export type ProfileTotals = {
  nutritionDays: number;
  workoutSessions: number;
  rehabSessions: number;
  weightEntries: number;
  photoSets: number;
  hydrationEntries: number;
  meditationSessions: number;
  sleepSessions: number;
  supplementIntakes: number;
  trackerEvents: number;
};

export async function loadProfileTotalsAction(): Promise<ProfileTotals> {
  const { supabase, userId } = await requireAuth();
  const [
    meals,
    workouts,
    rehabs,
    weights,
    photos,
    hydration,
    meditation,
    sleep,
    supplements,
    events,
  ] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("rehab_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("body_weight_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("progress_photo_sets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("hydration_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("meditation_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("sleep_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("supplement_intakes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("tracker_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  return {
    nutritionDays: meals.count ?? 0,
    workoutSessions: workouts.count ?? 0,
    rehabSessions: rehabs.count ?? 0,
    weightEntries: weights.count ?? 0,
    photoSets: photos.count ?? 0,
    hydrationEntries: hydration.count ?? 0,
    meditationSessions: meditation.count ?? 0,
    sleepSessions: sleep.count ?? 0,
    supplementIntakes: supplements.count ?? 0,
    trackerEvents: events.count ?? 0,
  };
}
