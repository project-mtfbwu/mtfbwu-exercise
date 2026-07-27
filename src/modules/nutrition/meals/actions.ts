"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  amountFromPer100g,
  recipeTotals,
  sumMealMacros,
  type MacroNutrients,
  type MealMacroItem,
  type RecipeIngredient,
} from "@/modules/nutrition/calculations";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import type {
  MealLogView,
  MealTemplateView,
  MealType,
  NutritionGoalsView,
  RecipeView,
} from "./types";
import { nutritionMacrosFromRow } from "./load-nutrition-day";
import {
  applyMealTemplateSchema,
  copyMealSchema,
  customFoodSchema,
  deleteMealSchema,
  deleteRecipeSchema,
  nutritionGoalsSchema,
  recipeSchema,
  saveMealAsTemplateSchema,
  saveMealSchema,
} from "./schemas";
import {
  STARTER_TEMPLATES,
  STARTER_TEMPLATE_NOTE,
  type StarterTemplateKind,
} from "./starter-templates";

export type { StarterTemplateKind } from "./starter-templates";

type ActionResult =
  { ok: true; meal?: MealLogView; message: string } | { ok: false; error: string };
type IdResult = { ok: true; id: string; message: string } | { ok: false; error: string };
type DbRow = Record<string, unknown>;
// Nutrition tables are introduced by the Increment 4 migrations. Regenerate
// shared Database types after applying them; this narrow boundary avoids
// weakening types elsewhere in the application.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NutritionDb = { from(table: string): any };

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function macrosFromNutrients(
  nutrients: readonly DbRow[],
  amountG: number,
): MealMacroItem {
  const byKey = new Map(
    nutrients.map((row) => [String(row.stable_key), numberValue(row.amount_per_100g)]),
  );
  return {
    calories: amountFromPer100g(byKey.get("energy_kcal"), amountG) ?? 0,
    protein_g: amountFromPer100g(byKey.get("protein_g"), amountG) ?? 0,
    carbs_g: amountFromPer100g(byKey.get("carbohydrate_g"), amountG) ?? 0,
    fat_g: amountFromPer100g(byKey.get("fat_g"), amountG) ?? 0,
    fiber_g: amountFromPer100g(byKey.get("fiber_g"), amountG) ?? 0,
  };
}

function per100gFromNutrients(nutrients: readonly DbRow[]): MacroNutrients {
  const byKey = new Map(
    nutrients.map((row) => [String(row.stable_key), numberValue(row.amount_per_100g)]),
  );
  return {
    calories: byKey.has("energy_kcal") ? byKey.get("energy_kcal")! : null,
    protein_g: byKey.has("protein_g") ? byKey.get("protein_g")! : null,
    carbs_g: byKey.has("carbohydrate_g") ? byKey.get("carbohydrate_g")! : null,
    fat_g: byKey.has("fat_g") ? byKey.get("fat_g")! : null,
    fiber_g: byKey.has("fiber_g") ? byKey.get("fiber_g")! : null,
  };
}

function relationRow(value: unknown): DbRow | null {
  if (Array.isArray(value)) return (value[0] as DbRow | null) ?? null;
  return (value as DbRow | null) ?? null;
}

/** Groups food_nutrients rows (joined to nutrient_definitions) by food id. */
async function loadNutrientsByFood(
  db: NutritionDb,
  foodIds: readonly string[],
): Promise<Map<string, DbRow[]>> {
  const nutrientsByFood = new Map<string, DbRow[]>();
  if (!foodIds.length) return nutrientsByFood;
  const { data: nutrientRows } = await db
    .from("food_nutrients")
    .select("food_id, amount_per_100g, nutrient_definitions(stable_key)")
    .in("food_id", foodIds);
  for (const row of nutrientRows ?? []) {
    const relation = relationRow(row.nutrient_definitions);
    const list = nutrientsByFood.get(String(row.food_id)) ?? [];
    list.push({ amount_per_100g: row.amount_per_100g, stable_key: relation?.stable_key });
    nutrientsByFood.set(String(row.food_id), list);
  }
  return nutrientsByFood;
}

