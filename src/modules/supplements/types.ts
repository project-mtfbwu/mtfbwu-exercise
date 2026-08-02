import type { SupplementForm, SupplementIntakeStatus } from "@/shared/database/types";

export type SupplementDefinitionView = {
  id: string;
  stableKey: string | null;
  displayName: string;
  form: SupplementForm;
  defaultUnit: string | null;
};

export type UserSupplementView = {
  id: string;
  supplementDefinitionId: string | null;
  customName: string | null;
  brand: string | null;
  servingAmount: number | null;
  servingUnit: string | null;
  instructionsText: string | null;
  active: boolean;
  displayName: string;
};

export type SupplementIntakeView = {
  id: string;
  userSupplementId: string;
  localDate: string;
  takenAt: string;
  amount: number | null;
  unit: string | null;
  status: SupplementIntakeStatus;
  note: string | null;
};

export type SupplementDaySummary = {
  activeSupplements: UserSupplementView[];
  intakes: SupplementIntakeView[];
  takenCount: number;
  skippedCount: number;
  totalActive: number;
};
