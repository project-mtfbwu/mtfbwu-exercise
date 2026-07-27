import { describe, expect, it } from "vitest";
import { aggregateNutritionDay, nutritionMacrosFromRow } from "./load-nutrition-day";
import { STARTER_TEMPLATES } from "./starter-templates";
import { MEAL_TYPES } from "./types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("nutrition day aggregation", () => {
  it("converts persisted meal columns to calculator macro keys", () => {
    expect(
      nutritionMacrosFromRow({
        energy_kcal: "210",
        protein_g: "12.5",
        carbohydrate_g: 20,
        fat_g: 8,
        fiber_g: 4,
      }),
    ).toMatchObject({
      calories: 210,
      protein_g: 12.5,
      carbs_g: 20,
      fat_g: 8,
      fiber_g: 4,
    });
  });

  it("sums meals and preserves counts", () => {
    const totals = aggregateNutritionDay(
      [
        { energy_kcal: 220, protein_g: 12, carbohydrate_g: 30, fat_g: 5, fiber_g: 4 },
        { energy_kcal: 430, protein_g: 35, carbohydrate_g: 40, fat_g: 12, fiber_g: 8 },
      ],
      5,
    );
    expect(totals).toMatchObject({
      calories: 650,
      protein_g: 47,
      carbs_g: 70,
      fat_g: 17,
      fiber_g: 12,
      mealCount: 2,
      itemCount: 5,
    });
  });
});

describe("starter meal templates", () => {
  const kinds = Object.keys(STARTER_TEMPLATES) as (keyof typeof STARTER_TEMPLATES)[];

  it("covers chicken, plant, and fish plans", () => {
    expect(kinds.sort()).toEqual(["chicken", "fish", "plant"]);
  });

  it.each(kinds)("gives every %s meal a name, a valid meal type, and items", (kind) => {
    for (const meal of STARTER_TEMPLATES[kind]) {
      expect(MEAL_TYPES).toContain(meal.mealType);
      expect(meal.name.length).toBeGreaterThan(0);
      expect(meal.items.length).toBeGreaterThan(0);
      for (const item of meal.items) {
        expect(uuidPattern.test(item.foodId)).toBe(true);
        expect(item.amountG).toBeGreaterThan(0);
      }
    }
  });

  it("covers breakfast, lunch, evening, pre_workout, and shake for each plan", () => {
    for (const kind of kinds) {
      const types = STARTER_TEMPLATES[kind].map((meal) => meal.mealType);
      expect(types).toEqual(
        expect.arrayContaining(["breakfast", "lunch", "evening", "pre_workout", "shake"]),
      );
    }
  });

  it("shares the same breakfast, evening, and shake foods across plans", () => {
    const byKind = (kind: keyof typeof STARTER_TEMPLATES, mealType: string) =>
      STARTER_TEMPLATES[kind].find((meal) => meal.mealType === mealType)?.items;

    expect(byKind("chicken", "breakfast")).toEqual(byKind("plant", "breakfast"));
    expect(byKind("chicken", "breakfast")).toEqual(byKind("fish", "breakfast"));
    expect(byKind("chicken", "evening")).toEqual(byKind("plant", "evening"));
    expect(byKind("chicken", "shake")).toEqual(byKind("fish", "shake"));
  });

  it("gives each plan a lunch protein source the other two plans do not use", () => {
    const lunchFoodIds = (kind: keyof typeof STARTER_TEMPLATES) =>
      new Set(
        STARTER_TEMPLATES[kind]
          .find((meal) => meal.mealType === "lunch")
          ?.items.map((item) => item.foodId),
      );

    const chicken = lunchFoodIds("chicken");
    const plant = lunchFoodIds("plant");
    const fish = lunchFoodIds("fish");
    expect([...chicken].some((id) => !plant.has(id) && !fish.has(id))).toBe(true);
    expect([...plant].some((id) => !chicken.has(id) && !fish.has(id))).toBe(true);
    expect([...fish].some((id) => !chicken.has(id) && !plant.has(id))).toBe(true);
  });
});
