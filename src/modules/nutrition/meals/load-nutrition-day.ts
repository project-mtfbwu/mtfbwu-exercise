import { sumMealMacros, type MealMacroItem } from "@/modules/nutrition/calculations";
import type { NutritionDayTotals } from "./types";

type MealTotalRow = {
  energy_kcal: number | string;
  protein_g: number | string;
  carbohydrate_g: number | string;
  fat_g: number | string;
  fiber_g: number | string;
};

function asNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function nutritionMacrosFromRow(row: MealTotalRow): MealMacroItem {
  return {
    calories: asNumber(row.energy_kcal),
    protein_g: asNumber(row.protein_g),
    carbs_g: asNumber(row.carbohydrate_g),
    fat_g: asNumber(row.fat_g),
    fiber_g: asNumber(row.fiber_g),
  };
}

export function aggregateNutritionDay(
  mealRows: readonly MealTotalRow[],
  itemCount = 0,
): NutritionDayTotals {
  return {
    ...sumMealMacros(mealRows.map(nutritionMacrosFromRow)),
    mealCount: mealRows.length,
    itemCount,
  };
}
