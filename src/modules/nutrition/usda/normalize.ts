import type {
  FoodSource,
  NormalizedFood,
  NormalizedNutrients,
  NutrientKey,
} from "../sources/types";
import type { UsdaFood } from "./schemas";

/**
 * FDC nutrient mapping: 1008→energy_kcal, 1003→protein_g, 1005→carbohydrate_g,
 * 1004→fat_g, 1079→fiber_g, 2000→sugar_g, 1258→saturated_fat_g, 1093→sodium_mg,
 * 1087→calcium_mg, 1089→iron_mg, 1090→magnesium_mg, 1092→potassium_mg,
 * 1114→vitamin_d_mcg, 1178→vitamin_b12_mcg.
 */
const FDC_NUTRIENT_MAP: Record<string, NutrientKey> = {
  "1008": "energy_kcal",
  "1003": "protein_g",
  "1005": "carbohydrate_g",
  "1004": "fat_g",
  "1079": "fiber_g",
  "2000": "sugar_g",
  "1258": "saturated_fat_g",
  "1093": "sodium_mg",
  "1087": "calcium_mg",
  "1089": "iron_mg",
  "1090": "magnesium_mg",
  "1092": "potassium_mg",
  "1114": "vitamin_d_mcg",
  "1178": "vitamin_b12_mcg",
};

function sourceFromDataType(dataType: string | null | undefined): FoodSource {
  switch (dataType?.toLowerCase()) {
    case "foundation":
      return "usda_foundation";
    case "sr legacy":
      return "usda_sr_legacy";
    case "survey (fndds)":
      return "usda_survey";
    default:
      return "usda_branded";
  }
}

export function normalizeUsdaNutrients(food: UsdaFood): NormalizedNutrients {
  return food.foodNutrients.reduce<NormalizedNutrients>((result, nutrient) => {
    const number = nutrient.nutrient?.number ?? nutrient.nutrientNumber;
    const key = number ? FDC_NUTRIENT_MAP[number] : undefined;
    const value = nutrient.amount ?? nutrient.value;
    if (key && typeof value === "number" && value >= 0) result[key] = value;
    return result;
  }, {});
}

export function normalizeUsdaFood(food: UsdaFood): NormalizedFood {
  const servingWeight =
    food.servingSize && food.servingSizeUnit?.toLowerCase() === "g"
      ? food.servingSize
      : null;
  return {
    id: `usda:${food.fdcId}`,
    source: sourceFromDataType(food.dataType),
    sourceId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner ?? food.brandName ?? null,
    barcode: food.gtinUpc ?? null,
    nutrientsPer100g: normalizeUsdaNutrients(food),
    serving: servingWeight
      ? { label: `${servingWeight} g`, gramWeight: servingWeight }
      : null,
    imageUrl: null,
    rawPayload: food,
  };
}
