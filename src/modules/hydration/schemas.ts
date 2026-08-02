import { z } from "zod";

export const addHydrationEntrySchema = z.object({
  id: z.string().uuid().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyRecordId: z.string().uuid().optional(),
  amountMl: z.number().positive().max(10000),
  vesselLabel: z.string().max(64).optional(),
  note: z.string().max(500).optional(),
});

export const deleteHydrationEntrySchema = z.object({
  id: z.string().uuid(),
});

export const setHydrationTargetSchema = z.object({
  userTrackerId: z.string().uuid(),
  targetMl: z.number().positive().max(20000),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confirmedByUser: z.literal(true),
});

export type AddHydrationEntryInput = z.infer<typeof addHydrationEntrySchema>;
export type DeleteHydrationEntryInput = z.infer<typeof deleteHydrationEntrySchema>;
export type SetHydrationTargetInput = z.infer<typeof setHydrationTargetSchema>;
