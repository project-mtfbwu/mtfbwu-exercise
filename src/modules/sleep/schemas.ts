import { z } from "zod";

const sleepQuality = z.enum(["very_poor", "poor", "fair", "good", "very_good"]);

export const saveSleepSessionSchema = z.object({
  id: z.string().uuid().optional(),
  timezone: z.string().min(1),
  bedtimeAt: z.string().datetime(),
  wakeAt: z.string().datetime(),
  quality: sleepQuality.optional(),
  interruptions: z.number().int().min(0).optional(),
  nap: z.boolean().default(false),
  note: z.string().max(500).optional(),
});

export const deleteSleepSessionSchema = z.object({
  id: z.string().uuid(),
});

export type SaveSleepSessionInput = z.infer<typeof saveSleepSessionSchema>;
