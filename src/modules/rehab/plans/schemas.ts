import { z } from "zod";
import {
  REHAB_COMPLETION_RULES,
  REHAB_PHASE_TYPES,
  REHAB_RESTRICTION_SEVERITIES,
  REHAB_RESTRICTION_TYPES,
  REHAB_SIDES,
  REHAB_CLINICIAN_SOURCE_TYPES,
} from "@/modules/rehab/types";

const uuid = z.string().uuid();
const nameSchema = z.string().trim().min(1).max(120);
const notesSchema = z.string().trim().max(2_000);
const expectedVersionSchema = z.number().int().positive();
const sideSchema = z.enum(REHAB_SIDES);
const phaseTypeSchema = z.enum(REHAB_PHASE_TYPES);
const completionRuleSchema = z.enum(REHAB_COMPLETION_RULES);
const restrictionTypeSchema = z.enum(REHAB_RESTRICTION_TYPES);
const restrictionSeveritySchema = z.enum(REHAB_RESTRICTION_SEVERITIES);
const clinicianSourceTypeSchema = z.enum(REHAB_CLINICIAN_SOURCE_TYPES);
const painSchema = z.number().int().min(0).max(10);

export const createPlanSchema = z.object({
  name: nameSchema,
  description: notesSchema.optional(),
  objective: z.string().trim().min(1).max(120).optional(),
  side: sideSchema.optional(),
  bodyAreaId: uuid.optional(),
  clinicianSourceId: uuid.optional(),
});

export const updatePlanSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
  name: nameSchema.optional(),
  description: notesSchema.optional(),
  objective: z.string().trim().min(1).max(120).optional(),
  side: sideSchema.optional(),
  bodyAreaId: uuid.nullable().optional(),
  clinicianSourceId: uuid.nullable().optional(),
});

export const archivePlanSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const copyPlanSchema = z.object({ planId: uuid });
export const newVersionPlanSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
});
export const getPlanSchema = z.object({ planId: uuid });

export const addPhaseSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
  name: nameSchema,
  phaseType: phaseTypeSchema.optional(),
});

export const reorderPhasesSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedPhaseIds: z.array(uuid).min(1),
});

export const reorderDaysSchema = z.object({
  phaseId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedDayIds: z.array(uuid).min(1),
});

export const reorderExercisesSchema = z.object({
  dayId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedExerciseIds: z.array(uuid).min(1),
});

export const reorderPrescriptionsSchema = z.object({
  exerciseId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedPrescriptionIds: z.array(uuid).min(1),
});

export const reorderRestrictionsSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
  orderedRestrictionIds: z.array(uuid).min(1),
});

export const addDaySchema = z.object({
  phaseId: uuid,
  expectedVersion: expectedVersionSchema,
  name: nameSchema.optional(),
});

export const addExerciseSchema = z.object({
  dayId: uuid,
  expectedVersion: expectedVersionSchema,
  rehabExerciseDefinitionId: uuid.optional(),
  userRehabExerciseId: uuid.optional(),
  side: sideSchema.optional(),
  instructionsSnapshot: notesSchema.optional(),
  stopConditionsSnapshot: notesSchema.optional(),
});

export const addPrescriptionSchema = z.object({
  exerciseId: uuid,
  expectedVersion: expectedVersionSchema,
  completionRule: completionRuleSchema.optional(),
  targetReps: z.number().int().min(0).max(1_000).optional(),
  targetDurationSeconds: z.number().int().min(0).max(86_400).optional(),
  targetHoldSeconds: z.number().int().min(0).max(86_400).optional(),
  painLimit: painSchema.nullable().optional(),
  romMinDegrees: z.number().finite().min(0).max(360).nullable().optional(),
  romMaxDegrees: z.number().finite().min(0).max(360).nullable().optional(),
});

export const addRestrictionSchema = z.object({
  planId: uuid,
  expectedVersion: expectedVersionSchema,
  restrictionType: restrictionTypeSchema,
  valueText: z.string().trim().min(1).max(2_000),
  side: sideSchema.optional(),
  severity: restrictionSeveritySchema.optional(),
  source: z.string().trim().min(1).max(120).optional(),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().nullable().optional(),
  numericMin: z.number().finite().nullable().optional(),
  numericMax: z.number().finite().nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
});

export const createClinicianSourceSchema = z.object({
  sourceType: clinicianSourceTypeSchema,
  clinicianName: z.string().trim().max(120).optional(),
  clinicName: z.string().trim().max(120).optional(),
  documentTitle: z.string().trim().max(200).optional(),
  documentDate: z.string().optional(),
  notes: notesSchema.optional(),
  confirmedByUser: z.boolean().optional(),
});

export const updateClinicianSourceSchema = createClinicianSourceSchema.extend({
  sourceId: uuid,
});

export const deleteClinicianSourceSchema = z.object({ sourceId: uuid });

export const duplicatePhaseSchema = z.object({
  phaseId: uuid,
  expectedVersion: expectedVersionSchema,
});

export const duplicateDaySchema = z.object({
  dayId: uuid,
  expectedVersion: expectedVersionSchema,
});
