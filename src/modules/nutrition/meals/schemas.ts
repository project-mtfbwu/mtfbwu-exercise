import { z } from "zod";
import { FOOD_STATES, MEAL_TYPES } from "./types";

export const mealTypeSchema = z.enum(MEAL_TYPES);

export const saveMealSchema = z.object({
  dailyRecordId: z.string().uuid(),
  mealType: mealTypeSchema,
  title: z.string().trim().max(120).optional(),
  expectedVersion: z.number().int().positive().optional(),
  items: z
    .array(
      z.discriminatedUnion("itemType", [
        z.object({
          itemType: z.literal("food"),
          foodId: z.string().uuid(),
          amountG: z.number().positive().max(100_000),
        }),
        z.object({
          itemType: z.literal("recipe"),
          recipeId: z.string().uuid(),
          /** Grams of the recipe serving being logged (defaults to one serving). */
          amountG: z.number().positive().max(100_000).optional(),
          servings: z.number().positive().max(100).optional(),
        }),
      ]),
    )
    .min(1)
    .max(80),
});

export const deleteMealSchema = z.object({
  mealLogId: z.string().uuid(),
  expectedVersion: z.number().int().positive().optional(),
});

export const copyMealSchema = z.object({
  dailyRecordId: z.string().uuid(),
  mealType: mealTypeSchema,
});

export const saveMealAsTemplateSchema = z.object({
  mealLogId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});

export const applyMealTemplateSchema = z.object({
  dailyRecordId: z.string().uuid(),
  mealType: mealTypeSchema,
  templateId: z.string().uuid(),
});

export const customFoodSchema = z.object({
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(160).optional(),
  foodState: z.enum(FOOD_STATES),
  servingGrams: z.number().positive().max(10_000),
  caloriesPer100g: z.number().min(0).max(10_000),
  proteinPer100g: z.number().min(0).max(1_000),
  carbsPer100g: z.number().min(0).max(1_000),
  fatPer100g: z.number().min(0).max(1_000),
  fiberPer100g: z.number().min(0).max(1_000),
  verifiedByUser: z.boolean(),
  barcode: z.string().trim().max(64).optional(),
});

export const recipeIngredientInputSchema = z.object({
  foodId: z.string().uuid(),
  amountG: z.number().positive().max(100_000),
});

export const recipeSchema = z.object({
  recipeId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  finalCookedWeightG: z.number().positive().max(100_000).optional(),
  servingCount: z.number().positive().max(100).optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1).max(50),
});

export const deleteRecipeSchema = z.object({ recipeId: z.string().uuid() });

export const nutritionGoalsSchema = z.object({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  calorieTarget: z.number().min(0).max(20_000).nullable().optional(),
  proteinGTarget: z.number().min(0).max(2_000).nullable().optional(),
  carbohydrateGTarget: z.number().min(0).max(2_000).nullable().optional(),
  fatGTarget: z.number().min(0).max(2_000).nullable().optional(),
  fiberGTarget: z.number().min(0).max(500).nullable().optional(),
});
