import { describe, expect, it } from "vitest";
import {
  customFoodSchema,
  nutritionGoalsSchema,
  recipeSchema,
  saveMealSchema,
} from "./schemas";

const validFoodId = "9e210001-0000-4000-8000-000000000001";

describe("customFoodSchema", () => {
  const base = {
    name: "Homemade paneer",
    foodState: "prepared" as const,
    servingGrams: 100,
    caloriesPer100g: 265,
    proteinPer100g: 18.3,
    carbsPer100g: 1.2,
    fatPer100g: 20.8,
    fiberPer100g: 0,
    verifiedByUser: false,
  };

  it("accepts a well-formed custom food", () => {
    expect(customFoodSchema.safeParse(base).success).toBe(true);
  });

  it("requires a name", () => {
    expect(customFoodSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("requires a positive serving size", () => {
    expect(customFoodSchema.safeParse({ ...base, servingGrams: 0 }).success).toBe(false);
    expect(customFoodSchema.safeParse({ ...base, servingGrams: -5 }).success).toBe(false);
  });

  it("rejects negative macros", () => {
    expect(customFoodSchema.safeParse({ ...base, proteinPer100g: -1 }).success).toBe(
      false,
    );
    expect(customFoodSchema.safeParse({ ...base, caloriesPer100g: -1 }).success).toBe(
      false,
    );
  });

  it("rejects an unknown food state", () => {
    expect(customFoodSchema.safeParse({ ...base, foodState: "liquid" }).success).toBe(
      false,
    );
  });

  it("allows an optional barcode and brand", () => {
    const result = customFoodSchema.safeParse({
      ...base,
      brand: "Local dairy",
      barcode: "8901030123456",
    });
    expect(result.success).toBe(true);
  });
});

describe("recipeSchema", () => {
  const base = {
    name: "Weeknight dal",
    ingredients: [{ foodId: validFoodId, amountG: 150 }],
  };

  it("accepts a recipe with at least one ingredient", () => {
    expect(recipeSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a recipe with no ingredients", () => {
    expect(recipeSchema.safeParse({ ...base, ingredients: [] }).success).toBe(false);
  });

  it("rejects a non-positive final cooked weight", () => {
    expect(recipeSchema.safeParse({ ...base, finalCookedWeightG: 0 }).success).toBe(
      false,
    );
  });

  it("rejects a non-positive serving count", () => {
    expect(recipeSchema.safeParse({ ...base, servingCount: -2 }).success).toBe(false);
  });

  it("rejects an ingredient with an invalid food id", () => {
    expect(
      recipeSchema.safeParse({
        ...base,
        ingredients: [{ foodId: "not-a-uuid", amountG: 100 }],
      }).success,
    ).toBe(false);
  });

  it("accepts an update with an existing recipe id", () => {
    expect(recipeSchema.safeParse({ ...base, recipeId: validFoodId }).success).toBe(true);
  });
});

describe("nutritionGoalsSchema", () => {
  it("accepts blank (null) targets", () => {
    const result = nutritionGoalsSchema.safeParse({
      effectiveFrom: "2026-07-27",
      calorieTarget: null,
      proteinGTarget: null,
      carbohydrateGTarget: null,
      fatGTarget: null,
      fiberGTarget: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(nutritionGoalsSchema.safeParse({ effectiveFrom: "07/27/2026" }).success).toBe(
      false,
    );
  });

  it("rejects a negative calorie target", () => {
    expect(
      nutritionGoalsSchema.safeParse({
        effectiveFrom: "2026-07-27",
        calorieTarget: -100,
      }).success,
    ).toBe(false);
  });
});

describe("saveMealSchema", () => {
  it("requires at least one item", () => {
    expect(
      saveMealSchema.safeParse({
        dailyRecordId: validFoodId,
        mealType: "breakfast",
        items: [],
      }).success,
    ).toBe(false);
  });

  it("accepts a valid meal with a food item", () => {
    expect(
      saveMealSchema.safeParse({
        dailyRecordId: validFoodId,
        mealType: "breakfast",
        items: [{ itemType: "food", foodId: validFoodId, amountG: 100 }],
      }).success,
    ).toBe(true);
  });

  it("accepts a valid meal with a recipe item", () => {
    expect(
      saveMealSchema.safeParse({
        dailyRecordId: validFoodId,
        mealType: "lunch",
        items: [
          {
            itemType: "recipe",
            recipeId: validFoodId,
            amountG: 250,
            servings: 1,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts a recipe item without an explicit amount or servings", () => {
    expect(
      saveMealSchema.safeParse({
        dailyRecordId: validFoodId,
        mealType: "lunch",
        items: [{ itemType: "recipe", recipeId: validFoodId }],
      }).success,
    ).toBe(true);
  });

  it("rejects a food item missing itemType", () => {
    expect(
      saveMealSchema.safeParse({
        dailyRecordId: validFoodId,
        mealType: "breakfast",
        items: [{ foodId: validFoodId, amountG: 100 }],
      }).success,
    ).toBe(false);
  });

  it("rejects a recipe item with a non-uuid recipeId", () => {
    expect(
      saveMealSchema.safeParse({
        dailyRecordId: validFoodId,
        mealType: "lunch",
        items: [{ itemType: "recipe", recipeId: "not-a-uuid", amountG: 100 }],
      }).success,
    ).toBe(false);
  });
});
