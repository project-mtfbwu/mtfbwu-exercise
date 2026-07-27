import type { MacroNutrients, MacroTotals } from "@/modules/nutrition/calculations";

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "evening",
  "pre_workout",
  "shake",
  "dinner",
  "snack",
] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export type MealLogItemView = {
  id: string;
  itemType: "food" | "recipe";
  foodId: string | null;
  recipeId: string | null;
  displayName: string;
  amountG: number;
  source: string;
  macros: MacroTotals;
  /** Ingredient provenance snapshotted when a recipe serving was logged. */
  recipeIngredientsSnapshot?: Array<{
    foodId: string;
    displayName: string;
    amountG: number;
  }>;
};

export type MealLogView = {
  id: string;
  dailyRecordId: string;
  mealType: MealType;
  title: string | null;
  version: number;
  macros: MacroTotals;
  items: MealLogItemView[];
};

export type NutritionDayTotals = MacroTotals & {
  mealCount: number;
  itemCount: number;
};

export type MealTemplateItemView = {
  id: string;
  itemType: "food" | "recipe";
  foodId: string | null;
  recipeId: string | null;
  displayName: string;
  amountG: number;
};

export type MealTemplateView = {
  id: string;
  name: string;
  mealType: MealType;
  notes: string | null;
  items: MealTemplateItemView[];
};

export type RecipeIngredientView = {
  id: string;
  foodId: string;
  displayName: string;
  amountG: number;
  /** Per-100g macros snapshotted when the ingredient was saved. */
  per100g: MacroNutrients;
};

export type RecipeView = {
  id: string;
  name: string;
  description: string | null;
  servingCount: number;
  finalCookedWeightG: number | null;
  macros: MacroTotals;
  ingredients: RecipeIngredientView[];
};

export type NutritionGoalsView = {
  id: string | null;
  effectiveFrom: string;
  calorieTarget: number | null;
  proteinGTarget: number | null;
  carbohydrateGTarget: number | null;
  fatGTarget: number | null;
  fiberGTarget: number | null;
};

export const FOOD_STATES = ["raw", "cooked", "dry", "prepared", "packaged"] as const;
export type FoodState = (typeof FOOD_STATES)[number];
