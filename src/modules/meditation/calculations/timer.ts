/**
 * Meditation timer duration helpers.
 * Duration is derived from started_at/completed_at minus paused intervals,
 * not from a simple interval counter alone.
 */

export type PauseInterval = { pauseStart: string; pauseEnd: string | null };

/** Elapsed ms between two ISO timestamps. */
function elapsedMs(startIso: string, endIso: string): number {
  return Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
}

/**
 * Compute active duration in seconds from start/end and pause intervals.
 * Open pauses (pauseEnd null) use `nowIso` as the end boundary.
 */
export function meditationDurationSeconds(input: {
  startedAt: string;
  completedAt: string | null;
  pauseIntervals: PauseInterval[];
  nowIso?: string;
}): number {
  const end = input.completedAt ?? input.nowIso ?? new Date().toISOString();
  let totalMs = elapsedMs(input.startedAt, end);

  for (const pause of input.pauseIntervals) {
    const pauseEnd = pause.pauseEnd ?? end;
    totalMs -= elapsedMs(pause.pauseStart, pauseEnd);
  }

  return Math.max(0, Math.round(totalMs / 1000));
}

/** Build pause intervals from parallel pause start/end arrays (offline draft shape). */
export function pauseIntervalsFromDraft(
  pauseStartedAt: string[],
  pauseEndedAt: string[],
): PauseInterval[] {
  const intervals: PauseInterval[] = [];
  for (let i = 0; i < pauseStartedAt.length; i++) {
    intervals.push({
      pauseStart: pauseStartedAt[i]!,
      pauseEnd: pauseEndedAt[i] ?? null,
    });
  }
  return intervals;
}

/** Neutral board label for meditation day summary. */
export function meditationStatusLabel(
  totalSeconds: number,
  sessionCount: number,
): string {
  if (sessionCount === 0) return "Meditation · not started";
  const mins = Math.round(totalSeconds / 60);
  const sessionWord = sessionCount === 1 ? "session" : "sessions";
  return `${mins} min · ${sessionCount} ${sessionWord}`;
}

/** Format seconds as mm:ss for timer display. */
export function formatMeditationDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
