import { z } from "zod";

export const createLabelCaptureSchema = z.object({
  barcode: z.string().trim().max(64).optional(),
});

/** Persist OCR output + optional private image path after client preprocess/upload. */
export const recordLabelCaptureOcrSchema = z.object({
  captureId: z.string().uuid(),
  privateImagePath: z.string().trim().min(1).max(512).nullable().optional(),
  ocrText: z.string().max(100_000),
  extractionJson: z.unknown(),
  language: z.string().trim().max(32).default("eng"),
  confidenceSummary: z.number().min(0).max(1).nullable().optional(),
});

export const labelNutrientsPer100gSchema = z.object({
  energyKcal: z.number().min(0).max(10_000),
  proteinG: z.number().min(0).max(1_000),
  carbohydrateG: z.number().min(0).max(1_000),
  fatG: z.number().min(0).max(1_000),
  fiberG: z.number().min(0).max(1_000),
  sugarG: z.number().min(0).max(1_000).optional(),
  saturatedFatG: z.number().min(0).max(1_000).optional(),
  sodiumMg: z.number().min(0).max(20_000).optional(),
});

export const saveReviewedLabelProductSchema = z.object({
  captureId: z.string().uuid(),
  productName: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(160).optional(),
  barcode: z.string().trim().max(64).optional(),
  servingGrams: z.number().positive().max(10_000),
  nutrientsPer100g: labelNutrientsPer100gSchema,
  /** The reviewer must explicitly confirm the values before anything is written. */
  confirmedReview: z.literal(true),
  /** Set when the reviewer chooses to save a private copy despite a barcode conflict. */
  forceOverride: z.boolean().optional(),
  /** Keep the captured photo/OCR text attached to the capture row after saving. */
  retainImage: z.boolean().optional(),
});

export type SaveReviewedLabelProductInput = z.infer<
  typeof saveReviewedLabelProductSchema
>;

export const discardLabelCaptureSchema = z.object({
  captureId: z.string().uuid(),
});