function templateView(template: DbRow, items: readonly DbRow[]): MealTemplateView {
  return {
    id: String(template.id),
    name: String(template.name),
    mealType: template.meal_type as MealType,
    notes: (template.notes as string | null) ?? null,
    items: items.map((item) => {
      const food = relationRow(item.foods);
      const recipe = relationRow(item.recipes);
      return {
        id: String(item.id),
        itemType: item.item_type as "food" | "recipe",
        foodId: item.food_id ? String(item.food_id) : null,
        recipeId: item.recipe_id ? String(item.recipe_id) : null,
        displayName: String(
          (food?.canonical_name as string | undefined) ??
            (recipe?.name as string | undefined) ??
            "Item",
        ),
        amountG: numberValue(item.quantity),
      };
    }),
  };
}

function goalsView(row: DbRow): NutritionGoalsView {
  return {
    id: row.id ? String(row.id) : null,
    effectiveFrom: String(row.effective_from),
    calorieTarget: row.calorie_target != null ? numberValue(row.calorie_target) : null,
    proteinGTarget:
      row.protein_g_target != null ? numberValue(row.protein_g_target) : null,
    carbohydrateGTarget:
      row.carbohydrate_g_target != null ? numberValue(row.carbohydrate_g_target) : null,
    fatGTarget: row.fat_g_target != null ? numberValue(row.fat_g_target) : null,
    fiberGTarget: row.fiber_g_target != null ? numberValue(row.fiber_g_target) : null,
  };
}

async function authenticatedDb(): Promise<{ db: NutritionDb; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as NutritionDb, userId: user.id } : null;
}

function mealView(log: DbRow, items: DbRow[]): MealLogView {
  return {
    id: String(log.id),
    dailyRecordId: String(log.daily_record_id),
    mealType: log.meal_type as MealType,
    title: (log.label as string | null) ?? null,
    version: numberValue(log.version),
    macros: sumMealMacros([nutritionMacrosFromRow(log as never)]),
    items: items.map((item) => {
      const snapshot = (item.nutrient_snapshot_json as DbRow | null) ?? null;
      const ingredients = Array.isArray(snapshot?.ingredients)
        ? (snapshot.ingredients as Array<Record<string, unknown>>).map((row) => ({
            foodId: String(row.foodId ?? row.food_id ?? ""),
            displayName: String(row.displayName ?? row.display_name ?? "Ingredient"),
            amountG: numberValue(row.amountG ?? row.amount_g),
          }))
        : undefined;
      return {
        id: String(item.id),
        itemType: (item.item_type as "food" | "recipe") ?? "food",
        foodId: item.food_id ? String(item.food_id) : null,
        recipeId: item.recipe_id ? String(item.recipe_id) : null,
        displayName: String(item.display_name_snapshot),
        amountG: numberValue(item.quantity),
        source: String((item.source_snapshot as DbRow | null)?.source ?? "unknown"),
        macros: sumMealMacros([nutritionMacrosFromRow(item as never)]),
        recipeIngredientsSnapshot: ingredients,
      };
    }),
  };
}

export async function loadMealsForDailyRecord(
  dailyRecordId: string,
): Promise<MealLogView[]> {
  if (!z.string().uuid().safeParse(dailyRecordId).success) return [];
  const context = await authenticatedDb();
  if (!context) return [];
  const { data: logs, error } = await context.db
    .from("meal_logs")
    .select("*")
    .eq("daily_record_id", dailyRecordId)
    .is("deleted_at", null)
    .order("created_at");
  if (error || !logs) return [];
  const ids = logs.map((log: DbRow) => log.id);
  const { data: items } = ids.length
    ? await context.db
        .from("meal_log_items")
        .select("*")
        .in("meal_log_id", ids)
        .order("created_at")
    : { data: [] };
  return logs.map((log: DbRow) =>
    mealView(
      log,
      (items ?? []).filter((item: DbRow) => item.meal_log_id === log.id),
    ),
  );
}

