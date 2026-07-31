import { z } from "zod";
import { WORKOUT_LOAD_UNITS, WORKOUT_SET_ROLES } from "./types";

export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const loadUnitSchema = z.enum(WORKOUT_LOAD_UNITS);
export const setRoleSchema = z.enum(WORKOUT_SET_ROLES);

export const startBlankSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  localDate: localDateSchema,
});

export const startScheduledSessionSchema = z.object({
  scheduledWorkoutId: z.string().uuid(),
});

export const startFromPlanDaySchema = z.object({
  planDayId: z.string().uuid(),
  localDate: localDateSchema,
});

export const completeSetSchema = z.object({
  setId: z.string().uuid(),
  reps: z.number().finite().int().min(0).max(1_000).optional(),
  load: z.number().finite().min(0).max(2_000).optional(),
  loadUnit: loadUnitSchema.optional(),
  durationSeconds: z.number().finite().int().min(0).max(86_400).optional(),
  rpe: z.number().finite().min(0).max(10).optional(),
  /** Expected `workout_sessions.version` — see the concurrency note in `types.ts`. */
  version: z.number().int().positive(),
});

export const skipSetSchema = z.object({
  setId: z.string().uuid(),
  version: z.number().int().positive(),
});

export const addSetSchema = z.object({
  sessionExerciseId: z.string().uuid(),
  setRole: setRoleSchema.optional(),
});

export const addExerciseToSessionSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseDefinitionId: z.string().uuid(),
  workingSets: z.number().int().min(1).max(20).optional(),
  version: z.number().int().positive(),
});

export const finishSessionSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().trim().max(2_000).optional(),
  perceivedEffort: z.number().finite().min(0).max(10).optional(),
  version: z.number().int().positive(),
});

export const cancelSessionSchema = z.object({
  sessionId: z.string().uuid(),
  version: z.number().int().positive().optional(),
});

export const scheduleWorkoutSchema = z.object({
  planDayId: z.string().uuid(),
  localDate: localDateSchema,
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const installArnoldStarterSchema = z.object({}).strict();

export const exerciseHistorySchema = z.object({
  exerciseDefinitionId: z.string().uuid(),
  limit: z.number().int().positive().max(50).optional(),
});

export const copyYesterdaySessionSchema = z.object({
  localDate: localDateSchema,
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const repeatLastSessionSchema = z.object({
  localDate: localDateSchema,
});

export const sessionStartOptionsSchema = z.object({
  localDate: localDateSchema,
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const personalRecordIdSchema = z.object({
  id: z.string().uuid(),
});
