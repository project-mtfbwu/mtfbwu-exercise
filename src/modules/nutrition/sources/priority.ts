import type { FoodSource } from "./types";

/**
 * Resolution order for searches and barcode lookups. Within USDA generic,
 * Foundation, SR Legacy, and Survey Foods have equivalent priority.
 */
export const FOOD_SOURCE_PRIORITY: readonly FoodSource[] = [
  "user_custom",
  "mtfbwu_curated",
  "branded_cache",
  "open_food_facts",
  "usda_foundation",
  "usda_sr_legacy",
  "usda_survey",
  "usda_branded",
  "other",
];

export function compareFoodSources(left: FoodSource, right: FoodSource): number {
  return FOOD_SOURCE_PRIORITY.indexOf(left) - FOOD_SOURCE_PRIORITY.indexOf(right);
}
