import { z } from "zod";

const fdcNutrientSchema = z
  .object({
    nutrient: z
      .object({
        id: z.number().optional(),
        number: z.string().optional(),
        name: z.string().optional(),
        unitName: z.string().optional(),
      })
      .passthrough()
      .optional(),
    nutrientNumber: z.string().optional(),
    nutrientName: z.string().optional(),
    unitName: z.string().optional(),
    value: z.number().nullable().optional(),
    amount: z.number().nullable().optional(),
  })
  .passthrough();

export const usdaFoodSchema = z
  .object({
    fdcId: z.number(),
    description: z.string().catch("Unknown food"),
    brandOwner: z.string().nullable().optional(),
    brandName: z.string().nullable().optional(),
    dataType: z.string().nullable().optional(),
    gtinUpc: z.string().nullable().optional(),
    foodNutrients: z.array(fdcNutrientSchema).optional().default([]),
    servingSize: z.number().nullable().optional(),
    servingSizeUnit: z.string().nullable().optional(),
  })
  .passthrough();

export const usdaSearchResponseSchema = z
  .object({
    foods: z.array(usdaFoodSchema).default([]),
    totalHits: z.number().optional(),
    currentPage: z.number().optional(),
    totalPages: z.number().optional(),
  })
  .passthrough();

export const usdaFoodDetailSchema = usdaFoodSchema;

export type UsdaFood = z.infer<typeof usdaFoodSchema>;
export type UsdaSearchResponse = z.infer<typeof usdaSearchResponseSchema>;
