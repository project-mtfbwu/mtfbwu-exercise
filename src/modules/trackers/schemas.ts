import { z } from "zod";

export const createCustomTrackerSchema = z.object({
  customName: z.string().min(1).max(120),
  customDescription: z.string().max(500).optional(),
  unit: z.string().max(32).optional(),
});

export const updateCustomTrackerSchema = z.object({
  id: z.string().uuid(),
  customName: z.string().min(1).max(120),
});

export const enableTrackerSchema = z.object({
  trackerDefinitionId: z.string().uuid(),
  unit: z.string().max(32).optional(),
});

export const setTrackerTargetSchema = z.object({
  userTrackerId: z.string().uuid(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetValue: z.number().min(0).optional(),
  targetUnit: z.string().max(32).optional(),
  targetFrequency: z
    .enum(["daily", "weekly", "selected_days", "as_needed"])
    .default("daily"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  confirmedByUser: z.boolean().default(false),
});

export const saveTrackerEventSchema = z.object({
  id: z.string().uuid().optional(),
  userTrackerId: z.string().uuid(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).default("UTC"),
  valueNumeric: z.number().min(0).optional(),
  valueBoolean: z.boolean().optional(),
  valueText: z.string().max(500).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  unit: z.string().max(32).optional(),
  note: z.string().max(500).optional(),
});

export const deleteTrackerEventSchema = z.object({
  id: z.string().uuid(),
});

export const archiveUserTrackerSchema = z.object({
  id: z.string().uuid(),
});

export const restoreUserTrackerSchema = z.object({
  id: z.string().uuid(),
});

const localTimeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export const saveTrackerReminderSchema = z
  .object({
    id: z.string().uuid().optional(),
    reminderType: z.enum(["tracker", "supplement", "bedtime", "wake", "custom"]),
    userTrackerId: z.string().uuid().optional().nullable(),
    userSupplementId: z.string().uuid().optional().nullable(),
    localTime: localTimeSchema,
    timezone: z.string().min(1),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    enabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.reminderType === "tracker" && !data.userTrackerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a tracker for this reminder.",
        path: ["userTrackerId"],
      });
    }
    if (data.reminderType === "supplement" && !data.userSupplementId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a supplement for this reminder.",
        path: ["userSupplementId"],
      });
    }
  });

export const deleteTrackerReminderSchema = z.object({
  id: z.string().uuid(),
});
