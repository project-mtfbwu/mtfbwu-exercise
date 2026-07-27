import { describe, expect, it } from "vitest";
import { recipePer100g, recipePerServing, recipeTotals } from "./index";

describe("recipe nutrition calculations", () => {
  const ingredients = [
    {
      grams: 100,
      per100g: {
        calories: 365,
        protein_g: 7.1,
        carbs_g: 80,
        fat_g: 0.7,
        fiber_g: 1.3,
      },
    },
    {
      grams: 150,
      per100g: {
        calories: 120,
        protein_g: 22.5,
        carbs_g: 0,
        fat_g: 2.6,
        fiber_g: 0,
      },
    },
    {
      grams: 5,
      per100g: {
        calories: 884,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 100,
        fiber_g: 0,
      },
    },
  ] as const;

  it("calculates totals for a multi-ingredient recipe", () => {
    expect(recipeTotals(ingredients, 200, 2)).toMatchObject({
      calories: 589.2,
      protein_g: 40.85,
      carbs_g: 80,
      fat_g: 9.6,
      fiber_g: 1.3,
      ingredientWeightG: 255,
      finalCookedWeightG: 200,
      servingCount: 2,
      hasMissing: false,
    });
  });

  it("calculates recipe values per 100 g and serving", () => {
    const totals = recipeTotals(ingredients, 200, 2);

    expect(recipePer100g(totals)).toMatchObject({
      calories: 294.6,
      protein_g: 20.425,
      carbs_g: 40,
      fat_g: 4.8,
      fiber_g: 0.65,
      basis: "per_100g",
    });
    expect(recipePerServing(totals)).toMatchObject({
      calories: 294.6,
      protein_g: 20.425,
      carbs_g: 40,
      fat_g: 4.8,
      fiber_g: 0.65,
      basis: "per_serving",
    });
  });

  it("does not divide by a zero final cooked weight", () => {
    const totals = recipeTotals(ingredients, 0, 2);

    expect(totals.finalCookedWeightG).toBeNull();
    expect(recipePer100g(totals)).toBeNull();
  });

  it("returns no per-serving result when serving count is absent", () => {
    expect(recipePerServing(recipeTotals(ingredients, 200, null))).toBeNull();
  });
});