export async function saveMealLogAction(input: unknown): Promise<ActionResult> {
  const parsed = saveMealSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid meal" };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const foodIds = parsed.data.items
    .filter(
      (item): item is Extract<typeof item, { itemType: "food" }> =>
        item.itemType === "food",
    )
    .map((item) => item.foodId);
  const recipeIds = parsed.data.items
    .filter(
      (item): item is Extract<typeof item, { itemType: "recipe" }> =>
        item.itemType === "recipe",
    )
    .map((item) => item.recipeId);

  const nutrientsByFood = await loadNutrientsByFood(db, foodIds);
  const foodById = new Map<string, DbRow>();
  if (foodIds.length) {
    const { data: foods, error: foodError } = await db
      .from("foods")
      .select("id, canonical_name, source, source_id")
      .in("id", foodIds);
    if (foodError || (foods?.length ?? 0) !== foodIds.length)
      return { ok: false, error: "One or more foods are no longer available." };
    for (const food of foods ?? []) foodById.set(String(food.id), food as DbRow);
  }

  const recipeById = new Map<string, DbRow>();
  const recipeIngredientsById = new Map<string, DbRow[]>();
  if (recipeIds.length) {
    const { data: recipes, error: recipeError } = await db
      .from("recipes")
      .select("*")
      .in("id", recipeIds)
      .is("deleted_at", null);
    if (recipeError || (recipes?.length ?? 0) !== recipeIds.length)
      return { ok: false, error: "One or more recipes are no longer available." };
    for (const recipe of recipes ?? [])
      recipeById.set(String(recipe.id), recipe as DbRow);
    const { data: ingredients } = await db
      .from("recipe_ingredients")
      .select("*")
      .in("recipe_id", recipeIds)
      .order("sort_order");
    for (const ingredient of ingredients ?? []) {
      const list = recipeIngredientsById.get(String(ingredient.recipe_id)) ?? [];
      list.push(ingredient as DbRow);
      recipeIngredientsById.set(String(ingredient.recipe_id), list);
    }
  }

  const itemRows: DbRow[] = [];
  for (const item of parsed.data.items) {
    if (item.itemType === "food") {
      const food = foodById.get(item.foodId);
      if (!food)
        return { ok: false, error: "One or more foods are no longer available." };
      const macros = macrosFromNutrients(
        nutrientsByFood.get(item.foodId) ?? [],
        item.amountG,
      );
      itemRows.push({
        item_type: "food",
        food_id: item.foodId,
        recipe_id: null,
        display_name_snapshot: String(food.canonical_name),
        quantity: item.amountG,
        unit: "g",
        energy_kcal: macros.calories,
        protein_g: macros.protein_g,
        carbohydrate_g: macros.carbs_g,
        fat_g: macros.fat_g,
        fiber_g: macros.fiber_g,
        nutrient_snapshot_json: {
          per_100g: nutrientsByFood.get(item.foodId) ?? [],
          amount_g: item.amountG,
        },
        source_snapshot: { source: food.source, source_id: food.source_id },
      });
      continue;
    }

    const recipe = recipeById.get(item.recipeId);
    if (!recipe)
      return { ok: false, error: "One or more recipes are no longer available." };
    const ingredients = recipeIngredientsById.get(item.recipeId) ?? [];
    const servingCount = Math.max(numberValue(recipe.serving_count) || 1, 0.0001);
    const servings = item.servings ?? 1;
    const amountG =
      item.amountG ??
      (recipe.final_cooked_weight_g != null
        ? (numberValue(recipe.final_cooked_weight_g) / servingCount) * servings
        : servings);
    const scale = servings / servingCount;
    const recipeIngredientInputs: RecipeIngredient[] = ingredients.map((ingredient) => {
      const snapshot = (ingredient.nutrient_snapshot_json as DbRow | null) ?? {};
      const per100 = (snapshot.per_100g as MacroNutrients | undefined) ?? {
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        fiber_g: null,
      };
      return {
        grams: numberValue(ingredient.quantity) * scale,
        per100g: per100,
      };
    });
    const totals = recipeTotals(
      recipeIngredientInputs,
      recipe.final_cooked_weight_g
        ? numberValue(recipe.final_cooked_weight_g) * scale
        : null,
      servings,
    );
    itemRows.push({
      item_type: "recipe",
      food_id: null,
      recipe_id: item.recipeId,
      display_name_snapshot: String(recipe.name),
      quantity: amountG,
      unit: "g",
      energy_kcal: totals.calories,
      protein_g: totals.protein_g,
      carbohydrate_g: totals.carbs_g,
      fat_g: totals.fat_g,
      fiber_g: totals.fiber_g,
      nutrient_snapshot_json: {
        amount_g: amountG,
        servings,
        serving_count_at_log: servingCount,
        recipe_version: numberValue(recipe.version),
        ingredients: ingredients.map((ingredient) => ({
          foodId: String(ingredient.food_id),
          displayName: String(
            ((ingredient.nutrient_snapshot_json as DbRow | null)?.display_name as
              string | undefined) ??
              ((ingredient.nutrient_snapshot_json as DbRow | null)?.food_name as
                string | undefined) ??
              "Ingredient",
          ),
          amountG: numberValue(ingredient.quantity) * scale,
        })),
      },
      source_snapshot: {
        source: "recipe",
        recipe_id: item.recipeId,
        recipe_version: numberValue(recipe.version),
      },
    });
  }

  const totals = sumMealMacros(
    itemRows.map((item) => ({
      calories: numberValue(item.energy_kcal),
      protein_g: numberValue(item.protein_g),
      carbs_g: numberValue(item.carbohydrate_g),
      fat_g: numberValue(item.fat_g),
      fiber_g: numberValue(item.fiber_g),
    })),
  );
  const { data: existing } = await db
    .from("meal_logs")
    .select("*")
    .eq("daily_record_id", parsed.data.dailyRecordId)
    .eq("meal_type", parsed.data.mealType)
    .is("deleted_at", null)
    .maybeSingle();
  if (
    existing &&
    parsed.data.expectedVersion &&
    numberValue(existing.version) !== parsed.data.expectedVersion
  ) {
    return { ok: false, error: "Meal changed elsewhere — refresh and try again." };
  }
  const payload = {
    user_id: userId,
    daily_record_id: parsed.data.dailyRecordId,
    meal_type: parsed.data.mealType,
    label: parsed.data.title || null,
    energy_kcal: totals.calories,
    protein_g: totals.protein_g,
    carbohydrate_g: totals.carbs_g,
    fat_g: totals.fat_g,
    fiber_g: totals.fiber_g,
    version: existing ? numberValue(existing.version) + 1 : 1,
  };
  const write = existing
    ? await db
        .from("meal_logs")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single()
    : await db.from("meal_logs").insert(payload).select("*").single();
  if (write.error || !write.data)
    return { ok: false, error: write.error?.message ?? "Could not save meal." };
  const { error: removeError } = await db
    .from("meal_log_items")
    .delete()
    .eq("meal_log_id", write.data.id);
  if (removeError) return { ok: false, error: removeError.message };
  const { data: savedItems, error: itemError } = await db
    .from("meal_log_items")
    .insert(itemRows.map((item) => ({ ...item, meal_log_id: write.data.id })))
    .select("*");
  if (itemError) return { ok: false, error: itemError.message };
  revalidatePath(ROUTES.today);
  return {
    ok: true,
    meal: mealView(write.data, savedItems ?? []),
    message: "Meal saved",
  };
}

