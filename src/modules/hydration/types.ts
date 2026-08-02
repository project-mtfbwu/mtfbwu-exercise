import type { TrackerEventSource } from "@/shared/database/types";

export type HydrationEntryView = {
  id: string;
  localDate: string;
  occurredAt: string;
  amountMl: number;
  vesselLabel: string | null;
  source: TrackerEventSource;
  note: string | null;
};

export type HydrationTargetView = {
  targetMl: number | null;
  confirmedByUser: boolean;
  effectiveFrom: string;
};

export type HydrationDaySummary = {
  totalMl: number;
  entryCount: number;
  target: HydrationTargetView | null;
  recentEntries: HydrationEntryView[];
};

/** Preset vessel sizes in milliliters. */
export const HYDRATION_VESSEL_PRESETS = [250, 500, 750, 1000] as const;
export type HydrationVesselPreset = (typeof HYDRATION_VESSEL_PRESETS)[number];
