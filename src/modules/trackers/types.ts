import type {
  TrackerEventSource,
  TrackerReminderType,
  TrackerTargetFrequency,
  TrackerType,
  TrackerValueType,
} from "@/shared/database/types";

export type TrackerDefinitionView = {
  id: string;
  stableKey: string;
  displayName: string;
  description: string | null;
  trackerType: TrackerType;
  valueType: TrackerValueType;
  defaultUnit: string | null;
  supportsTarget: boolean;
  supportsStreak: boolean;
};

export type UserTrackerView = {
  id: string;
  trackerDefinitionId: string | null;
  customName: string | null;
  customDescription: string | null;
  enabled: boolean;
  unit: string | null;
  archivedAt: string | null;
  displayName: string;
  stableKey: string | null;
};

export type TrackerTargetView = {
  id: string;
  userTrackerId: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  targetFrequency: TrackerTargetFrequency;
  daysOfWeek: number[] | null;
  confirmedByUser: boolean;
};

export type TrackerEventView = {
  id: string;
  userTrackerId: string;
  localDate: string;
  occurredAt: string;
  valueNumeric: number | null;
  valueBoolean: boolean | null;
  valueText: string | null;
  durationSeconds: number | null;
  unit: string | null;
  source: TrackerEventSource;
  note: string | null;
};

export type CustomTrackerDaySummary = {
  userTracker: UserTrackerView | null;
  events: TrackerEventView[];
  target: TrackerTargetView | null;
};

export type TrackerReminderView = {
  id: string;
  reminderType: TrackerReminderType;
  userTrackerId: string | null;
  userSupplementId: string | null;
  localTime: string;
  timezone: string;
  daysOfWeek: number[];
  enabled: boolean;
  label: string;
};
