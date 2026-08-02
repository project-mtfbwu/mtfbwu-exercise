import {
  meditationDurationSeconds,
  pauseIntervalsFromDraft,
  type PauseInterval,
} from "@/modules/meditation/calculations/timer";
import type { MeditationTimerDraft } from "@/modules/meditation/types";

export type TimerRecoveryState =
  "active" | "paused" | "expired_pending" | "completed_queued" | "none";

function pauseMs(intervals: PauseInterval[], nowIso: string): number {
  let total = 0;
  for (const pause of intervals) {
    const pauseEnd = pause.pauseEnd ?? nowIso;
    total += Math.max(
      0,
      new Date(pauseEnd).getTime() - new Date(pause.pauseStart).getTime(),
    );
  }
  return total;
}

/** Wall-clock instant when a countdown target is reached (pauses extend the end). */
export function computeTargetEndAt(
  startedAt: string,
  targetSeconds: number,
  pauseIntervals: PauseInterval[],
  nowIso?: string,
): string {
  const now = nowIso ?? new Date().toISOString();
  const endMs =
    new Date(startedAt).getTime() + targetSeconds * 1000 + pauseMs(pauseIntervals, now);
  return new Date(endMs).toISOString();
}

export function remainingSeconds(input: {
  targetSeconds: number | null;
  startedAt: string;
  pauseIntervals: PauseInterval[];
  now: string;
  paused: boolean;
  pausedRemaining: number | null;
}): number {
  if (input.paused && input.pausedRemaining !== null) {
    return Math.max(0, input.pausedRemaining);
  }

  const elapsed = meditationDurationSeconds({
    startedAt: input.startedAt,
    completedAt: null,
    pauseIntervals: input.pauseIntervals,
    nowIso: input.now,
  });

  if (input.targetSeconds !== null) {
    return Math.max(0, input.targetSeconds - elapsed);
  }

  return elapsed;
}

export function isTimerPaused(draft: MeditationTimerDraft): boolean {
  return draft.pauseStartedAt.length > draft.pauseEndedAt.length;
}

export function classifyTimerRecovery(
  draft: MeditationTimerDraft,
  now: string,
): TimerRecoveryState {
  if (draft.phase === "completed_synced") return "none";
  if (draft.phase === "completed_queued") return "completed_queued";
  if (draft.phase === "expired_pending") return "expired_pending";
  if (draft.phase === "paused" || isTimerPaused(draft)) return "paused";

  if (draft.phase === "active") {
    if (draft.targetSeconds !== null) {
      const intervals = pauseIntervalsFromDraft(draft.pauseStartedAt, draft.pauseEndedAt);
      const remaining = remainingSeconds({
        targetSeconds: draft.targetSeconds,
        startedAt: draft.startedAt,
        pauseIntervals: intervals,
        now,
        paused: false,
        pausedRemaining: null,
      });
      if (remaining <= 0) return "expired_pending";
    }
    return "active";
  }

  return "none";
}

export function oneActiveTimerGuard(
  existing: MeditationTimerDraft | null,
  incoming: MeditationTimerDraft,
  now?: string,
): { ok: true } | { ok: false; reason: string } {
  if (!existing) return { ok: true };
  if (existing.sessionId === incoming.sessionId) return { ok: true };

  const nowIso = now ?? new Date().toISOString();
  const state = classifyTimerRecovery(existing, nowIso);
  if (state === "active" || state === "paused" || state === "expired_pending") {
    return { ok: false, reason: "Another meditation timer is already active." };
  }
  return { ok: true };
}

export function cannotReopenCompleted(draft: MeditationTimerDraft): boolean {
  return draft.phase === "completed_queued" || draft.phase === "completed_synced";
}

/** Wrong board day — do not auto-attach recovered timer. */
export function attachLocalDateGuard(
  draftLocalDate: string,
  boardLocalDate: string,
): boolean {
  return draftLocalDate === boardLocalDate;
}

export function pauseIntervalsForDraft(draft: MeditationTimerDraft): PauseInterval[] {
  return pauseIntervalsFromDraft(draft.pauseStartedAt, draft.pauseEndedAt);
}
