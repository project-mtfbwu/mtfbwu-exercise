import { z } from "zod";
import { WORKOUT_BLOCK_TYPES, WORKOUT_SET_ROLES } from "@/modules/workout/sessions/types";

const blockTypeSchema = z.enum(WORKOUT_BLOCK_TYPES);
const setRoleSchema = z.enum(WORKOUT_SET_ROLES);
/** DB enum has grown across migrations (see `ADVANCED_SET_TYPES.md`); accept
 * any non-empty label rather than hard-coding every value here. Invalid
 * values still fail at the database check/enum constraint. */
const completionRuleSchema = z.string().trim().min(1).max(40);

const nameSchema = z.string().trim().min(1).max(120);
const notesSchema = z.string().trim().max(2_000);
const uuid = z.string().uuid();
const expectedVersionSchema = z.number().int().positive();
const dayOfWeekSchema = z.number().int().min(0).max(6).nullable();
const repsSchema = z.number().finite().int().min(0).max(1_000);
const weightKgSchema = z.number().finite().min(0).max(2_000);
const durationSecondsSchema = z.number().finite().int().min(0).max(86_400);
const distanceMetersSchema = z.number().finite().min(0).max(100_000);
const effortScaleSchema = z.number().finite().min(0).max(10);
const tempoSecondsSchema = z.number().finite().int().min(0).max(300);
const restSecondsSchema = z.number().finite().int().min(0).max(3_600);

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export const createPlanSchema = z.object({
  name: nameSchema,
  description: notesSchema.optional(),
  objective: z.string().trim().min(1).max(120).optional(),
});

export const updatePlanMetaSchema = z.object({
  planId: uuid,
  name: nameSchema,
  description: notesSchema.optional(),
  objective: z.string().trim().min(1).max(120).optional(),
  expectedVersion: expectedVersionSchema,
});

export const archivePlanSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const copyPlanSchema = z.object({
  planId: uuid,
});

export const versionPlanSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const getPlanSchema = z.object({
  planId: uuid,
});

// ---------------------------------------------------------------------------
// Plan days
// ---------------------------------------------------------------------------

export const addPlanDaySchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
  name: nameSchema.optional(),
  dayOfWeek: dayOfWeekSchema.optional(),
  restDay: z.boolean().optional(),
});

export const updatePlanDaySchema = z.object({
  dayId: uuid,
  expectedVersion: expectedVersionSchema,
  name: nameSchema.optional(),
  dayOfWeek: dayOfWeekSchema.optional(),
  restDay: z.boolean().optional(),
});

export const deletePlanDaySchema = z.object({
  dayId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const duplicatePlanDaySchema = z.object({
  dayId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const reorderPlanDaysSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedDayIds: z.array(uuid).min(1),
});

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export const addBlockSchema = z.object({
  planDayId: uuid,
  expectedVersion: expectedVersionSchema,
  blockType: blockTypeSchema,
  title: z.string().trim().max(120).optional(),
  rounds: z.number().int().min(1).max(50).optional(),
  restSeconds: restSecondsSchema.optional(),
  transitionSeconds: restSecondsSchema.optional(),
});

export const updateBlockSchema = z.object({
  blockId: uuid,
  expectedVersion: expectedVersionSchema,
  blockType: blockTypeSchema.optional(),
  title: z.string().trim().max(120).nullable().optional(),
  rounds: z.number().int().min(1).max(50).nullable().optional(),
  restSeconds: restSecondsSchema.nullable().optional(),
  transitionSeconds: restSecondsSchema.nullable().optional(),
});

export const deleteBlockSchema = z.object({
  blockId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const duplicateBlockSchema = z.object({
  blockId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const reorderBlocksSchema = z.object({
  planDayId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedBlockIds: z.array(uuid).min(1),
});

// ---------------------------------------------------------------------------
// Block exercises — exactly one of exerciseDefinitionId / userExerciseId
// ---------------------------------------------------------------------------

function exerciseSourceRefinement(
  data: { exerciseDefinitionId?: string; userExerciseId?: string },
  ctx: z.RefinementCtx,
): void {
  const hasDefinition = data.exerciseDefinitionId !== undefined;
  const hasUserExercise = data.userExerciseId !== undefined;
  if (hasDefinition === hasUserExercise) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide exactly one of exerciseDefinitionId or userExerciseId.",
    });
  }
}

export const addBlockExerciseSchema = z
  .object({
    blockId: uuid,
    expectedVersion: expectedVersionSchema,
    exerciseDefinitionId: uuid.optional(),
    userExerciseId: uuid.optional(),
  })
  .superRefine(exerciseSourceRefinement);

export const substituteBlockExerciseSchema = z
  .object({
    blockExerciseId: uuid,
    expectedVersion: expectedVersionSchema,
    exerciseDefinitionId: uuid.optional(),
    userExerciseId: uuid.optional(),
  })
  .superRefine(exerciseSourceRefinement);

export const deleteBlockExerciseSchema = z.object({
  blockExerciseId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const reorderBlockExercisesSchema = z.object({
  blockId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedBlockExerciseIds: z.array(uuid).min(1),
});

// ---------------------------------------------------------------------------
// User (custom) exercises
// ---------------------------------------------------------------------------

export const createUserExerciseSchema = z.object({
  customName: nameSchema,
  notes: notesSchema.optional(),
});

// ---------------------------------------------------------------------------
// Set prescriptions
// ---------------------------------------------------------------------------

const prescriptionFieldsSchema = {
  setRole: setRoleSchema,
  completionRule: completionRuleSchema.optional(),
  targetRepsMin: repsSchema.optional(),
  targetRepsMax: repsSchema.optional(),
  targetWeightKg: weightKgSchema.optional(),
  targetDurationSeconds: durationSecondsSchema.optional(),
  targetDistanceMeters: distanceMetersSchema.optional(),
  targetRpe: effortScaleSchema.optional(),
  targetRir: effortScaleSchema.optional(),
  tempoEccentricSeconds: tempoSecondsSchema.optional(),
  tempoPauseBottomSeconds: tempoSecondsSchema.optional(),
  tempoConcentricSeconds: tempoSecondsSchema.optional(),
  tempoPauseTopSeconds: tempoSecondsSchema.optional(),
  restSeconds: restSecondsSchema.optional(),
  notes: notesSchema.optional(),
};

function repRangeRefinement(
  data: { targetRepsMin?: number; targetRepsMax?: number },
  ctx: z.RefinementCtx,
) {
  if (
    data.targetRepsMin !== undefined &&
    data.targetRepsMax !== undefined &&
    data.targetRepsMax < data.targetRepsMin
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetRepsMax"],
      message: "targetRepsMax must be greater than or equal to targetRepsMin.",
    });
  }
}

export const addPrescriptionSchema = z
  .object({
    blockExerciseId: uuid,
    expectedVersion: expectedVersionSchema,
    ...prescriptionFieldsSchema,
  })
  .superRefine(repRangeRefinement);

export const updatePrescriptionSchema = z
  .object({
    prescriptionId: uuid,
    expectedVersion: expectedVersionSchema,
    ...prescriptionFieldsSchema,
    setRole: setRoleSchema.optional(),
  })
  .superRefine(repRangeRefinement);

export const deletePrescriptionSchema = z.object({
  prescriptionId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const duplicatePrescriptionSchema = z.object({
  prescriptionId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const reorderPrescriptionsSchema = z.object({
  blockExerciseId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedPrescriptionIds: z.array(uuid).min(1),
});
