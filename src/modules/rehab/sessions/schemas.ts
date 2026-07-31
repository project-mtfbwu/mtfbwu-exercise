import { z } from "zod";
import {
  REHAB_INSTABILITY_LEVELS,
  REHAB_SIDES,
  REHAB_SWELLING_LEVELS,
  REHAB_OBSERVATION_TYPES,
} from "@/modules/rehab/types";

const uuid = z.string().uuid();
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const versionSchema = z.number().int().positive();
const painSchema = z.number().int().min(0).max(10);
const confidenceSchema = z.number().int().min(0).max(10);
const sideSchema = z.enum(REHAB_SIDES);
const swellingSchema = z.enum(REHAB_SWELLING_LEVELS);
const instabilitySchema = z.enum(REHAB_INSTABILITY_LEVELS);

export const scheduleRehabSchema = z.object({
  rehabPlanDayId: uuid.optional(),
  localDate: localDateSchema,
  timezone: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(120),
});

export const startScheduledRehabSchema = z.object({
  scheduledRehabSessionId: uuid,
});

export const startBlankRehabSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  localDate: localDateSchema,
  side: sideSchema.optional(),
});

export const startFromPlanDaySchema = z.object({
  planDayId: uuid,
  localDate: localDateSchema,
});

export const completeRehabSetSchema = z.object({
  setId: uuid,
  version: versionSchema,
  reps: z.number().int().min(0).max(1_000).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  holdSeconds: z.number().int().min(0).max(86_400).optional(),
  load: z.number().finite().min(0).optional(),
  loadUnit: z.string().trim().max(20).optional(),
  assistanceType: z.string().trim().max(80).optional(),
  assistanceAmount: z.string().trim().max(120).optional(),
  romAchieved: z.number().finite().min(0).max(360).optional(),
  painBefore: painSchema.optional(),
  painDuring: painSchema.optional(),
  painAfter: painSchema.optional(),
  swelling: swellingSchema.optional(),
  instability: instabilitySchema.optional(),
  confidence: confidenceSchema.optional(),
  notes: z.string().trim().max(2_000).optional(),
  stopConditionTriggered: z.boolean().optional(),
});

export const skipRehabSetSchema = z.object({
  setId: uuid,
  version: versionSchema,
});

export const stopRehabSetSchema = z.object({
  setId: uuid,
  version: versionSchema,
  painBefore: painSchema.optional(),
  painDuring: painSchema.optional(),
  painAfter: painSchema.optional(),
  swelling: swellingSchema.optional(),
  instability: instabilitySchema.optional(),
  confidence: confidenceSchema.optional(),
  notes: z.string().trim().max(2_000).optional(),
  stopConditionTriggered: z.boolean().optional(),
});

export const recordObservationSchema = z.object({
  sessionId: uuid,
  version: versionSchema,
  observationType: z.enum(REHAB_OBSERVATION_TYPES),
  valueNumeric: z.number().finite().optional(),
  valueText: z.string().trim().max(2_000).optional(),
  side: sideSchema.optional(),
  bodyArea: z.string().trim().max(80).optional(),
});

export const acknowledgeAlertSchema = z.object({
  alertId: uuid,
  sessionId: uuid,
  version: versionSchema,
});

export const finishRehabSessionSchema = z.object({
  sessionId: uuid,
  version: versionSchema,
});

export const discardRehabSessionSchema = z.object({
  sessionId: uuid,
  version: versionSchema,
});

export const previousPerformanceSchema = z.object({
  sourceExerciseId: uuid.optional(),
  exerciseName: z.string().trim().min(1).max(120).optional(),
  setIndex: z.number().int().min(1),
  limit: z.number().int().min(1).max(5).optional(),
});

export const loadSummarySchema = z.object({
  sessionId: uuid,
});

export const getSessionStartOptionsSchema = z.object({
  localDate: localDateSchema,
});

export const scheduleRehabPlanDaySchema = z.object({
  planDayId: uuid,
  localDate: localDateSchema,
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const skipScheduledRehabSchema = z.object({
  scheduledRehabSessionId: uuid,
});

export const cancelScheduledRehabSchema = z.object({
  scheduledRehabSessionId: uuid,
});

export const moveScheduledRehabSchema = z.object({
  scheduledRehabSessionId: uuid,
  localDate: localDateSchema,
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const repeatLastRehabSessionSchema = z.object({
  localDate: localDateSchema,
});
