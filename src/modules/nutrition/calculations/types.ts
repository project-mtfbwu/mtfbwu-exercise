export const MACRO_NUTRIENT_KEYS = [
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
] as const;

export type MacroNutrientKey = (typeof MACRO_NUTRIENT_KEYS)[number];
export type NutrientAmount = number | null | undefined;

/**
 * A value per 100 g or an already-calculated nutrient amount.
 * Null and undefined mean the source did not provide a value.
 */
export type MacroNutrients = Readonly<Record<MacroNutrientKey, NutrientAmount>>;

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  /** True when one or more inputs lacked a nutrient value. */
  hasMissing: boolean;
  /** Makes an incomplete total explicit to callers and display code. */
  missingNutrients: readonly MacroNutrientKey[];
}

export type MealMacroItem = MacroNutrients;

export interface RecipeIngredient {
  grams: number;
  per100g: MacroNutrients;
}

export interface RecipeTotals extends MacroTotals {
  ingredientWeightG: number;
  finalCookedWeightG: number | null;
  servingCount: number | null;
}

export interface RecipeMacros extends MacroTotals {
  basis: "per_100g" | "per_serving";
}

export interface IdentifiedNutrient {
  nutrientId: string;
}

export interface DisplayMacros {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  hasMissing: boolean;
}
