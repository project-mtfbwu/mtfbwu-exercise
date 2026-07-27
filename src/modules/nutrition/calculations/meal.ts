import { multiplyPer100g } from "./rounding";
import { sumMacroNutrients } from "./nutrients";
import type { MacroTotals, MealMacroItem, NutrientAmount } from "./types";

/**
 * Calculates a nutrient amount for a weighed food. A missing source nutrient
 * stays missing so callers can preserve that fact in their UI.
 */
export function amountFromPer100g(
  amountPer100g: NutrientAmount,
  grams: number,
): number | null {
  if (amountPer100g === null || amountPer100g === undefined) return null;
  return multiplyPer100g(amountPer100g, grams);
}

export function amountFromPortion(
  amountPer100g: NutrientAmount,
  portionGramWeight: number | null | undefined,
  quantity: number,
): number | null {
  if (portionGramWeight === null || portionGramWeight === undefined) return null;
  return amountFromPer100g(amountPer100g, portionGramWeight * quantity);
}

export function sumMealMacros(items: readonly MealMacroItem[]): MacroTotals {
  return sumMacroNutrients(items);
}
