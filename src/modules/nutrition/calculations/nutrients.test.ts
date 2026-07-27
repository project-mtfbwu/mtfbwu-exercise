import { describe, expect, it } from "vitest";
import { assertUniqueNutrientIds, hasDuplicateNutrientIds, toScaled } from "./index";

describe("nutrient safeguards", () => {
  it("uses scaled integers for decimal-safe calculation inputs", () => {
    expect(toScaled(0.1) + toScaled(0.2)).toBe(toScaled(0.3));
  });

  it("detects duplicate nutrient identifiers", () => {
    const nutrients = [
      { nutrientId: "energy-kcal" },
      { nutrientId: "protein" },
      { nutrientId: "energy-kcal" },
    ];

    expect(hasDuplicateNutrientIds(nutrients)).toBe(true);
    expect(() => assertUniqueNutrientIds(nutrients)).toThrow(
      "Duplicate nutrient identifiers",
    );
  });

  it("accepts unique nutrient identifiers", () => {
    const nutrients = [{ nutrientId: "energy-kcal" }, { nutrientId: "protein" }];

    expect(hasDuplicateNutrientIds(nutrients)).toBe(false);
    expect(() => assertUniqueNutrientIds(nutrients)).not.toThrow();
  });
});
