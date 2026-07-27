export const FOOD_SOURCES = [
  "user_custom",
  "mtfbwu_curated",
  "open_food_facts",
  "usda_foundation",
  "usda_sr_legacy",
  "usda_survey",
  "usda_branded",
  "branded_cache",
  "other",
] as const;

export type FoodSource = (typeof FOOD_SOURCES)[number];

export type NutrientKey =
  | "energy_kcal"
  | "protein_g"
  | "carbohydrate_g"
  | "fat_g"
  | "fiber_g"
  | "sugar_g"
  | "saturated_fat_g"
  | "sodium_mg"
  | "calcium_mg"
  | "iron_mg"
  | "magnesium_mg"
  | "potassium_mg"
  | "vitamin_d_mcg"
  | "vitamin_b12_mcg";

export type NormalizedNutrients = Partial<Record<NutrientKey, number>>;

export interface NormalizedFood {
  id: string;
  source: FoodSource;
  sourceId: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  nutrientsPer100g: NormalizedNutrients;
  serving: { label: string; gramWeight: number | null } | null;
  imageUrl: string | null;
  rawPayload?: unknown;
}
