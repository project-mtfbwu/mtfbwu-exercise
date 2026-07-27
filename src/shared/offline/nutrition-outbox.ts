import { getDatabase, type MealLogDraft, type OutboxRecord } from "@/shared/offline/db";
import { createPendingRecord } from "@/shared/offline/outbox";
import { sumMealMacros, type MacroTotals } from "@/modules/nutrition/calculations";

export const NUTRITION_ENTITY = {
  mealLog: "meal_log",
  recipe: "recipe",
  customFood: "custom_food",
  template: "meal_template",
} as const;

type NutritionEntityType = (typeof NUTRITION_ENTITY)[keyof typeof NUTRITION_ENTITY];
type NutritionTable =
  | "foods"
  | "user_custom_foods"
  | "food_aliases"
  | "food_portions"
  | "food_nutrients"
  | "recipes"
  | "recipe_ingredients"
  | "meal_templates"
  | "meal_template_items"
  | "meal_logs"
  | "meal_log_items";

export type NutritionWrite = {
  table: NutritionTable;
  values: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Each payload contains primary-keyed rows in dependency order. Replaying an
 * upsert is safe, so retries do not create duplicate nutrition rows.
 */
export type NutritionOutboxPayload = {
  kind: "nutrition";
  entity: NutritionEntityType;
  writes: NutritionWrite[];
};

export async function queueNutritionMutation(input: {
  userId: string;
  entityType: NutritionEntityType;
  entityId: string;
  payload: NutritionOutboxPayload;
  draft?: Omit<MealLogDraft, "id" | "userId" | "mealLogId" | "createdAt" | "updatedAt">;
  idempotencyKey?: string;
}): Promise<OutboxRecord> {
  const db = getDatabase();
  const idempotencyKey =
    input.idempotencyKey ??
    `nutrition:${input.entityType}:${input.entityId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: "upsert",
    payload: input.payload,
  });

  await db.transaction("rw", db.outbox, db.mealLogDrafts, async () => {
    const existing = await db.outbox
      .where("idempotencyKey")
      .equals(idempotencyKey)
      .first();
    if (existing) {
      Object.assign(record, existing);
      return;
    }
    const id = await db.outbox.add(record);
    record.id = id;
    if (input.draft) {
      const now = new Date().toISOString();
      await db.mealLogDrafts.put({
        ...input.draft,
        id: input.entityId,
        userId: input.userId,
        mealLogId: input.entityId,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return record;
}

export type MealLogOutboxItemInput = {
  /** Reuse a synced item's id to update it; omit to insert a new item. */
  id?: string;
  itemType: "food" | "recipe";
  foodId: string | null;
  recipeId: string | null;
  displayName: string;
  amountG: number;
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  source?: string;
  /** Ingredient provenance snapshotted for a recipe item; ignored for food items. */
  recipeIngredientsSnapshot?: ReadonlyArray<{
    foodId: string;
    displayName: string;
    amountG: number;
  }>;
};

export type MealLogOutboxInput = {
  /** Reuse an already-synced meal's id to update it; omit to create a new meal. */
  mealLogId?: string;
  userId: string;
  dailyRecordId: string;
  mealType: string;
  title?: string | null;
  items: readonly MealLogOutboxItemInput[];
  now?: string;
};

export type MealLogOutboxWrites = {
  mealLogId: string;
  writes: NutritionWrite[];
  totals: MacroTotals;
};

/**
 * Builds the dependency-ordered `meal_logs` + `meal_log_items` upsert rows
 * for offline queueing. Client-generated ids make retries idempotent — a
 * replayed write upserts the same primary keys instead of duplicating rows.
 *
 * Known limitation: unlike the online `saveMealLogAction`, this does not
 * delete meal_log_items that only exist on the server. Removing an item from
 * an already-synced meal while offline does not remove it once the device is
 * back online; edit that meal online, or expect a follow-up reconciliation
 * pass in a later increment.
 */
export function buildMealLogWrites(input: MealLogOutboxInput): MealLogOutboxWrites {
  const mealLogId = input.mealLogId ?? crypto.randomUUID();
  const now = input.now ?? new Date().toISOString();
  const totals = sumMealMacros(input.items.map((item) => item.macros));

  const mealLogRow: Record<string, unknown> = {
    id: mealLogId,
    user_id: input.userId,
    daily_record_id: input.dailyRecordId,
    meal_type: input.mealType,
    label: input.title || null,
    energy_kcal: totals.calories,
    protein_g: totals.protein_g,
    carbohydrate_g: totals.carbs_g,
    fat_g: totals.fat_g,
    fiber_g: totals.fiber_g,
    updated_at: now,
  };

  const itemRows = input.items.map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    meal_log_id: mealLogId,
    item_type: item.itemType,
    food_id: item.itemType === "food" ? item.foodId : null,
    recipe_id: item.itemType === "recipe" ? item.recipeId : null,
    display_name_snapshot: item.displayName,
    quantity: item.amountG,
    unit: "g",
    energy_kcal: item.macros.calories,
    protein_g: item.macros.protein_g,
    carbohydrate_g: item.macros.carbs_g,
    fat_g: item.macros.fat_g,
    fiber_g: item.macros.fiber_g,
    nutrient_snapshot_json:
      item.itemType === "recipe"
        ? {
            amount_g: item.amountG,
            ingredients: item.recipeIngredientsSnapshot ?? [],
          }
        : { amount_g: item.amountG },
    source_snapshot:
      item.itemType === "recipe"
        ? { source: "recipe", recipe_id: item.recipeId }
        : { source: item.source ?? "unknown" },
    updated_at: now,
  }));

  return {
    mealLogId,
    totals,
    writes: [
      { table: "meal_logs", values: mealLogRow },
      { table: "meal_log_items", values: itemRows },
    ],
  };
}

export function isNutritionOutboxPayload(
  value: unknown,
): value is NutritionOutboxPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<NutritionOutboxPayload>;
  return (
    payload.kind === "nutrition" &&
    (payload.entity === "meal_log" ||
      payload.entity === "recipe" ||
      payload.entity === "custom_food" ||
      payload.entity === "meal_template") &&
    Array.isArray(payload.writes)
  );
}
