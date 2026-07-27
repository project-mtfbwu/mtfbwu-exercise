import {
  MACRO_NUTRIENT_KEYS,
  type DisplayMacros,
  type IdentifiedNutrient,
  type MacroNutrientKey,
  type MacroNutrients,
  type MacroTotals,
  type NutrientAmount,
} from "./types";
import { fromScaled, toScaled } from "./rounding";

export function isMissingNutrient(value: NutrientAmount): value is null | undefined {
  return value === null || value === undefined;
}

export function emptyMacroTotals(): MacroTotals {
  return {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    hasMissing: false,
    missingNutrients: [],
  };
}

export function sumMacroNutrients(items: readonly MacroNutrients[]): MacroTotals {
  const scaledSums: Record<MacroNutrientKey, number> = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  };
  const missing = new Set<MacroNutrientKey>();

  for (const item of items) {
    for (const key of MACRO_NUTRIENT_KEYS) {
      const amount = item[key];
      if (isMissingNutrient(amount)) {
        missing.add(key);
      } else {
        scaledSums[key] += toScaled(amount);
      }
    }
  }

  return {
    calories: fromScaled(scaledSums.calories),
    protein_g: fromScaled(scaledSums.protein_g),
    carbs_g: fromScaled(scaledSums.carbs_g),
    fat_g: fromScaled(scaledSums.fat_g),
    fiber_g: fromScaled(scaledSums.fiber_g),
    hasMissing: missing.size > 0,
    missingNutrients: MACRO_NUTRIENT_KEYS.filter((key) => missing.has(key)),
  };
}

export function hasDuplicateNutrientIds(
  nutrients: readonly IdentifiedNutrient[],
): boolean {
  const seen = new Set<string>();

  return nutrients.some(({ nutrientId }) => {
    if (seen.has(nutrientId)) return true;
    seen.add(nutrientId);
    return false;
  });
}

/**
 * Call at normalization boundaries so duplicate source rows cannot be summed
 * twice under the same nutrient identifier.
 */
export function assertUniqueNutrientIds(nutrients: readonly IdentifiedNutrient[]): void {
  if (hasDuplicateNutrientIds(nutrients)) {
    throw new Error("Duplicate nutrient identifiers are not allowed.");
  }
}

/**
 * Display calories as whole kcal and macros as grams to one decimal place.
 * Missing values remain an em dash rather than appearing as zero.
 */
export function formatDisplay(nutrients: MacroNutrients): DisplayMacros {
  return {
    calories: formatAmount(nutrients.calories, 0, " kcal"),
    protein: formatAmount(nutrients.protein_g, 1, " g"),
    carbs: formatAmount(nutrients.carbs_g, 1, " g"),
    fat: formatAmount(nutrients.fat_g, 1, " g"),
    fiber: formatAmount(nutrients.fiber_g, 1, " g"),
    hasMissing: MACRO_NUTRIENT_KEYS.some((key) => isMissingNutrient(nutrients[key])),
  };
}

function formatAmount(
  amount: NutrientAmount,
  fractionDigits: number,
  suffix: string,
): string {
  if (isMissingNutrient(amount)) return "—";

  return `${amount.toFixed(fractionDigits)}${suffix}`;
}
