import type {
  RehabInstabilityLevel,
  RehabSetStatus,
  RehabSwellingLevel,
} from "@/modules/rehab/types";

export type RehabSetLike = {
  status: RehabSetStatus;
  painBefore?: number | null;
  painDuring?: number | null;
  painAfter?: number | null;
  confidence?: number | null;
  romAchieved?: number | null;
  assistanceType?: string | null;
  assistanceAmount?: string | null;
  swelling?: RehabSwellingLevel | null;
  instability?: RehabInstabilityLevel | null;
};

export type RehabExerciseLike = {
  sets: readonly RehabSetLike[];
};

export type PainTrendInput = {
  previousMaxPain: number | null;
  currentMaxPain: number | null;
};

export type RomProgressionInput = {
  previousRom: number | null;
  currentRom: number | null;
};

export type AssistanceTrendInput = {
  previousAmount: string | null;
  currentAmount: string | null;
};
