/**
 * Heuristic quality classifier for a candidate product (OFF import, barcode
 * cache row, or a reviewed label capture) prior to trusting it. Pure and
 * deterministic so it can run both server-side (import pipeline) and
 * client-side (review UI badges) with identical results.
 */

export type ProductQualityStatus =
  | "complete"
  | "partial"
  | "missing_serving"
  | "missing_macros"
  | "inconsistent_energy"
  | "malformed"
  | "user_review_required";

export type ProductQualityNutrients = {
  energyKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  sugarG?: number | null;
  saturatedFatG?: number | null;
  sodiumMg?: number | null;
};

export type ProductQualityInput = {
  productName?: string | null;
  servingGrams?: number | null;
  nutrientsPer100g: ProductQualityNutrients;
  /** True when any source field (e.g. OCR extraction) was flagged low-confidence or ambiguous. */
  hasLowConfidenceFields?: boolean;
};

export type ProductQualityResult = {
  status: ProductQualityStatus;
  reasons: string[];
};

const REQUIRED_MACRO_KEYS = ["energyKcal", "proteinG", "carbohydrateG", "fatG"] as const;
const OPTIONAL_KEYS = ["fiberG", "sugarG", "saturatedFatG", "sodiumMg"] as const;

const ENERGY_CONSISTENCY_THRESHOLD = 0.2;

function macroEnergyKcal(proteinG: number, carbohydrateG: number, fatG: number): number {
  return proteinG * 4 + carbohydrateG * 4 + fatG * 9;
}

function isMissing(value: number | null | undefined): boolean {
  return value == null || Number.isNaN(value);
}

/**
 * Classifies a product's data completeness/trustworthiness. Checks run in
 * order of severity — the first applicable status wins, so e.g. a malformed
 * (negative-value) product is never also reported as "partial".
 */
export function classifyProductQuality(input: ProductQualityInput): ProductQualityResult {
  const reasons: string[] = [];
  const nutrients = input.nutrientsPer100g;

  if (!input.productName || !input.productName.trim()) {
    return { status: "malformed", reasons: ["Product name is missing."] };
  }

  const allValues = Object.values(nutrients).filter(
    (value): value is number => typeof value === "number",
  );
  if (allValues.some((value) => value < 0)) {
    return {
      status: "malformed",
      reasons: ["One or more nutrient values are negative."],
    };
  }
  if (input.servingGrams != null && input.servingGrams < 0) {
    return { status: "malformed", reasons: ["Serving size is negative."] };
  }

  const missingRequired = REQUIRED_MACRO_KEYS.filter((key) => isMissing(nutrients[key]));
  if (missingRequired.length === REQUIRED_MACRO_KEYS.length) {
    return { status: "missing_macros", reasons: ["No macronutrient values were found."] };
  }
  if (missingRequired.length > 0) {
    return {
      status: "missing_macros",
      reasons: [`Missing required values: ${missingRequired.join(", ")}.`],
    };
  }

  if (!input.servingGrams || input.servingGrams <= 0) {
    return { status: "missing_serving", reasons: ["No serving size was found."] };
  }

  const { energyKcal, proteinG, carbohydrateG, fatG } = nutrients;
  if (
    typeof energyKcal === "number" &&
    typeof proteinG === "number" &&
    typeof carbohydrateG === "number" &&
    typeof fatG === "number" &&
    energyKcal > 0
  ) {
    const approxKcal = macroEnergyKcal(proteinG, carbohydrateG, fatG);
    const diffRatio = Math.abs(approxKcal - energyKcal) / energyKcal;
    if (diffRatio > ENERGY_CONSISTENCY_THRESHOLD) {
      return {
        status: "inconsistent_energy",
        reasons: [
          `Printed energy (${energyKcal} kcal) differs from the macro-based estimate ` +
            `(${Math.round(approxKcal)} kcal) by ${Math.round(diffRatio * 100)}%.`,
        ],
      };
    }
  }

  if (input.hasLowConfidenceFields) {
    return {
      status: "user_review_required",
      reasons: [
        "One or more values need manual confirmation before this product is trusted.",
      ],
    };
  }

  const missingOptional = OPTIONAL_KEYS.filter((key) => isMissing(nutrients[key]));
  if (missingOptional.length > 0) {
    reasons.push(`Missing optional values: ${missingOptional.join(", ")}.`);
    return { status: "partial", reasons };
  }

  return { status: "complete", reasons: [] };
}
