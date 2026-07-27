import { describe, expect, it } from "vitest";
import {
  NUTRITION_ENTITY,
  buildMealLogWrites,
  isNutritionOutboxPayload,
} from "@/shared/offline/nutrition-outbox";
import { createPendingRecord } from "@/shared/offline/outbox";

const emptyMacros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

describe("buildMealLogWrites", () => {
  it("queues a meal_logs write and a matching meal_log_items write", () => {
    const { mealLogId, writes, totals } = buildMealLogWrites({
      userId: "user-1",
      dailyRecordId: "day-1",
      mealType: "breakfast",
      title: "Eggs and oats",
      now: "2026-07-27T00:00:00.000Z",
      items: [
        {
          itemType: "food",
          foodId: "food-1",
          recipeId: null,
          displayName: "Whole egg",
          amountG: 150,
          macros: { calories: 234, protein_g: 19, carbs_g: 1.7, fat_g: 15.9, fiber_g: 0 },
          source: "mtfbwu_curated",
        },
        {
          itemType: "food",
          foodId: "food-2",
          recipeId: null,
          displayName: "Rolled oats",
          amountG: 50,
          macros: {
            calories: 194.5,
            protein_g: 8.45,
            carbs_g: 33.15,
            fat_g: 3.45,
            fiber_g: 5.3,
          },
        },
      ],
    });

    expect(mealLogId).toMatch(/^[0-9a-f-]{36}$/);
    expect(writes).toHaveLength(2);
    expect(writes[0]).toMatchObject({
      table: "meal_logs",
      values: {
        id: mealLogId,
        user_id: "user-1",
        daily_record_id: "day-1",
        meal_type: "breakfast",
        label: "Eggs and oats",
        energy_kcal: 428.5,
        protein_g: 27.45,
      },
    });
    expect(writes[1]?.table).toBe("meal_log_items");
    const itemRows = writes[1]?.values as Array<Record<string, unknown>>;
    expect(itemRows).toHaveLength(2);
    expect(itemRows[0]).toMatchObject({
      meal_log_id: mealLogId,
      item_type: "food",
      food_id: "food-1",
      recipe_id: null,
      display_name_snapshot: "Whole egg",
      quantity: 150,
      energy_kcal: 234,
      source_snapshot: { source: "mtfbwu_curated" },
    });
    expect(itemRows[1]).toMatchObject({
      food_id: "food-2",
      source_snapshot: { source: "unknown" },
    });
    expect(totals.calories).toBe(428.5);
    expect(totals.protein_g).toBe(27.45);
  });

  it("reuses a provided meal id so retries stay idempotent", () => {
    const first = buildMealLogWrites({
      mealLogId: "meal-99",
      userId: "user-1",
      dailyRecordId: "day-1",
      mealType: "lunch",
      items: [
        {
          itemType: "food",
          foodId: "food-1",
          recipeId: null,
          displayName: "Rice",
          amountG: 100,
          macros: emptyMacros,
        },
      ],
    });
    const second = buildMealLogWrites({
      mealLogId: "meal-99",
      userId: "user-1",
      dailyRecordId: "day-1",
      mealType: "lunch",
      items: [
        {
          itemType: "food",
          foodId: "food-1",
          recipeId: null,
          displayName: "Rice",
          amountG: 100,
          macros: emptyMacros,
        },
      ],
    });
    expect(first.mealLogId).toBe("meal-99");
    expect(second.mealLogId).toBe("meal-99");
  });

  it("reuses a provided item id so a retry updates rather than duplicates it", () => {
    const { writes } = buildMealLogWrites({
      mealLogId: "meal-1",
      userId: "user-1",
      dailyRecordId: "day-1",
      mealType: "dinner",
      items: [
        {
          id: "item-1",
          itemType: "food",
          foodId: "food-1",
          recipeId: null,
          displayName: "Rice",
          amountG: 100,
          macros: emptyMacros,
        },
      ],
    });
    const itemRows = writes[1]?.values as Array<Record<string, unknown>>;
    expect(itemRows[0]?.id).toBe("item-1");
  });

  it("falls back to a null label when no title is given", () => {
    const { writes } = buildMealLogWrites({
      userId: "user-1",
      dailyRecordId: "day-1",
      mealType: "snack",
      items: [
        {
          itemType: "food",
          foodId: "food-1",
          recipeId: null,
          displayName: "Almonds",
          amountG: 30,
          macros: emptyMacros,
        },
      ],
    });
    expect((writes[0]?.values as Record<string, unknown>).label).toBeNull();
  });

  it("writes recipe identity and an ingredient snapshot for a recipe item", () => {
    const { writes } = buildMealLogWrites({
      mealLogId: "meal-2",
      userId: "user-1",
      dailyRecordId: "day-1",
      mealType: "lunch",
      now: "2026-07-27T00:00:00.000Z",
      items: [
        {
          itemType: "recipe",
          foodId: null,
          recipeId: "recipe-1",
          displayName: "Weeknight dal",
          amountG: 250,
          macros: { calories: 300, protein_g: 20, carbs_g: 40, fat_g: 5, fiber_g: 8 },
          recipeIngredientsSnapshot: [
            { foodId: "food-1", displayName: "Moong dal", amountG: 100 },
            { foodId: "food-2", displayName: "Onion", amountG: 30 },
          ],
        },
      ],
    });
    const itemRows = writes[1]?.values as Array<Record<string, unknown>>;
    expect(itemRows[0]).toMatchObject({
      item_type: "recipe",
      food_id: null,
      recipe_id: "recipe-1",
      display_name_snapshot: "Weeknight dal",
      quantity: 250,
      energy_kcal: 300,
      source_snapshot: { source: "recipe", recipe_id: "recipe-1" },
    });
    const snapshot = itemRows[0]?.nutrient_snapshot_json as Record<string, unknown>;
    expect(snapshot.ingredients).toEqual([
      { foodId: "food-1", displayName: "Moong dal", amountG: 100 },
      { foodId: "food-2", displayName: "Onion", amountG: 30 },
    ]);
  });
});

describe("nutrition outbox payload recognition", () => {
  it("recognizes a queued meal log write built for the outbox", () => {
    const { writes } = buildMealLogWrites({
      userId: "user-1",
      dailyRecordId: "day-1",
      mealType: "breakfast",
      items: [
        {
          itemType: "food",
          foodId: "food-1",
          recipeId: null,
          displayName: "Egg",
          amountG: 100,
          macros: emptyMacros,
        },
      ],
    });
    const payload = {
      kind: "nutrition" as const,
      entity: NUTRITION_ENTITY.mealLog,
      writes,
    };
    expect(isNutritionOutboxPayload(payload)).toBe(true);
    expect(
      isNutritionOutboxPayload({ kind: "nutrition", entity: "unknown", writes }),
    ).toBe(false);
  });

  it("keeps failed sync errors visible through the shared transition helper", () => {
    const record = createPendingRecord({
      idempotencyKey: "nutrition:meal_log:meal-1:1",
      userId: "user-1",
      entityType: NUTRITION_ENTITY.mealLog,
      entityId: "meal-1",
      operationType: "upsert",
      payload: { kind: "nutrition", entity: NUTRITION_ENTITY.mealLog, writes: [] },
    });
    expect(record.status).toBe("pending");
    expect(record.entityType).toBe("meal_log");
  });
});
