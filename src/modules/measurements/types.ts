import type {
  MeasurementCategory,
  MeasurementSideMode,
  MeasurementValueSide,
  ProgressRecordSource,
} from "@/shared/database/types";
import type { ProgressDateRange } from "@/shared/database/types";

export type { ProgressDateRange };

export type WeightEntryView = {
  id: string;
  localDate: string;
  recordedAt: string;
  timezone: string;
  weightValue: number | null;
  weightUnit: "kg" | "lb";
  normalizedKg: number | null;
  source: ProgressRecordSource;
  note: string | null;
};

export type MeasurementDefinitionView = {
  id: string;
  stableKey: string;
  displayName: string;
  category: MeasurementCategory;
  defaultUnit: string;
  supportsSide: boolean;
  displayOrder: number;
};

export type UserMeasurementDefinitionView = {
  id: string;
  measurementDefinitionId: string | null;
  customName: string | null;
  unit: string;
  sideMode: MeasurementSideMode;
  enabled: boolean;
  displayOrder: number;
  displayName: string;
  stableKey: string | null;
};

export type MeasurementValueView = {
  id: string;
  userMeasurementDefinitionId: string;
  side: MeasurementValueSide;
  value: number;
  unit: string;
  normalizedValue: number;
  displayName: string;
};

export type MeasurementEntryView = {
  id: string;
  localDate: string;
  recordedAt: string;
  timezone: string;
  title: string | null;
  source: ProgressRecordSource;
  note: string | null;
  values: MeasurementValueView[];
};

export type DateRangeSummary = {
  range: ProgressDateRange;
  startDate: string;
  endDate: string;
  weightEntries: WeightEntryView[];
  measurementEntries: MeasurementEntryView[];
  latestWeightKg: number | null;
  earliestWeightKg: number | null;
};

export type ChangeSummary = {
  delta: number | null;
  percentChange: number | null;
  trendText: string | null;
};
