import { amountFromPer100g } from "./meal";
import { assertFiniteNonNegative } from "./rounding";
import { sumMacroNutrients } from "./nutrients";
import {
  MACRO_NUTRIENT_KEYS,
  type MacroNutrientKey,
  type MacroNutrients,
  type RecipeIngredient,
  type RecipeMacros,
  type RecipeTotals,
} from "./types";

export function recipeTotals(
  ingredients: readonly RecipeIngredient[],
  finalCookedWeightG: number | null | undefined,
  servingCount: number | null | undefined,
): RecipeTotals {
  const normalizedFinalWeight = normalizeOptionalPositive(
    finalCookedWeightG,
    "finalCookedWeightG",
  );
  const normalizedServingCount = normalizeOptionalPositive(servingCount, "servingCount");
  let ingredientWeightG = 0;

  const ingredientMacros: MacroNutrients[] = ingredients.map((ingredient) => {
    assertFiniteNonNegative(ingredient.grams, "ingredient grams");
    ingredientWeightG += ingredient.grams;

    return Object.fromEntries(
      MACRO_NUTRIENT_KEYS.map((key) => [
        key,
        amountFromPer100g(ingredient.per100g[key], ingredient.grams),
      ]),
    ) as MacroNutrients;
  });

  return {
    ...sumMacroNutrients(ingredientMacros),
    ingredientWeightG,
    finalCookedWeightG: normalizedFinalWeight,
    servingCount: normalizedServingCount,
  };
}

export function recipePer100g(totals: RecipeTotals): RecipeMacros | null {
  if (totals.finalCookedWeightG === null) return null;
  return scaleRecipeTotals(totals, 100 / totals.finalCookedWeightG, "per_100g");
}

export function recipePerServing(totals: RecipeTotals): RecipeMacros | null {
  if (totals.servingCount === null) return null;
  return scaleRecipeTotals(totals, 1 / totals.servingCount, "per_serving");
}

function normalizeOptionalPositive(
  value: number | null | undefined,
  name: string,
): number | null {
  if (value === null || value === undefined) return null;
  assertFiniteNonNegative(value, name);
  return value === 0 ? null : value;
}

function scaleRecipeTotals(
  totals: RecipeTotals,
  factor: number,
  basis: RecipeMacros["basis"],
): RecipeMacros {
  const scaled = Object.fromEntries(
    MACRO_NUTRIENT_KEYS.map((key) => [key, scaleNutrient(totals[key], factor)]),
  ) as Record<MacroNutrientKey, number>;

  return {
    ...scaled,
    hasMissing: totals.hasMissing,
    missingNutrients: totals.missingNutrients,
    basis,
  };
}

function scaleNutrient(value: number, factor: number): number {
  return Math.round(value * factor * 1_000_000) / 1_000_000;
}
