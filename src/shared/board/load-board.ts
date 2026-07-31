import { createSupabaseServerClient } from "@/shared/database/server";
import type { BoardCardView, BoardSnapshot } from "@/shared/board/board-model";
import {
  labelForStatus,
  nutritionStatusLabel,
  rehabStatusLabel,
  workoutStatusLabel,
} from "@/shared/board/board-model";
import { loadWorkoutDaySummary } from "@/modules/workout/sessions/load-workout-day";
import { loadRehabDaySummary } from "@/modules/rehab/sessions/load-rehab-day";
import { clampToLoggableLocalDate, todayLocalDate } from "@/shared/utils/local-date";
import { redirect } from "next/navigation";
import { ROUTES } from "@/shared/config/constants";
import { sumMealMacros } from "@/modules/nutrition/calculations";
import {
  loadMealsForDailyRecord,
  loadNutritionGoalsAction,
} from "@/modules/nutrition/meals/actions";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(ROUTES.login);
  }
  return { supabase, user };
}

export async function loadProfileOrRedirect() {
  const { supabase, user } = await requireUser();
  await supabase.rpc("ensure_user_board_defaults", { p_user_id: user.id });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(error?.message ?? "Profile missing");
  }

  if (!profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  return { supabase, user, profile };
}

export async function loadBoardSnapshot(
  requestedDate?: string | null,
): Promise<BoardSnapshot> {
  const { supabase, user, profile } = await loadProfileOrRedirect();
  const timeZone = profile.timezone || "UTC";
  const localDate = clampToLoggableLocalDate(
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : todayLocalDate(timeZone),
    timeZone,
  );

  const { data: layout, error: layoutError } = await supabase
    .from("dashboard_layouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (layoutError || !layout) {
    throw new Error(layoutError?.message ?? "No active layout");
  }

  const { data: userModules, error: modulesError } = await supabase
    .from("user_modules")
    .select("*")
    .eq("user_id", user.id);

  if (modulesError) throw new Error(modulesError.message);

  const { data: definitions, error: defError } = await supabase
    .from("module_definitions")
    .select("*")
    .eq("is_active", true);

  if (defError) throw new Error(defError.message);

  const { data: cards, error: cardsError } = await supabase
    .from("dashboard_cards")
    .select("*")
    .eq("dashboard_layout_id", layout.id)
    .order("position_index", { ascending: true });

  if (cardsError) throw new Error(cardsError.message);

  const { data: dailyRecord, error: dailyError } = await supabase
    .from("daily_records")
    .upsert(
      {
        user_id: user.id,
        local_date: localDate,
        timezone: timeZone,
      },
      { onConflict: "user_id,local_date" },
    )
    .select("*")
    .single();

  if (dailyError || !dailyRecord) {
    throw new Error(dailyError?.message ?? "Daily record failed");
  }

  const enabledModules = (userModules ?? []).filter((m) => m.enabled);
  for (const um of enabledModules) {
    await supabase.from("daily_module_statuses").upsert(
      {
        daily_record_id: dailyRecord.id,
        user_module_id: um.id,
        status: "not_started",
      },
      { onConflict: "daily_record_id,user_module_id", ignoreDuplicates: true },
    );
  }

  const { data: statuses, error: statusError } = await supabase
    .from("daily_module_statuses")
    .select("*")
    .eq("daily_record_id", dailyRecord.id);

  if (statusError) throw new Error(statusError.message);

  const meals = await loadMealsForDailyRecord(dailyRecord.id);
  const nutritionSummary = {
    ...sumMealMacros(meals.map((meal) => meal.macros)),
    mealCount: meals.length,
    itemCount: meals.reduce((count, meal) => count + meal.items.length, 0),
  };
  // Loads the most recent goal effective on or before this date; it does not
  // create one. A blank baseline is only ever created when the user explicitly
  // opens nutrition goals (see `ensureNutritionGoalsAction`), so an unrelated
  // board load can never silently shadow a goal set for an earlier date.
  const nutritionGoals = await loadNutritionGoalsAction(localDate);
  const workoutDaySummary = await loadWorkoutDaySummary(localDate);
  const rehabDaySummary = await loadRehabDaySummary(localDate);

  const defById = new Map((definitions ?? []).map((d) => [d.id, d]));
  const moduleById = new Map((userModules ?? []).map((m) => [m.id, m]));
  const statusByModule = new Map((statuses ?? []).map((s) => [s.user_module_id, s]));

  const views: BoardCardView[] = [];
  for (const card of cards ?? []) {
    const userModule = moduleById.get(card.user_module_id);
    if (!userModule || !userModule.enabled) continue;
    const definition = defById.get(userModule.module_definition_id);
    if (!definition) continue;
    const status = statusByModule.get(userModule.id) ?? null;
    views.push({
      card,
      userModule,
      definition,
      status,
      title: userModule.custom_label?.trim() || definition.display_name,
      statusLabel:
        definition.key === "nutrition"
          ? nutritionStatusLabel(
              nutritionSummary,
              nutritionGoals,
              definition,
              status,
              userModule.custom_label,
            )
          : definition.key === "workout"
            ? workoutStatusLabel(
                workoutDaySummary,
                definition,
                status,
                userModule.custom_label,
              )
            : definition.key === "rehab"
              ? rehabStatusLabel(
                  rehabDaySummary,
                  definition,
                  status,
                  userModule.custom_label,
                )
              : labelForStatus(definition, status, userModule.custom_label),
    });
  }

  return {
    profile,
    layout,
    cards: views,
    localDate,
    dailyRecordId: dailyRecord.id,
    nutritionSummary,
    nutritionGoals,
    workoutDaySummary,
    rehabDaySummary,
    syncBanner: null,
  };
}
