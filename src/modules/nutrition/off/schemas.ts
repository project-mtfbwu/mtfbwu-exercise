import { z } from "zod";

const offNutrimentsSchema = z
  .object({
    "energy-kcal_100g": z.number().nullable().optional(),
    proteins_100g: z.number().nullable().optional(),
    carbohydrates_100g: z.number().nullable().optional(),
    fat_100g: z.number().nullable().optional(),
    fiber_100g: z.number().nullable().optional(),
    sugars_100g: z.number().nullable().optional(),
    "saturated-fat_100g": z.number().nullable().optional(),
    sodium_100g: z.number().nullable().optional(),
    calcium_100g: z.number().nullable().optional(),
    iron_100g: z.number().nullable().optional(),
    magnesium_100g: z.number().nullable().optional(),
    potassium_100g: z.number().nullable().optional(),
    "vitamin-d_100g": z.number().nullable().optional(),
    "vitamin-b12_100g": z.number().nullable().optional(),
  })
  .passthrough();

export const offProductSchema = z
  .object({
    code: z.string().optional(),
    product_name: z.string().nullable().optional(),
    product_name_en: z.string().nullable().optional(),
    brands: z.string().nullable().optional(),
    nutriments: offNutrimentsSchema.default({}),
    serving_size: z.string().nullable().optional(),
    image_front_url: z.string().url().nullable().optional(),
    ingredients_text: z.string().nullable().optional(),
  })
  .passthrough();

export const offProductResponseSchema = z
  .object({
    status: z.number(),
    product: offProductSchema.optional(),
  })
  .passthrough();

export type OffProduct = z.infer<typeof offProductSchema>;
