export type RestTimerPersistedState = {
  endAt: number | null;
  pausedRemaining: number | null;
  isPaused: boolean;
};

/** Remaining whole seconds until rest ends (0 when idle or elapsed). */
export function computeRemaining(
  endAt: number | null,
  now: number,
  pausedRemaining: number | null,
  isPaused: boolean,
): number {
  if (isPaused) {
    if (pausedRemaining === null) return 0;
    return Math.max(0, Math.ceil(pausedRemaining / 1000));
  }
  if (endAt === null) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function formatRestTimer(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function readPersistedRestTimer(key: string): RestTimerPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RestTimerPersistedState>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      endAt: typeof parsed.endAt === "number" ? parsed.endAt : null,
      pausedRemaining:
        typeof parsed.pausedRemaining === "number" ? parsed.pausedRemaining : null,
      isPaused: Boolean(parsed.isPaused),
    };
  } catch {
    return null;
  }
}

export function writePersistedRestTimer(
  key: string,
  state: RestTimerPersistedState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* quota / private mode — timer still works in-memory */
  }
}

export function clearPersistedRestTimer(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
