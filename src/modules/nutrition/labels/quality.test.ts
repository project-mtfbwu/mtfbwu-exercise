import { describe, expect, it } from "vitest";
import { classifyProductQuality, type ProductQualityInput } from "./quality";

const COMPLETE: ProductQualityInput = {
  productName: "Rolled Oats",
  servingGrams: 40,
  nutrientsPer100g: {
    energyKcal: 389,
    proteinG: 16.9,
    carbohydrateG: 66.3,
    fatG: 6.9,
    fiberG: 10.6,
    sugarG: 0.9,
    saturatedFatG: 1.2,
    sodiumMg: 6,
  },
};

describe("classifyProductQuality", () => {
  it("classifies a fully-populated product as complete", () => {
    expect(classifyProductQuality(COMPLETE)).toEqual({ status: "complete", reasons: [] });
  });

  it("classifies a missing product name as malformed", () => {
    const result = classifyProductQuality({ ...COMPLETE, productName: "" });
    expect(result.status).toBe("malformed");
  });

  it("classifies a negative nutrient value as malformed", () => {
    const result = classifyProductQuality({
      ...COMPLETE,
      nutrientsPer100g: { ...COMPLETE.nutrientsPer100g, proteinG: -1 },
    });
    expect(result.status).toBe("malformed");
  });

  it("classifies a negative serving size as malformed", () => {
    const result = classifyProductQuality({ ...COMPLETE, servingGrams: -10 });
    expect(result.status).toBe("malformed");
  });

  it("classifies a product with no macros at all as missing_macros", () => {
    const result = classifyProductQuality({
      productName: "Mystery Bar",
      servingGrams: 40,
      nutrientsPer100g: {},
    });
    expect(result.status).toBe("missing_macros");
  });

  it("classifies a product missing one required macro as missing_macros", () => {
    const result = classifyProductQuality({
      ...COMPLETE,
      nutrientsPer100g: { ...COMPLETE.nutrientsPer100g, fatG: null },
    });
    expect(result.status).toBe("missing_macros");
    expect(result.reasons[0]).toMatch(/fatG/);
  });

  it("classifies a product with all four core macros but no serving size as missing_serving", () => {
    const result = classifyProductQuality({ ...COMPLETE, servingGrams: null });
    expect(result.status).toBe("missing_serving");
  });

  it("classifies a product with a zero serving size as missing_serving", () => {
    const result = classifyProductQuality({ ...COMPLETE, servingGrams: 0 });
    expect(result.status).toBe("missing_serving");
  });

  it("classifies energy that diverges from the macro estimate by >20% as inconsistent_energy", () => {
    const result = classifyProductQuality({
      ...COMPLETE,
      nutrientsPer100g: { ...COMPLETE.nutrientsPer100g, energyKcal: 100 },
    });
    expect(result.status).toBe("inconsistent_energy");
  });

  it("tolerates small energy/macro rounding differences", () => {
    const result = classifyProductQuality({
      ...COMPLETE,
      nutrientsPer100g: { ...COMPLETE.nutrientsPer100g, energyKcal: 400 },
    });
    expect(result.status).not.toBe("inconsistent_energy");
  });

  it("classifies a product with low-confidence fields as user_review_required", () => {
    const result = classifyProductQuality({ ...COMPLETE, hasLowConfidenceFields: true });
    expect(result.status).toBe("user_review_required");
  });

  it("classifies a product missing only optional nutrients as partial", () => {
    const result = classifyProductQuality({
      ...COMPLETE,
      nutrientsPer100g: {
        energyKcal: 389,
        proteinG: 16.9,
        carbohydrateG: 66.3,
        fatG: 6.9,
      },
    });
    expect(result.status).toBe("partial");
  });

  it("prioritizes malformed over missing_macros when both apply", () => {
    const result = classifyProductQuality({
      productName: "",
      servingGrams: 40,
      nutrientsPer100g: {},
    });
    expect(result.status).toBe("malformed");
  });
});
