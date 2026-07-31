"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionPreference } from "@/shared/providers/motion-provider";
import {
  clearPersistedRestTimer,
  computeRemaining,
  readPersistedRestTimer,
  writePersistedRestTimer,
  type RestTimerPersistedState,
} from "./rest-timer-utils";

export type UseRestTimerOptions = {
  /** Whole seconds to rest after a set when auto-start is enabled. */
  defaultRestSeconds?: number;
  /** Begin rest automatically after `notifySetCompleted`. */
  autoStartAfterSet?: boolean;
  /** localStorage key — typically scoped to active session id. */
  persistKey?: string | null;
  onRestComplete?: () => void;
};

export type UseRestTimerResult = {
  remainingSeconds: number;
  isActive: boolean;
  isPaused: boolean;
  reducedMotion: boolean;
  start: (seconds?: number) => void;
  pause: () => void;
  resume: () => void;
  addSeconds: (delta: number) => void;
  skip: () => void;
  /** Call after logging a set to optionally auto-start rest. */
  notifySetCompleted: () => void;
};

function idleState(): RestTimerPersistedState {
  return { endAt: null, pausedRemaining: null, isPaused: false };
}

export function useRestTimer(options: UseRestTimerOptions = {}): UseRestTimerResult {
  const {
    defaultRestSeconds = 90,
    autoStartAfterSet = true,
    persistKey = null,
    onRestComplete,
  } = options;

  const { resolution } = useMotionPreference();
  const reducedMotion =
    resolution.preference === "off" || resolution.preference === "reduced";

  const onCompleteRef = useRef(onRestComplete);
  useEffect(() => {
    onCompleteRef.current = onRestComplete;
  }, [onRestComplete]);

  const [timerState, setTimerState] = useState<RestTimerPersistedState>(() => {
    if (persistKey) {
      const restored = readPersistedRestTimer(persistKey);
      if (restored) return restored;
    }
    return idleState();
  });

  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef(false);

  const remainingSeconds = computeRemaining(
    timerState.endAt,
    now,
    timerState.pausedRemaining,
    timerState.isPaused,
  );
  const isActive = remainingSeconds > 0 || timerState.isPaused;
  const isPaused = timerState.isPaused;

  const persist = useCallback(
    (next: RestTimerPersistedState) => {
      setTimerState(next);
      if (persistKey) {
        if (next.endAt === null && !next.isPaused) {
          clearPersistedRestTimer(persistKey);
        } else {
          writePersistedRestTimer(persistKey, next);
        }
      }
    },
    [persistKey],
  );

  const start = useCallback(
    (seconds: number = defaultRestSeconds) => {
      completedRef.current = false;
      const safeSeconds = Math.max(0, Math.floor(seconds));
      if (safeSeconds <= 0) {
        persist(idleState());
        return;
      }
      persist({
        endAt: Date.now() + safeSeconds * 1000,
        pausedRemaining: null,
        isPaused: false,
      });
      setNow(Date.now());
    },
    [defaultRestSeconds, persist],
  );

  const pause = useCallback(() => {
    setTimerState((previous) => {
      if (previous.isPaused || previous.endAt === null) return previous;
      const remainingMs = Math.max(0, previous.endAt - Date.now());
      const next: RestTimerPersistedState = {
        endAt: null,
        pausedRemaining: remainingMs,
        isPaused: true,
      };
      if (persistKey) writePersistedRestTimer(persistKey, next);
      return next;
    });
  }, [persistKey]);

  const resume = useCallback(() => {
    setTimerState((previous) => {
      if (!previous.isPaused || previous.pausedRemaining === null) return previous;
      const next: RestTimerPersistedState = {
        endAt: Date.now() + previous.pausedRemaining,
        pausedRemaining: null,
        isPaused: false,
      };
      if (persistKey) writePersistedRestTimer(persistKey, next);
      setNow(Date.now());
      return next;
    });
  }, [persistKey]);

  const addSeconds = useCallback(
    (delta: number) => {
      setTimerState((previous) => {
        if (previous.isPaused && previous.pausedRemaining !== null) {
          const next: RestTimerPersistedState = {
            ...previous,
            pausedRemaining: Math.max(0, previous.pausedRemaining + delta * 1000),
          };
          if (persistKey) writePersistedRestTimer(persistKey, next);
          return next;
        }
        if (previous.endAt !== null) {
          const next: RestTimerPersistedState = {
            ...previous,
            endAt: previous.endAt + delta * 1000,
          };
          if (persistKey) writePersistedRestTimer(persistKey, next);
          setNow(Date.now());
          return next;
        }
        return previous;
      });
    },
    [persistKey],
  );

  const skip = useCallback(() => {
    completedRef.current = false;
    persist(idleState());
    setNow(Date.now());
  }, [persist]);

  const notifySetCompleted = useCallback(() => {
    if (autoStartAfterSet) start(defaultRestSeconds);
  }, [autoStartAfterSet, defaultRestSeconds, start]);

  useEffect(() => {
    if (!isActive || isPaused) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [isActive, isPaused]);

  useEffect(() => {
    if (remainingSeconds > 0 || isPaused) return;
    if (timerState.endAt === null && !timerState.isPaused) return;
    if (completedRef.current) return;
    completedRef.current = true;
    persist(idleState());
    onCompleteRef.current?.();
  }, [remainingSeconds, isPaused, timerState.endAt, timerState.isPaused, persist]);

  useEffect(() => {
    if (!persistKey) return;
    const restored = readPersistedRestTimer(persistKey);
    if (!restored) return;
    // Defer so the restore is not a synchronous setState-in-effect.
    const id = window.setTimeout(() => {
      setTimerState(restored);
      setNow(Date.now());
    }, 0);
    return () => window.clearTimeout(id);
  }, [persistKey]);

  return {
    remainingSeconds,
    isActive,
    isPaused,
    reducedMotion,
    start,
    pause,
    resume,
    addSeconds,
    skip,
    notifySetCompleted,
  };
}
