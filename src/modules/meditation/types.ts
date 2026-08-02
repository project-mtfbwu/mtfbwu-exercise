import type { MeditationType } from "@/shared/database/types";

export type MeditationSessionView = {
  id: string;
  localDate: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  meditationType: MeditationType;
  completed: boolean;
  note: string | null;
};

export type MeditationDaySummary = {
  totalDurationSeconds: number;
  sessionCount: number;
  completedCount: number;
  recentSessions: MeditationSessionView[];
};

export type MeditationTimerPhase =
  "active" | "paused" | "expired_pending" | "completed_queued" | "completed_synced";

/**
 * Offline timer draft — persisted in Dexie `meditationTimerState`.
 * Duration uses started_at timestamps minus pause intervals; `targetEndAt` is
 * null while paused.
 */
export type MeditationTimerDraft = {
  sessionId: string;
  userId: string;
  localDate: string;
  timezone: string;
  meditationType: MeditationType;
  targetSeconds: number | null;
  note: string | null;
  startedAt: string;
  /** ISO end boundary when running with a target; null when paused. */
  targetEndAt: string | null;
  phase: MeditationTimerPhase;
  pauseStartedAt: string[];
  pauseEndedAt: string[];
  pausedRemainingSeconds: number | null;
  /** Elapsed active seconds when last paused. */
  accumulatedElapsedSeconds: number;
  updatedAt: string;
};

export const MEDITATION_PRESETS_SECONDS = [300, 600, 900, 1200] as const;