export async function deleteMealLogAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteMealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid meal." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { data: meal } = await context.db
    .from("meal_logs")
    .select("version")
    .eq("id", parsed.data.mealLogId)
    .maybeSingle();
  if (!meal) return { ok: false, error: "Meal not found." };
  if (
    parsed.data.expectedVersion &&
    numberValue(meal.version) !== parsed.data.expectedVersion
  )
    return { ok: false, error: "Meal changed elsewhere — refresh and try again." };
  const { error } = await context.db
    .from("meal_logs")
    .update({
      deleted_at: new Date().toISOString(),
      version: numberValue(meal.version) + 1,
    })
    .eq("id", parsed.data.mealLogId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTES.today);
  return { ok: true, message: "Meal deleted" };
}

export async function copyMealFromDateAction(input: unknown): Promise<ActionResult> {
  const parsed = copyMealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid copy request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { data: target } = await context.db
    .from("daily_records")
    .select("local_date")
    .eq("id", parsed.data.dailyRecordId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Day not found." };
  const { data: previousDays } = await context.db
    .from("daily_records")
    .select("id")
    .lt("local_date", target.local_date)
    .order("local_date", { ascending: false })
    .limit(1);
  const previousId = previousDays?.[0]?.id;
  if (!previousId) return { ok: false, error: "No earlier logged day found." };
  const previousMeals = await loadMealsForDailyRecord(previousId);
  const source = previousMeals.find((meal) => meal.mealType === parsed.data.mealType);
  if (!source) return { ok: false, error: "No previous meal of this type found." };
  return saveMealLogAction({
    dailyRecordId: parsed.data.dailyRecordId,
    mealType: source.mealType,
    title: source.title ?? undefined,
    items: source.items.map((item) =>
      item.itemType === "recipe" && item.recipeId
        ? {
            itemType: "recipe" as const,
            recipeId: item.recipeId,
            amountG: item.amountG,
            servings: 1,
          }
        : {
            itemType: "food" as const,
            foodId: item.foodId!,
            amountG: item.amountG,
          },
    ),
  });
}

export async function saveMealAsTemplateAction(input: unknown): Promise<ActionResult> {
  const parsed = saveMealAsTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "A template name is required." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { data: meal } = await context.db
    .from("meal_logs")
    .select("*")
    .eq("id", parsed.data.mealLogId)
    .maybeSingle();
  if (!meal) return { ok: false, error: "Meal not found." };
  const { data: items } = await context.db
    .from("meal_log_items")
    .select("*")
    .eq("meal_log_id", meal.id)
    .order("created_at");
  const { data: template, error } = await context.db
    .from("meal_templates")
    .insert({
      user_id: context.userId,
      name: parsed.data.name,
      meal_type: meal.meal_type,
    })
    .select("*")
    .single();
  if (error || !template)
    return { ok: false, error: error?.message ?? "Could not save template." };
  const { error: itemError } = await context.db.from("meal_template_items").insert(
    (items ?? []).map((item: DbRow) => ({
      meal_template_id: template.id,
      item_type: "food",
      food_id: item.food_id,
      quantity: item.quantity,
      unit: item.unit,
      sort_order: 0,
      nutrient_snapshot_json: item.nutrient_snapshot_json,
    })),
  );
  return itemError
    ? { ok: false, error: itemError.message }
    : { ok: true, message: "Meal saved as template" };
}

export async function ensureNutritionGoalsAction(
  effectiveFrom = new Date().toISOString().slice(0, 10),
): Promise<ActionResult> {
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { error } = await context.db.from("nutrition_goals").upsert(
    {
      user_id: context.userId,
      effective_from: effectiveFrom,
      calorie_target: null,
      protein_g_target: null,
      carbohydrate_g_target: null,
      fat_g_target: null,
      fiber_g_target: null,
    },
    { onConflict: "user_id,effective_from", ignoreDuplicates: true },
  );
  return error
    ? { ok: false, error: error.message }
    : { ok: true, message: "Blank nutrition goals created; confirm targets before use." };
}

export async function installStarterTemplateAction(
  kind: StarterTemplateKind,
): Promise<ActionResult> {
  if (!Object.hasOwn(STARTER_TEMPLATES, kind))
    return { ok: false, error: "Unknown starter template." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  for (const meal of STARTER_TEMPLATES[kind]) {
    const { data: template, error } = await context.db
      .from("meal_templates")
      .insert({
        user_id: context.userId,
        name: meal.name,
        meal_type: meal.mealType,
        notes: STARTER_TEMPLATE_NOTE,
      })
      .select("id")
      .single();
    if (error || !template)
      return {
        ok: false,
        error: error?.message ?? "Could not install starter templates.",
      };
    const { error: itemError } = await context.db.from("meal_template_items").insert(
      meal.items.map((item, index) => ({
        meal_template_id: template.id,
        item_type: "food",
        food_id: item.foodId,
        quantity: item.amountG,
        unit: "g",
        sort_order: index,
        nutrient_snapshot_json: {},
      })),
    );
    if (itemError) return { ok: false, error: itemError.message };
  }
  revalidatePath(ROUTES.today);
  return { ok: true, message: `${kind} starter templates installed` };
}

export async function listMealTemplatesAction(): Promise<MealTemplateView[]> {
  const context = await authenticatedDb();
  if (!context) return [];
  const { data: templates, error } = await context.db
    .from("meal_templates")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error || !templates) return [];
  const ids = templates.map((template: DbRow) => template.id);
  const { data: items } = ids.length
    ? await context.db
        .from("meal_template_items")
        .select("*, foods(canonical_name), recipes(name)")
        .in("meal_template_id", ids)
        .order("sort_order")
    : { data: [] };
  return templates.map((template: DbRow) =>
    templateView(
      template,
      (items ?? []).filter((item: DbRow) => item.meal_template_id === template.id),
    ),
  );
}

export async function applyMealTemplateAction(input: unknown): Promise<ActionResult> {
  const parsed = applyMealTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid template request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { data: template } = await context.db
    .from("meal_templates")
    .select("*")
    .eq("id", parsed.data.templateId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!template) return { ok: false, error: "Template not found." };
  const { data: items, error } = await context.db
    .from("meal_template_items")
    .select("*")
    .eq("meal_template_id", template.id)
    .order("sort_order");
  if (error) return { ok: false, error: error.message };
  const rows = (items ?? []) as DbRow[];
  if (!rows.length) return { ok: false, error: "Template has no items." };
  const result = await saveMealLogAction({
    dailyRecordId: parsed.data.dailyRecordId,
    mealType: parsed.data.mealType,
    title: String(template.name),
    items: rows.map((item) =>
      item.item_type === "recipe"
        ? {
            itemType: "recipe" as const,
            recipeId: String(item.recipe_id),
            amountG: numberValue(item.quantity),
            servings: 1,
          }
        : {
            itemType: "food" as const,
            foodId: String(item.food_id),
            amountG: numberValue(item.quantity),
          },
    ),
  });
  if (!result.ok || !result.meal) return result;
  const { error: linkError } = await context.db
    .from("meal_logs")
    .update({ source_template_id: template.id })
    .eq("id", result.meal.id);
  if (linkError) return { ok: false, error: linkError.message };
  revalidatePath(ROUTES.today);
  return { ...result, message: `Applied "${template.name}"` };
}

export async function saveCustomFoodAction(input: unknown): Promise<IdResult> {
  const parsed = customFoodSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid custom food.",
    };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;
  const data = parsed.data;

  const { data: food, error: foodError } = await db
    .from("foods")
    .insert({
      canonical_name: data.name,
      normalized_name: data.name.trim().toLowerCase(),
      source: "user_custom",
      food_state: data.foodState,
      brand_name: data.brand || null,
      verified: data.verifiedByUser,
      user_editable: true,
    })
    .select("id")
    .single();
  if (foodError || !food)
    return { ok: false, error: foodError?.message ?? "Could not save food." };

  const { data: definitions, error: defError } = await db
    .from("nutrient_definitions")
    .select("id, stable_key")
    .in("stable_key", ["energy_kcal", "protein_g", "carbohydrate_g", "fat_g", "fiber_g"]);
  if (defError || !definitions?.length)
    return { ok: false, error: "Could not look up nutrient definitions." };
  const definitionIdByKey = new Map(
    definitions.map((row: DbRow) => [String(row.stable_key), String(row.id)]),
  );
  const nutrientInputs: Array<[string, number]> = [
    ["energy_kcal", data.caloriesPer100g],
    ["protein_g", data.proteinPer100g],
    ["carbohydrate_g", data.carbsPer100g],
    ["fat_g", data.fatPer100g],
    ["fiber_g", data.fiberPer100g],
  ];
  const nutrientRows = nutrientInputs
    .filter(([key]) => definitionIdByKey.has(key))
    .map(([key, amount]) => ({
      food_id: food.id,
      nutrient_definition_id: definitionIdByKey.get(key),
      amount_per_100g: amount,
      source: "user_custom",
    }));
  const { error: nutrientError } = await db.from("food_nutrients").insert(nutrientRows);
  if (nutrientError) return { ok: false, error: nutrientError.message };

  const { error: portionError } = await db.from("food_portions").insert({
    food_id: food.id,
    label: "Default serving",
    gram_weight: data.servingGrams,
    source: "user_custom",
    is_default: true,
  });
  if (portionError) return { ok: false, error: portionError.message };

  const { error: ownershipError } = await db.from("user_custom_foods").insert({
    user_id: userId,
    food_id: food.id,
    private: true,
  });
  if (ownershipError) return { ok: false, error: ownershipError.message };

  if (data.barcode) {
    const { data: branded, error: brandedError } = await db
      .from("branded_products")
      .insert({
        food_id: food.id,
        product_name: data.name,
        brand_name: data.brand || null,
        manufacturer: data.brand || null,
        serving_size: data.servingGrams,
        serving_unit: "g",
        serving_grams: data.servingGrams,
        source: "user_custom",
        source_id: `user-custom:${food.id}`,
      })
      .select("id")
      .single();
    if (brandedError || !branded)
      return {
        ok: false,
        error: brandedError?.message ?? "Could not save branded product.",
      };
    const { error: barcodeError } = await db.from("barcodes").insert({
      branded_product_id: branded.id,
      normalized_barcode: data.barcode,
      barcode_type: null,
    });
    if (barcodeError) return { ok: false, error: barcodeError.message };
  }

  revalidatePath(ROUTES.today);
  return { ok: true, id: String(food.id), message: "Custom food saved" };
}

