import type { NormalizedFood, NormalizedNutrients } from "../sources/types";
import type { OffProduct } from "./schemas";

export function normalizeOffProduct(
  product: OffProduct,
  barcode: string,
): NormalizedFood {
  const nutrients = product.nutriments;
  const nutrientsPer100g: NormalizedNutrients = {
    energy_kcal: nutrients["energy-kcal_100g"] ?? undefined,
    protein_g: nutrients.proteins_100g ?? undefined,
    carbohydrate_g: nutrients.carbohydrates_100g ?? undefined,
    fat_g: nutrients.fat_100g ?? undefined,
    fiber_g: nutrients.fiber_100g ?? undefined,
    sugar_g: nutrients.sugars_100g ?? undefined,
    saturated_fat_g: nutrients["saturated-fat_100g"] ?? undefined,
    sodium_mg: nutrients.sodium_100g == null ? undefined : nutrients.sodium_100g * 1_000,
    calcium_mg:
      nutrients.calcium_100g == null ? undefined : nutrients.calcium_100g * 1_000,
    iron_mg: nutrients.iron_100g == null ? undefined : nutrients.iron_100g * 1_000,
    magnesium_mg:
      nutrients.magnesium_100g == null ? undefined : nutrients.magnesium_100g * 1_000,
    potassium_mg:
      nutrients.potassium_100g == null ? undefined : nutrients.potassium_100g * 1_000,
    vitamin_d_mcg:
      nutrients["vitamin-d_100g"] == null ? undefined : nutrients["vitamin-d_100g"] * 40,
    vitamin_b12_mcg: nutrients["vitamin-b12_100g"] ?? undefined,
  };
  const serving = product.serving_size?.match(/([\d.]+)\s*g/i);
  return {
    id: `off:${product.code ?? barcode}`,
    source: "open_food_facts",
    sourceId: product.code ?? barcode,
    name: product.product_name_en ?? product.product_name ?? "Unknown product",
    brand: product.brands ?? null,
    barcode,
    nutrientsPer100g,
    serving: serving
      ? { label: product.serving_size!, gramWeight: Number(serving[1]) }
      : null,
    imageUrl: product.image_front_url ?? null,
    rawPayload: product,
  };
}
