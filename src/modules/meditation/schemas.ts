import { z } from "zod";

const meditationType = z.enum([
  "breathing",
  "mindfulness",
  "body_scan",
  "guided",
  "mantra",
  "visualization",
  "walking",
  "custom",
]);

export const saveMeditationSessionSchema = z.object({
  id: z.string().uuid().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyRecordId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  durationSeconds: z.number().int().min(0),
  meditationType: meditationType.default("mindfulness"),
  completed: z.boolean().default(true),
  note: z.string().max(500).optional(),
});

export const deleteMeditationSessionSchema = z.object({
  id: z.string().uuid(),
});

export type SaveMeditationSessionInput = z.infer<typeof saveMeditationSessionSchema>;