export async function saveRecipeAction(input: unknown): Promise<IdResult> {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid recipe." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;
  const data = parsed.data;

  const foodIds = [...new Set(data.ingredients.map((ingredient) => ingredient.foodId))];
  const { data: foods, error: foodError } = await db
    .from("foods")
    .select("id, canonical_name")
    .in("id", foodIds);
  if (foodError || foods?.length !== foodIds.length)
    return { ok: false, error: "One or more ingredients are no longer available." };
  const nutrientsByFood = await loadNutrientsByFood(db, foodIds);
  const foodById = new Map((foods ?? []).map((f: DbRow) => [String(f.id), f]));

  const recipeIngredients: RecipeIngredient[] = data.ingredients.map((ingredient) => ({
    grams: ingredient.amountG,
    per100g: per100gFromNutrients(nutrientsByFood.get(ingredient.foodId) ?? []),
  }));
  const totals = recipeTotals(
    recipeIngredients,
    data.finalCookedWeightG ?? null,
    data.servingCount ?? null,
  );
  const defaultServingG =
    data.finalCookedWeightG && data.servingCount
      ? data.finalCookedWeightG / data.servingCount
      : null;

  const recipePayload = {
    user_id: userId,
    name: data.name,
    description: data.description || null,
    serving_count: data.servingCount ?? 1,
    final_cooked_weight_g: data.finalCookedWeightG ?? null,
    default_serving_g: defaultServingG,
    energy_kcal: totals.calories,
    protein_g: totals.protein_g,
    carbohydrate_g: totals.carbs_g,
    fat_g: totals.fat_g,
    fiber_g: totals.fiber_g,
  };

  let recipeRow: DbRow;
  if (data.recipeId) {
    const { data: existing } = await db
      .from("recipes")
      .select("id, version")
      .eq("id", data.recipeId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) return { ok: false, error: "Recipe not found." };
    const { data: updated, error } = await db
      .from("recipes")
      .update({ ...recipePayload, version: numberValue(existing.version) + 1 })
      .eq("id", data.recipeId)
      .select("*")
      .single();
    if (error || !updated)
      return { ok: false, error: error?.message ?? "Could not update recipe." };
    recipeRow = updated;
    const { error: removeError } = await db
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeRow.id);
    if (removeError) return { ok: false, error: removeError.message };
  } else {
    const { data: created, error } = await db
      .from("recipes")
      .insert(recipePayload)
      .select("*")
      .single();
    if (error || !created)
      return { ok: false, error: error?.message ?? "Could not save recipe." };
    recipeRow = created;
  }

  const ingredientRows = data.ingredients.map((ingredient, index) => ({
    recipe_id: recipeRow.id,
    food_id: ingredient.foodId,
    quantity: ingredient.amountG,
    unit: "g",
    sort_order: index,
    nutrient_snapshot_json: {
      per_100g: per100gFromNutrients(nutrientsByFood.get(ingredient.foodId) ?? []),
      amount_g: ingredient.amountG,
      display_name: (foodById.get(ingredient.foodId) as DbRow | undefined)
        ?.canonical_name,
      food_name: (foodById.get(ingredient.foodId) as DbRow | undefined)?.canonical_name,
    },
  }));
  const { error: ingredientError } = await db
    .from("recipe_ingredients")
    .insert(ingredientRows);
  if (ingredientError) return { ok: false, error: ingredientError.message };

  revalidatePath(ROUTES.today);
  return { ok: true, id: String(recipeRow.id), message: "Recipe saved" };
}

