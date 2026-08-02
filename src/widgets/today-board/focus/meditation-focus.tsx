"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { saveMeditationSessionAction } from "@/modules/meditation/actions";
import {
  formatMeditationDuration,
  meditationDurationSeconds,
  meditationStatusLabel,
} from "@/modules/meditation/calculations";
import {
  attachLocalDateGuard,
  cannotReopenCompleted,
  classifyTimerRecovery,
  computeTargetEndAt,
  oneActiveTimerGuard,
  pauseIntervalsForDraft,
  remainingSeconds,
  type TimerRecoveryState,
} from "@/modules/meditation/calculations/timer-recovery";
import {
  MEDITATION_PRESETS_SECONDS,
  type MeditationDaySummary,
  type MeditationTimerDraft,
  type MeditationTimerPhase,
} from "@/modules/meditation/types";
import {
  clearMeditationTimerState,
  loadMeditationTimerState,
  markMeditationTimerCompletedQueued,
  saveMeditationTimerState,
} from "@/modules/meditation/timer-persistence";
import { useOnlineStore } from "@/shared/offline/online-store";
import { createBoardSyncCoordinator } from "@/shared/offline/sync-coordinator";
import { createSupabaseBrowserClient } from "@/shared/database/client";
import {
  buildMeditationSessionWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import type { OfflineRecordStatus } from "@/shared/offline/offline-record-status";
import { OfflineRecordStatusBadge } from "@/shared/ui/flat-lay/offline-record-status-badge";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import type { MeditationType } from "@/shared/database/types";

export type MeditationFocusProps = {
  titleId: string;
  userId: string;
  localDate: string;
  timezone: string;
  dailyRecordId: string;
  meditationDaySummary?: MeditationDaySummary;
  onSaved: (summary: string) => void;
  onCancel: () => void;
};

function buildDraft(input: {
  sessionId: string;
  userId: string;
  localDate: string;
  timezone: string;
  meditationType: MeditationType;
  targetSeconds: number | null;
  note: string | null;
  startedAt: string;
  phase: MeditationTimerPhase;
  pauseStartedAt: string[];
  pauseEndedAt: string[];
  pausedRemainingSeconds: number | null;
  accumulatedElapsedSeconds: number;
  now: string;
}): MeditationTimerDraft {
  const intervals = pauseIntervalsForDraft({
    pauseStartedAt: input.pauseStartedAt,
    pauseEndedAt: input.pauseEndedAt,
  } as MeditationTimerDraft);

  const paused = input.pauseStartedAt.length > input.pauseEndedAt.length;
  const targetEndAt =
    !paused && input.targetSeconds !== null
      ? computeTargetEndAt(input.startedAt, input.targetSeconds, intervals, input.now)
      : null;

  return {
    sessionId: input.sessionId,
    userId: input.userId,
    localDate: input.localDate,
    timezone: input.timezone,
    meditationType: input.meditationType,
    targetSeconds: input.targetSeconds,
    note: input.note,
    startedAt: input.startedAt,
    targetEndAt,
    phase: input.phase,
    pauseStartedAt: input.pauseStartedAt,
    pauseEndedAt: input.pauseEndedAt,
    pausedRemainingSeconds: input.pausedRemainingSeconds,
    accumulatedElapsedSeconds: input.accumulatedElapsedSeconds,
    updatedAt: input.now,
  };
}

export function MeditationFocus({
  titleId,
  userId,
  localDate,
  timezone,
  dailyRecordId,
  meditationDaySummary,
  onSaved,
  onCancel,
}: MeditationFocusProps) {
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [meditationType, setMeditationType] = useState<MeditationType>("mindfulness");
  const [targetSeconds, setTargetSeconds] = useState<number | null>(600);
  const [note, setNote] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [pauseStartedAt, setPauseStartedAt] = useState<string[]>([]);
  const [pauseEndedAt, setPauseEndedAt] = useState<string[]>([]);
  const [phase, setPhase] = useState<MeditationTimerPhase | "idle">("idle");
  const [pausedRemainingSeconds, setPausedRemainingSeconds] = useState<number | null>(
    null,
  );
  const [tick, setTick] = useState(0);
  const [recoveryState, setRecoveryState] = useState<TimerRecoveryState>("none");
  const [restoredBanner, setRestoredBanner] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<OfflineRecordStatus | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const online = useOnlineStore((s) => s.status) !== "offline";
  const syncing = useSyncStatusStore((s) => s.status) === "syncing";
  const failedCount = useSyncStatusStore((s) => s.failedCount);

  const badgeStatus: OfflineRecordStatus | null = syncing
    ? "syncing"
    : failedCount > 0 && recordStatus === "queued"
      ? "failed"
      : recordStatus;
  const tickRef = useRef<number | null>(null);
  const persistTimerRef = useRef<number | null>(null);
  const coordinator = useRef(
    createBoardSyncCoordinator(() => createSupabaseBrowserClient()),
  );

  const running = phase === "active" || phase === "paused" || phase === "expired_pending";

  const persistDraft = useCallback(
    (next: Partial<MeditationTimerDraft> & { phase: MeditationTimerPhase }) => {
      if (!startedAt) return;
      const now = new Date().toISOString();
      const draft = buildDraft({
        sessionId,
        userId,
        localDate,
        timezone,
        meditationType,
        targetSeconds,
        note: note.trim() || null,
        startedAt,
        phase: next.phase,
        pauseStartedAt: next.pauseStartedAt ?? pauseStartedAt,
        pauseEndedAt: next.pauseEndedAt ?? pauseEndedAt,
        pausedRemainingSeconds:
          next.pausedRemainingSeconds !== undefined
            ? next.pausedRemainingSeconds
            : pausedRemainingSeconds,
        accumulatedElapsedSeconds:
          next.accumulatedElapsedSeconds ??
          meditationDurationSeconds({
            startedAt,
            completedAt: null,
            pauseIntervals: pauseIntervalsForDraft({
              pauseStartedAt: next.pauseStartedAt ?? pauseStartedAt,
              pauseEndedAt: next.pauseEndedAt ?? pauseEndedAt,
            } as MeditationTimerDraft),
            nowIso: now,
          }),
        now,
      });
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        void saveMeditationTimerState(draft);
      }, 250);
    },
    [
      startedAt,
      sessionId,
      userId,
      localDate,
      timezone,
      meditationType,
      targetSeconds,
      note,
      pauseStartedAt,
      pauseEndedAt,
      pausedRemainingSeconds,
    ],
  );

  const refreshDisplay = useCallback(() => {
    if (!startedAt) return 0;
    const now = new Date().toISOString();
    const intervals = pauseIntervalsForDraft({
      pauseStartedAt,
      pauseEndedAt,
    } as MeditationTimerDraft);
    const paused = pauseStartedAt.length > pauseEndedAt.length;
    return remainingSeconds({
      targetSeconds,
      startedAt,
      pauseIntervals: intervals,
      now,
      paused,
      pausedRemaining: pausedRemainingSeconds,
    });
  }, [startedAt, pauseStartedAt, pauseEndedAt, targetSeconds, pausedRemainingSeconds]);

  const displaySeconds = useMemo(() => {
    void tick;
    return refreshDisplay();
  }, [refreshDisplay, tick]);

  useEffect(() => {
    if (!running || phase !== "active" || !startedAt) return;

    const checkExpiry = () => {
      const now = new Date().toISOString();
      const draft = buildDraft({
        sessionId,
        userId,
        localDate,
        timezone,
        meditationType,
        targetSeconds,
        note: note.trim() || null,
        startedAt,
        phase: "active",
        pauseStartedAt,
        pauseEndedAt,
        pausedRemainingSeconds,
        accumulatedElapsedSeconds: refreshDisplay(),
        now,
      });
      if (classifyTimerRecovery(draft, now) === "expired_pending") {
        setPhase("expired_pending");
        setLiveMessage("Meditation timer reached target while away.");
        void saveMeditationTimerState({ ...draft, phase: "expired_pending" });
      }
    };

    tickRef.current = window.setInterval(() => {
      setTick((t) => t + 1);
      checkExpiry();
    }, 1000);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [
    running,
    phase,
    startedAt,
    sessionId,
    userId,
    localDate,
    timezone,
    meditationType,
    targetSeconds,
    note,
    pauseStartedAt,
    pauseEndedAt,
    pausedRemainingSeconds,
    refreshDisplay,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadMeditationTimerState(userId);
      if (!stored || cancelled) return;
      if (!attachLocalDateGuard(stored.localDate, localDate)) return;
      if (cannotReopenCompleted(stored)) {
        const now = new Date().toISOString();
        const classified = classifyTimerRecovery(stored, now);
        setRecoveryState(classified);
        setSessionId(stored.sessionId);
        setMeditationType(stored.meditationType);
        setTargetSeconds(stored.targetSeconds);
        setNote(stored.note ?? "");
        setStartedAt(stored.startedAt);
        setPauseStartedAt(stored.pauseStartedAt);
        setPauseEndedAt(stored.pauseEndedAt);
        setPhase(stored.phase);
        setPausedRemainingSeconds(stored.pausedRemainingSeconds);
        setMode("timer");
        if (classified === "completed_queued") {
          setRecordStatus("queued");
          setLiveMessage("Meditation session queued for sync.");
        }
        return;
      }

      const now = new Date().toISOString();
      const classified = classifyTimerRecovery(stored, now);
      setRecoveryState(classified);
      setSessionId(stored.sessionId);
      setMeditationType(stored.meditationType);
      setTargetSeconds(stored.targetSeconds);
      setNote(stored.note ?? "");
      setStartedAt(stored.startedAt);
      setPauseStartedAt(stored.pauseStartedAt);
      setPauseEndedAt(stored.pauseEndedAt);
      setPausedRemainingSeconds(stored.pausedRemainingSeconds);
      setPhase(
        classified === "expired_pending"
          ? "expired_pending"
          : classified === "paused"
            ? "paused"
            : "active",
      );
      setRecordStatus("local_draft");
      setRestoredBanner(true);
      setLiveMessage("Resuming meditation timer.");
      setMode("timer");
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, localDate]);

  useEffect(
    () => () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    },
    [],
  );

  function startTimer() {
    setError(null);
    const now = new Date().toISOString();
    const nextSessionId = crypto.randomUUID();
    const draft = buildDraft({
      sessionId: nextSessionId,
      userId,
      localDate,
      timezone,
      meditationType,
      targetSeconds,
      note: note.trim() || null,
      startedAt: now,
      phase: "active",
      pauseStartedAt: [],
      pauseEndedAt: [],
      pausedRemainingSeconds: null,
      accumulatedElapsedSeconds: 0,
      now,
    });

    void (async () => {
      const existing = await loadMeditationTimerState(userId);
      const guard = oneActiveTimerGuard(existing, draft, now);
      if (!guard.ok) {
        setError(guard.reason);
        return;
      }
      setSessionId(nextSessionId);
      setStartedAt(now);
      setPauseStartedAt([]);
      setPauseEndedAt([]);
      setPausedRemainingSeconds(null);
      setPhase("active");
      setRecoveryState("active");
      setRecordStatus("local_draft");
      setRestoredBanner(false);
      setLiveMessage("Meditation timer started.");
      await saveMeditationTimerState(draft);
    })();
  }

  function pauseTimer() {
    if (!startedAt || phase !== "active") return;
    const now = new Date().toISOString();
    const intervals = pauseIntervalsForDraft({
      pauseStartedAt,
      pauseEndedAt,
    } as MeditationTimerDraft);
    const remaining = remainingSeconds({
      targetSeconds,
      startedAt,
      pauseIntervals: intervals,
      now,
      paused: false,
      pausedRemaining: null,
    });
    const nextPauseStart = [...pauseStartedAt, now];
    setPauseStartedAt(nextPauseStart);
    setPausedRemainingSeconds(remaining);
    setPhase("paused");
    setRecoveryState("paused");
    setLiveMessage("Meditation paused.");
    persistDraft({
      phase: "paused",
      pauseStartedAt: nextPauseStart,
      pausedRemainingSeconds: remaining,
    });
  }

  function resumeTimer() {
    if (!startedAt || phase !== "paused") return;
    const now = new Date().toISOString();
    const nextPauseEnd = [...pauseEndedAt, now];
    setPauseEndedAt(nextPauseEnd);
    setPausedRemainingSeconds(null);
    setPhase("active");
    setRecoveryState("active");
    setLiveMessage("Meditation resumed.");
    persistDraft({
      phase: "active",
      pauseEndedAt: nextPauseEnd,
      pausedRemainingSeconds: null,
    });
  }

  function cancelTimer() {
    if (!window.confirm("Discard in-progress meditation timer?")) return;
    void clearMeditationTimerState(userId);
    setStartedAt(null);
    setPhase("idle");
    setRecoveryState("none");
    setRecordStatus(null);
    setPauseStartedAt([]);
    setPauseEndedAt([]);
    setPausedRemainingSeconds(null);
    setRestoredBanner(false);
    setLiveMessage("Meditation timer discarded.");
  }

  function saveSession(
    durationSeconds: number,
    started: string,
    completedPhase: "online" | "queued",
  ) {
    setError(null);
    const completedAt = new Date().toISOString();
    startTransition(async () => {
      if (!online) {
        await markMeditationTimerCompletedQueued(userId, sessionId);
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.meditationSession,
          entityId: sessionId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.meditationSession,
            writes: buildMeditationSessionWrites({
              sessionId,
              userId,
              localDate,
              dailyRecordId,
              startedAt: started,
              completedAt,
              durationSeconds,
              meditationType,
            }),
          },
          meditationDraft: {
            sessionId,
            payload: { durationSeconds, note: note.trim() || null },
          },
        });
        setPhase("completed_queued");
        setRecoveryState("completed_queued");
        setRecordStatus("queued");
        setLiveMessage("Meditation session queued for sync.");
        const total = (meditationDaySummary?.totalDurationSeconds ?? 0) + durationSeconds;
        const count = (meditationDaySummary?.sessionCount ?? 0) + 1;
        onSaved(meditationStatusLabel(total, count));
        return;
      }

      const result = await saveMeditationSessionAction({
        localDate,
        dailyRecordId,
        startedAt: started,
        completedAt,
        durationSeconds,
        meditationType,
        completed: true,
      });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      await clearMeditationTimerState(userId);
      setPhase("idle");
      setRecoveryState("none");
      setRecordStatus("synced");
      setStartedAt(null);
      if (completedPhase === "online") {
        setLiveMessage("Meditation session saved.");
      }
      const total = (meditationDaySummary?.totalDurationSeconds ?? 0) + durationSeconds;
      const count = (meditationDaySummary?.sessionCount ?? 0) + 1;
      onSaved(meditationStatusLabel(total, count));
    });
  }

  function finishTimer() {
    if (!startedAt) return;
    const duration = meditationDurationSeconds({
      startedAt,
      completedAt: new Date().toISOString(),
      pauseIntervals: pauseIntervalsForDraft({
        pauseStartedAt,
        pauseEndedAt,
      } as MeditationTimerDraft),
    });
    saveSession(duration, startedAt, online ? "online" : "queued");
  }

  function confirmExpiredComplete() {
    if (!startedAt) return;
    const duration =
      targetSeconds ??
      meditationDurationSeconds({
        startedAt,
        completedAt: new Date().toISOString(),
        pauseIntervals: pauseIntervalsForDraft({
          pauseStartedAt,
          pauseEndedAt,
        } as MeditationTimerDraft),
      });
    saveSession(duration, startedAt, online ? "online" : "queued");
  }

  function adjustExpiredDuration() {
    setPhase("paused");
    setRecoveryState("paused");
    setLiveMessage("Adjust target duration, then resume.");
  }

  function discardExpired() {
    cancelTimer();
  }

  function saveManual() {
    const mins = Number(manualMinutes);
    if (!Number.isFinite(mins) || mins <= 0) {
      setError("Enter valid minutes.");
      return;
    }
    const duration = Math.round(mins * 60);
    const started = new Date(Date.now() - duration * 1000).toISOString();
    saveSession(duration, started, online ? "online" : "queued");
  }

  function retrySync() {
    startTransition(async () => {
      await coordinator.current.flush();
      setLiveMessage("Sync retry requested.");
    });
  }

  const timerLabel =
    targetSeconds !== null && phase !== "idle"
      ? formatMeditationDuration(displaySeconds)
      : formatMeditationDuration(displaySeconds);

  return (
    <FocusPanel
      title="Meditation"
      titleId={titleId}
      accent="purple"
      onClose={onCancel}
      footer={
        <PixelButton tone="primary" loading={pending} onClick={onCancel}>
          Close
        </PixelButton>
      }
    >
      <OfflineRecordStatusBadge status={badgeStatus} />
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {recoveryState === "completed_queued" ? (
        <div className="mb-4 border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)] p-3">
          <p className="text-sm font-bold">Session queued for sync</p>
          <p className="mt-1 text-xs text-[var(--mt-ink-muted)]">
            Timer stays closed until sync completes.
          </p>
          {online ? (
            <PixelButton
              tone="primary"
              className="mt-2"
              loading={pending}
              onClick={retrySync}
            >
              Retry sync
            </PixelButton>
          ) : null}
        </div>
      ) : null}

      {restoredBanner && recoveryState !== "completed_queued" ? (
        <p className="mb-3 text-sm font-bold text-[var(--mt-ink)]">Resume meditation</p>
      ) : null}

      <div className="mb-4 flex gap-2">
        <PixelButton
          tone={mode === "timer" ? "primary" : "neutral"}
          onClick={() => setMode("timer")}
          disabled={recoveryState === "completed_queued"}
        >
          Timer
        </PixelButton>
        <PixelButton
          tone={mode === "manual" ? "primary" : "neutral"}
          onClick={() => setMode("manual")}
          disabled={recoveryState === "completed_queued"}
        >
          Manual entry
        </PixelButton>
      </div>

      {mode === "timer" ? (
        <>
          {phase === "expired_pending" ? (
            <div className="mb-4 border-2 border-[var(--mt-neon-yellow)] p-3">
              <p className="font-bold">Timer finished while you were away</p>
              <p className="mt-1 text-sm">
                Confirm completion, adjust duration, or discard.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PixelButton
                  tone="primary"
                  loading={pending}
                  onClick={confirmExpiredComplete}
                >
                  Confirm completed
                </PixelButton>
                <PixelButton tone="neutral" onClick={adjustExpiredDuration}>
                  Adjust duration
                </PixelButton>
                <PixelButton tone="neutral" onClick={discardExpired}>
                  Discard
                </PixelButton>
              </div>
            </div>
          ) : null}

          <p
            className="text-3xl font-extrabold tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {timerLabel}
          </p>

          <label className="mt-3 block text-sm font-bold" htmlFor="med-type">
            Type
          </label>
          <select
            id="med-type"
            className="mt-1 border-2 border-[var(--mt-ink)] px-2 py-1"
            value={meditationType}
            disabled={running || recoveryState === "completed_queued"}
            onChange={(e) => {
              setMeditationType(e.target.value as MeditationType);
              if (running)
                persistDraft({ phase: phase === "paused" ? "paused" : "active" });
            }}
          >
            <option value="mindfulness">Mindfulness</option>
            <option value="breathing">Breathing</option>
            <option value="body_scan">Body scan</option>
            <option value="guided">Guided</option>
            <option value="custom">Custom</option>
          </select>

          <label className="mt-3 block text-sm font-bold" htmlFor="med-note">
            Note (optional)
          </label>
          <textarea
            id="med-note"
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-1"
            rows={2}
            value={note}
            disabled={recoveryState === "completed_queued"}
            onChange={(e) => {
              setNote(e.target.value);
              if (running)
                persistDraft({ phase: phase === "paused" ? "paused" : "active" });
            }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {MEDITATION_PRESETS_SECONDS.map((s) => (
              <PixelButton
                key={s}
                tone={targetSeconds === s ? "primary" : "neutral"}
                disabled={running && phase !== "paused"}
                onClick={() => {
                  setTargetSeconds(s);
                  if (running)
                    persistDraft({ phase: phase === "paused" ? "paused" : "active" });
                }}
              >
                {s / 60} min
              </PixelButton>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {phase === "idle" ? (
              <PixelButton tone="primary" onClick={startTimer}>
                Start
              </PixelButton>
            ) : phase === "paused" ? (
              <>
                <PixelButton tone="primary" onClick={resumeTimer}>
                  Resume
                </PixelButton>
                <PixelButton tone="neutral" onClick={cancelTimer}>
                  Cancel
                </PixelButton>
              </>
            ) : recoveryState === "completed_queued" ? null : (
              <>
                <PixelButton tone="neutral" onClick={pauseTimer}>
                  Pause
                </PixelButton>
                <PixelButton tone="primary" onClick={finishTimer} loading={pending}>
                  Complete
                </PixelButton>
              </>
            )}
          </div>

          {targetSeconds ? (
            <p className="mt-2 text-xs text-[var(--mt-ink-muted)]">
              Target {formatMeditationDuration(targetSeconds)}
              {targetSeconds !== null && phase === "active" ? " remaining" : ""} —
              optional guide only.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <label className="block text-sm font-bold" htmlFor="med-manual">
            Duration (minutes)
          </label>
          <input
            id="med-manual"
            className="mt-1 w-32 border-2 border-[var(--mt-ink)] px-2 py-2"
            inputMode="decimal"
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value)}
          />
          <PixelButton tone="primary" onClick={saveManual} loading={pending}>
            Save session
          </PixelButton>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
    </FocusPanel>
  );
}
