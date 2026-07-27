import { describe, expect, it } from "vitest";
import {
  amountFromPer100g,
  amountFromPortion,
  formatDisplay,
  sumMealMacros,
} from "./index";

describe("meal nutrition calculations", () => {
  it.each([
    ["50 g raw oats", 389, 50, 194.5],
    ["50 g raw rice", 365, 50, 182.5],
    ["150 g raw chicken", 120, 150, 180],
    ["5 g oil", 884, 5, 44.2],
  ])("calculates %s from per-100 g nutrition", (_, per100g, grams, expected) => {
    expect(amountFromPer100g(per100g, grams)).toBe(expected);
  });

  it("calculates a quantity of portions", () => {
    expect(amountFromPortion(389, 50, 2)).toBe(389);
  });

  it("preserves missing portion weights", () => {
    expect(amountFromPortion(389, undefined, 1)).toBeNull();
  });

  it("sums known values and marks missing nutrients", () => {
    const total = sumMealMacros([
      {
        calories: 194.5,
        protein_g: 8.45,
        carbs_g: 33.15,
        fat_g: 3.45,
        fiber_g: 5.3,
      },
      {
        calories: 44.2,
        protein_g: null,
        carbs_g: 0,
        fat_g: 5,
        fiber_g: undefined,
      },
    ]);

    expect(total).toMatchObject({
      calories: 238.7,
      protein_g: 8.45,
      carbs_g: 33.15,
      fat_g: 8.45,
      fiber_g: 5.3,
      hasMissing: true,
    });
    expect(total.missingNutrients).toEqual(["protein_g", "fiber_g"]);
  });

  it("formats missing values rather than displaying zero", () => {
    expect(
      formatDisplay({
        calories: 194.5,
        protein_g: null,
        carbs_g: 33.15,
        fat_g: 3.45,
        fiber_g: 5.3,
      }),
    ).toEqual({
      calories: "195 kcal",
      protein: "—",
      carbs: "33.1 g",
      fat: "3.5 g",
      fiber: "5.3 g",
      hasMissing: true,
    });
  });
});