export async function deleteRecipeAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteRecipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid recipe." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { error } = await context.db
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.recipeId)
    .eq("user_id", context.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTES.today);
  return { ok: true, message: "Recipe deleted" };
}

export async function listRecipesAction(): Promise<RecipeView[]> {
  const context = await authenticatedDb();
  if (!context) return [];
  const { data: recipes, error } = await context.db
    .from("recipes")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error || !recipes) return [];
  const ids = recipes.map((recipe: DbRow) => recipe.id);
  const { data: ingredients } = ids.length
    ? await context.db
        .from("recipe_ingredients")
        .select("*, foods(canonical_name)")
        .in("recipe_id", ids)
        .order("sort_order")
    : { data: [] };
  return recipes.map((recipe: DbRow) => ({
    id: String(recipe.id),
    name: String(recipe.name),
    description: (recipe.description as string | null) ?? null,
    servingCount: numberValue(recipe.serving_count),
    finalCookedWeightG:
      recipe.final_cooked_weight_g != null
        ? numberValue(recipe.final_cooked_weight_g)
        : null,
    macros: nutritionMacrosFromRow(recipe as never),
    ingredients: (ingredients ?? [])
      .filter((item: DbRow) => item.recipe_id === recipe.id)
      .map((item: DbRow) => {
        const snapshot = (item.nutrient_snapshot_json as DbRow | null) ?? {};
        const per100gRows = Array.isArray(snapshot.per_100g)
          ? (snapshot.per_100g as DbRow[])
          : [];
        return {
          id: String(item.id),
          foodId: String(item.food_id),
          displayName: String(
            (relationRow(item.foods)?.canonical_name as string | undefined) ??
              "Ingredient",
          ),
          amountG: numberValue(item.quantity),
          per100g: per100gFromNutrients(per100gRows),
        };
      }),
  }));
}

export async function loadNutritionGoalsAction(
  localDate: string,
): Promise<NutritionGoalsView | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return null;
  const context = await authenticatedDb();
  if (!context) return null;
  const { data, error } = await context.db
    .from("nutrition_goals")
    .select("*")
    .lte("effective_from", localDate)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return goalsView(data);
}

export async function updateNutritionGoalsAction(input: unknown): Promise<ActionResult> {
  const parsed = nutritionGoalsSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid goals." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { error } = await context.db.from("nutrition_goals").upsert(
    {
      user_id: context.userId,
      effective_from: parsed.data.effectiveFrom,
      calorie_target: parsed.data.calorieTarget ?? null,
      protein_g_target: parsed.data.proteinGTarget ?? null,
      carbohydrate_g_target: parsed.data.carbohydrateGTarget ?? null,
      fat_g_target: parsed.data.fatGTarget ?? null,
      fiber_g_target: parsed.data.fiberGTarget ?? null,
    },
    { onConflict: "user_id,effective_from" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTES.today);
  return { ok: true, message: "Nutrition goals updated" };
}
