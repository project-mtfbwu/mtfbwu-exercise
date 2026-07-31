import type { WorkoutBlockType, WorkoutSetRole } from "@/modules/workout/sessions/types";

export type BlockPatch = {
  blockType?: WorkoutBlockType;
  title?: string | null;
  rounds?: number | null;
  restSeconds?: number | null;
  transitionSeconds?: number | null;
};

export type PrescriptionPatch = {
  setRole?: WorkoutSetRole;
  completionRule?: string;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetWeightKg?: number;
  targetDurationSeconds?: number;
  targetDistanceMeters?: number;
  targetRpe?: number;
  targetRir?: number;
  tempoEccentricSeconds?: number;
  tempoPauseBottomSeconds?: number;
  tempoConcentricSeconds?: number;
  tempoPauseTopSeconds?: number;
  restSeconds?: number;
  notes?: string;
};

/**
 * Every server-mutating operation the editor can perform, centralized here so
 * `PlanEditorClient` is the single place that knows about `expectedVersion`
 * and reorder-id bookkeeping — child components only describe *what* changed.
 */
export type PlanEditorActions = {
  updateDay: (dayId: string, patch: { name?: string; restDay?: boolean }) => void;
  deleteDay: (dayId: string) => void;
  duplicateDay: (dayId: string) => void;
  moveDay: (dayId: string, delta: number) => void;
  addBlock: (planDayId: string, blockType: WorkoutBlockType) => void;
  updateBlock: (blockId: string, patch: BlockPatch) => void;
  deleteBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
  moveBlock: (planDayId: string, blockId: string, delta: number) => void;
  addExerciseFromCatalog: (blockId: string, exerciseDefinitionId: string) => void;
  addCustomExercise: (blockId: string) => void;
  substituteExerciseFromCatalog: (
    blockExerciseId: string,
    exerciseDefinitionId: string,
  ) => void;
  substituteWithCustomExercise: (blockExerciseId: string) => void;
  deleteExercise: (blockExerciseId: string) => void;
  moveExercise: (blockId: string, blockExerciseId: string, delta: number) => void;
  addPrescription: (blockExerciseId: string, setRole: WorkoutSetRole) => void;
  updatePrescription: (prescriptionId: string, patch: PrescriptionPatch) => void;
  deletePrescription: (prescriptionId: string) => void;
  duplicatePrescription: (prescriptionId: string) => void;
  movePrescription: (
    blockExerciseId: string,
    prescriptionId: string,
    delta: number,
  ) => void;
};
