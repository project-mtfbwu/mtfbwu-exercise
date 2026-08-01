import { z } from "zod";

const weightUnitSchema = z.enum(["kg", "lb"]);
const sideSchema = z.enum(["left", "right", "not_applicable"]);

export const saveWeightEntrySchema = z.object({
  id: z.string().uuid().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
  weightValue: z.number().finite().nonnegative(),
  weightUnit: weightUnitSchema,
  note: z.string().max(2000).nullable().optional(),
});

export const deleteWeightEntrySchema = z.object({
  id: z.string().uuid(),
});

export const enableMeasurementSchema = z.object({
  measurementDefinitionId: z.string().uuid(),
  unit: z.enum(["kg", "lb", "cm", "in", "percent"]).optional(),
});

export const createCustomMeasurementSchema = z.object({
  customName: z.string().trim().min(1).max(120),
  unit: z.enum(["cm", "in", "percent"]),
  sideMode: z
    .enum(["not_applicable", "left_right", "single_value"])
    .default("not_applicable"),
});

export const measurementValueInputSchema = z.object({
  userMeasurementDefinitionId: z.string().uuid(),
  side: sideSchema.default("not_applicable"),
  value: z.number().finite().nonnegative(),
  unit: z.enum(["cm", "in", "percent"]),
});

export const saveMeasurementEntrySchema = z.object({
  id: z.string().uuid().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
  title: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  values: z.array(measurementValueInputSchema).min(1),
});

export const deleteMeasurementEntrySchema = z.object({
  id: z.string().uuid(),
});

export const dateRangeSchema = z.enum(["7d", "30d", "90d", "180d", "365d", "all"]);

export type SaveWeightEntryInput = z.infer<typeof saveWeightEntrySchema>;
export type SaveMeasurementEntryInput = z.infer<typeof saveMeasurementEntrySchema>;
