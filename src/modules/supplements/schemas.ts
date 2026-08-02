import { z } from "zod";

const intakeStatus = z.enum(["taken", "skipped", "partial"]);

export const createUserSupplementSchema = z.object({
  supplementDefinitionId: z.string().uuid().optional(),
  customName: z.string().min(1).max(120).optional(),
  brand: z.string().max(120).optional(),
  servingAmount: z.number().min(0).optional(),
  servingUnit: z.string().max(32).optional(),
  instructionsText: z.string().max(500).optional(),
});

export const updateUserSupplementSchema = createUserSupplementSchema.extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
});

export const recordSupplementIntakeSchema = z.object({
  id: z.string().uuid().optional(),
  userSupplementId: z.string().uuid(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyRecordId: z.string().uuid().optional(),
  status: intakeStatus.default("taken"),
  amount: z.number().min(0).optional(),
  unit: z.string().max(32).optional(),
  note: z.string().max(500).optional(),
});

export const deleteSupplementIntakeSchema = z.object({
  id: z.string().uuid(),
});

export type RecordSupplementIntakeInput = z.infer<typeof recordSupplementIntakeSchema>;
