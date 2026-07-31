"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  CONFIDENCE_SCALE,
  INSTABILITY_LABELS,
  OBSERVATION_SCALE_HINTS,
  PAIN_SCALE,
  REHAB_OBSERVATION_TYPES,
  SWELLING_LABELS,
  type RehabInstabilityLevel,
  type RehabObservationType,
  type RehabSessionView,
  type RehabSwellingLevel,
} from "@/modules/rehab/types";
import { SAFETY_BANNER, STOP_GUIDANCE } from "@/modules/rehab/safety";
import {
  acknowledgeAlertAction,
  cancelScheduledRehabSessionAction,
  completeSetAction,
  discardSessionAction,
  finishSessionAction,
  getActiveSessionAction,
  getSessionStartOptionsAction,
  moveScheduledRehabSessionAction,
  previousPerformanceAction,
  recordObservationAction,
  repeatLastRehabSessionAction,
  skipScheduledRehabSessionAction,
  skipSetAction,
  startBlankRehabSessionAction,
  startFromPlanDayAction,
  startScheduledRehabSessionAction,
  stopSetAction,
} from "@/modules/rehab/sessions/actions";
import type { RehabDaySummary } from "@/modules/rehab/sessions/load-rehab-day";
import { listPlansAction } from "@/modules/rehab/plans/actions";
import type {
  RehabPlanSummaryView,
  RehabPreviousPerformanceView,
} from "@/modules/rehab/types";
import { useOnlineStore } from "@/shared/offline/online-store";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import {
  queueAlert,
  queueSessionDiscard,
  queueSessionFinish,
  queueSetCompletion,
  queueSetSkip,
  queueSetStop,
  queueObservation,
} from "@/shared/offline/rehab-outbox";
import { cn } from "@/shared/utils/cn";

export type RehabFocusProps = {
  titleId: string;
  userId: string;
  dailyRecordId: string;
  localDate: string;
  timezone: string;
  rehabDaySummary?: RehabDaySummary | null;
  onCancel: () => void;
  onSaved: (summaryText: string) => void;
};

type SetDraft = {
  reps: string;
  durationSeconds: string;
  holdSeconds: string;
  romAchieved: string;
  painBefore: string;
  painDuring: string;
  painAfter: string;
  swelling: RehabSwellingLevel | "";
  instability: RehabInstabilityLevel | "";
  confidence: string;
  assistanceType: string;
  assistanceAmount: string;
  notes: string;
};

const EMPTY_DRAFT: SetDraft = {
  reps: "",
  durationSeconds: "",
  holdSeconds: "",
  romAchieved: "",
  painBefore: "",
  painDuring: "",
  painAfter: "",
  swelling: "",
  instability: "",
  confidence: "",
  assistanceType: "",
  assistanceAmount: "",
  notes: "",
};

function countSessionSets(session: RehabSessionView) {
  const sets = session.exercises.flatMap((e) => e.sets);
  return {
    total: sets.length,
    completed: sets.filter((s) => s.status === "completed").length,
  };
}

function findCurrentExerciseIndex(session: RehabSessionView): number {
  const pendingIndex = session.exercises.findIndex((exercise) =>
    exercise.sets.some((set) => set.status === "pending"),
  );
  if (pendingIndex >= 0) return pendingIndex;
  return Math.max(0, session.exercises.length - 1);
}

function sessionFinishSummary(session: RehabSessionView): string {
  const { completed, total } = countSessionSets(session);
  const obs = session.observations.length;
  const obsPart = obs ? ` · ${obs} observation${obs === 1 ? "" : "s"}` : "";
  return `${session.title} · ${completed}/${total} sets completed${obsPart}`;
}

function formatElapsed(startedAt: string, nowMs: number): string {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor((nowMs - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function RehabFocus({
  titleId,
  userId,
  localDate,
  timezone,
  rehabDaySummary,
  onCancel,
  onSaved,
}: RehabFocusProps) {
  const [session, setSession] = useState<RehabSessionView | null>(null);
  const [plans, setPlans] = useState<RehabPlanSummaryView[]>([]);
  const [startOptions, setStartOptions] = useState<Awaited<
    ReturnType<typeof getSessionStartOptionsAction>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({});
  const [history, setHistory] = useState<RehabPreviousPerformanceView[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmSkipScheduled, setConfirmSkipScheduled] = useState(false);
  const [confirmCancelScheduled, setConfirmCancelScheduled] = useState(false);
  const [moveScheduleDate, setMoveScheduleDate] = useState(localDate);
  const [observationType, setObservationType] = useState<RehabObservationType>("general");
  const [observationNumeric, setObservationNumeric] = useState("");
  const [observationText, setObservationText] = useState("");
  const [sessionNow, setSessionNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";

  const currentExercise = session?.exercises[exerciseIndex] ?? null;
  const currentSet =
    currentExercise?.sets.find((s) => s.status === "pending") ??
    currentExercise?.sets[currentExercise.sets.length - 1] ??
    null;
  const currentDraft = currentSet
    ? (setDrafts[currentSet.id] ?? EMPTY_DRAFT)
    : EMPTY_DRAFT;

  const progressionBlocked = Boolean(session?.progressionPaused);
  const alertDialogOpen = Boolean(session?.unacknowledgedAlertCount);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setSessionNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [active, options, planList] = await Promise.all([
          getActiveSessionAction(),
          getSessionStartOptionsAction({ localDate }),
          listPlansAction(),
        ]);
        if (cancelled) return;
        setSession(active);
        setStartOptions(options);
        setPlans(planList);
        if (active) {
          setExerciseIndex(findCurrentExerciseIndex(active));
        }
      } catch {
        if (!cancelled) setError("Could not load rehab session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [localDate]);

  useEffect(() => {
    if (!currentExercise || !currentSet) return;
    let cancelled = false;
    void previousPerformanceAction({
      sourceExerciseId: currentExercise.sourceExerciseId ?? undefined,
      exerciseName: currentExercise.exerciseName,
      setIndex: currentSet.setIndex,
      limit: 2,
    }).then((rows) => {
      if (!cancelled) setHistory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [currentExercise, currentSet]);

  const applySession = (next: RehabSessionView, message: string) => {
    setSession(next);
    setExerciseIndex(findCurrentExerciseIndex(next));
    setStatusMessage(message);
  };

  function updateDraft(field: keyof SetDraft, value: string) {
    if (!currentSet) return;
    setSetDrafts((prev) => ({
      ...prev,
      [currentSet.id]: { ...(prev[currentSet.id] ?? EMPTY_DRAFT), [field]: value },
    }));
  }

  function parseOptionalInt(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function handleStartBlank() {
    startTransition(async () => {
      const result = await startBlankRehabSessionAction({ localDate });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function handleStartScheduled() {
    const scheduledId = startOptions?.scheduled?.id ?? rehabDaySummary?.scheduled?.id;
    if (!scheduledId) return;
    startTransition(async () => {
      const result = await startScheduledRehabSessionAction({
        scheduledRehabSessionId: scheduledId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function handleSkipScheduled() {
    const scheduledId = startOptions?.scheduled?.id ?? rehabDaySummary?.scheduled?.id;
    if (!scheduledId) return;
    startTransition(async () => {
      const result = await skipScheduledRehabSessionAction({
        scheduledRehabSessionId: scheduledId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStartOptions((prev) => (prev ? { ...prev, scheduled: null } : prev));
      setConfirmSkipScheduled(false);
      setStatusMessage(result.message);
      setError(null);
    });
  }

  function handleMoveScheduled() {
    const scheduledId = startOptions?.scheduled?.id ?? rehabDaySummary?.scheduled?.id;
    if (!scheduledId || !moveScheduleDate.trim()) return;
    startTransition(async () => {
      const result = await moveScheduledRehabSessionAction({
        scheduledRehabSessionId: scheduledId,
        localDate: moveScheduleDate,
        timezone,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStartOptions((prev) =>
        prev?.scheduled
          ? {
              ...prev,
              scheduled: { ...prev.scheduled, localDate: moveScheduleDate },
            }
          : prev,
      );
      setStatusMessage(result.message);
      setError(null);
    });
  }

  function handleCancelScheduled() {
    const scheduledId = startOptions?.scheduled?.id ?? rehabDaySummary?.scheduled?.id;
    if (!scheduledId) return;
    startTransition(async () => {
      const result = await cancelScheduledRehabSessionAction({
        scheduledRehabSessionId: scheduledId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStartOptions((prev) => (prev ? { ...prev, scheduled: null } : prev));
      setConfirmCancelScheduled(false);
      setStatusMessage(result.message);
      setError(null);
    });
  }

  function handleRecordObservation() {
    if (!session) return;
    const numeric = observationNumeric.trim()
      ? Number.parseFloat(observationNumeric)
      : undefined;
    const text = observationText.trim() || undefined;
    if (numeric === undefined && !text) return;

    startTransition(async () => {
      const payload = {
        sessionId: session.id,
        version: session.version,
        observationType,
        valueNumeric: numeric,
        valueText: text,
      };

      if (!online) {
        await queueObservation({
          userId,
          observation: {
            sessionId: session.id,
            observationType,
            valueNumeric: numeric ?? null,
            valueText: text ?? null,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        applySession(
          {
            ...session,
            version: session.version + 1,
            observations: [
              ...session.observations,
              {
                id: crypto.randomUUID(),
                observationType,
                valueNumeric: numeric ?? null,
                valueText: text ?? null,
                side: "not_applicable",
                bodyArea: null,
                recordedAt: new Date().toISOString(),
              },
            ],
          },
          "Observation queued offline",
        );
        setObservationNumeric("");
        setObservationText("");
        return;
      }

      const result = await recordObservationAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
      setObservationNumeric("");
      setObservationText("");
    });
  }

  function handleRepeatLast() {
    startTransition(async () => {
      const result = await repeatLastRehabSessionAction({ localDate });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function handleStartPlanDay(planDayId: string) {
    startTransition(async () => {
      const result = await startFromPlanDayAction({ planDayId, localDate });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function handleCompleteSet() {
    if (!session || !currentSet || progressionBlocked) return;
    startTransition(async () => {
      const payload = {
        setId: currentSet.id,
        version: session.version,
        reps: parseOptionalInt(currentDraft.reps),
        durationSeconds: parseOptionalInt(currentDraft.durationSeconds),
        holdSeconds: parseOptionalInt(currentDraft.holdSeconds),
        romAchieved: parseOptionalInt(currentDraft.romAchieved),
        painBefore: parseOptionalInt(currentDraft.painBefore),
        painDuring: parseOptionalInt(currentDraft.painDuring),
        painAfter: parseOptionalInt(currentDraft.painAfter),
        swelling: currentDraft.swelling || undefined,
        instability: currentDraft.instability || undefined,
        confidence: parseOptionalInt(currentDraft.confidence),
        assistanceType: currentDraft.assistanceType || undefined,
        assistanceAmount: currentDraft.assistanceAmount || undefined,
        notes: currentDraft.notes || undefined,
      };

      if (!online) {
        await queueSetCompletion({
          userId,
          sessionId: session.id,
          completion: {
            sessionExerciseId: currentExercise!.id,
            side: currentSet.side,
            reps: parseOptionalInt(currentDraft.reps),
            durationSeconds: parseOptionalInt(currentDraft.durationSeconds),
            holdSeconds: parseOptionalInt(currentDraft.holdSeconds),
            romAchieved: parseOptionalInt(currentDraft.romAchieved),
            painBefore: parseOptionalInt(currentDraft.painBefore),
            painDuring: parseOptionalInt(currentDraft.painDuring),
            painAfter: parseOptionalInt(currentDraft.painAfter),
            swelling: currentDraft.swelling || undefined,
            instability: currentDraft.instability || undefined,
            confidence: parseOptionalInt(currentDraft.confidence),
            assistanceType: currentDraft.assistanceType || undefined,
            assistanceAmount: currentDraft.assistanceAmount || undefined,
            notes: currentDraft.notes || undefined,
            setId: currentSet.id,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        const optimistic: RehabSessionView = {
          ...session,
          version: session.version + 1,
          exercises: session.exercises.map((exercise) =>
            exercise.id === currentExercise!.id
              ? {
                  ...exercise,
                  sets: exercise.sets.map((set) =>
                    set.id === currentSet.id ? { ...set, status: "completed" } : set,
                  ),
                }
              : exercise,
          ),
        };
        applySession(optimistic, "Set queued offline");
        return;
      }

      const result = await completeSetAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function handleSkipSet() {
    if (!session || !currentSet || progressionBlocked) return;
    startTransition(async () => {
      if (!online) {
        await queueSetSkip({
          userId,
          sessionId: session.id,
          setId: currentSet.id,
          sessionExerciseId: currentExercise!.id,
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        applySession(
          {
            ...session,
            version: session.version + 1,
            exercises: session.exercises.map((exercise) =>
              exercise.id === currentExercise!.id
                ? {
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                      set.id === currentSet.id ? { ...set, status: "skipped" } : set,
                    ),
                  }
                : exercise,
            ),
          },
          "Skip queued offline",
        );
        return;
      }
      const result = await skipSetAction({
        setId: currentSet.id,
        version: session.version,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function handleStopSet() {
    if (!session || !currentSet) return;
    startTransition(async () => {
      const payload = {
        setId: currentSet.id,
        version: session.version,
        painBefore: parseOptionalInt(currentDraft.painBefore),
        painDuring: parseOptionalInt(currentDraft.painDuring),
        painAfter: parseOptionalInt(currentDraft.painAfter),
        swelling: currentDraft.swelling || undefined,
        instability: currentDraft.instability || undefined,
        confidence: parseOptionalInt(currentDraft.confidence),
        notes: currentDraft.notes || undefined,
        stopConditionTriggered: true,
      };

      if (!online) {
        await queueSetStop({
          userId,
          sessionId: session.id,
          stop: {
            setId: currentSet.id,
            sessionExerciseId: currentExercise!.id,
            side: currentSet.side,
            painBefore: parseOptionalInt(currentDraft.painBefore),
            painDuring: parseOptionalInt(currentDraft.painDuring),
            painAfter: parseOptionalInt(currentDraft.painAfter),
            swelling: currentDraft.swelling || undefined,
            instability: currentDraft.instability || undefined,
            confidence: parseOptionalInt(currentDraft.confidence),
            notes: currentDraft.notes || undefined,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        applySession(
          {
            ...session,
            version: session.version + 1,
            exercises: session.exercises.map((exercise) =>
              exercise.id === currentExercise!.id
                ? {
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                      set.id === currentSet.id ? { ...set, status: "stopped" } : set,
                    ),
                  }
                : exercise,
            ),
          },
          "Stop queued offline",
        );
        return;
      }

      const result = await stopSetAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function handleAcknowledgeAlert() {
    if (!session) return;
    const alert = session.alerts.find((a) => !a.acknowledgedAt);
    if (!alert) return;
    startTransition(async () => {
      if (!online) {
        await queueAlert({
          userId,
          alert: {
            alertId: alert.id,
            sessionId: session.id,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        applySession(
          {
            ...session,
            version: session.version + 1,
            alerts: session.alerts.map((item) =>
              item.id === alert.id
                ? { ...item, acknowledgedAt: new Date().toISOString() }
                : item,
            ),
            unacknowledgedAlertCount: Math.max(0, session.unacknowledgedAlertCount - 1),
            progressionPaused: session.unacknowledgedAlertCount > 1,
          },
          "Alert acknowledgment queued offline",
        );
        return;
      }
      const result = await acknowledgeAlertAction({
        alertId: alert.id,
        sessionId: session.id,
        version: session.version,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, "Alert acknowledged");
    });
  }

  function handleFinish() {
    if (!session) return;
    startTransition(async () => {
      if (!online) {
        await queueSessionFinish({
          userId,
          sessionId: session.id,
          startedAt: session.startedAt,
          expectedSessionVersion: session.version,
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        onSaved(sessionFinishSummary(session));
        return;
      }
      const result = await finishSessionAction({
        sessionId: session.id,
        version: session.version,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(sessionFinishSummary(result.session));
    });
  }

  function handleDiscard() {
    if (!session) return;
    startTransition(async () => {
      if (!online) {
        await queueSessionDiscard({
          userId,
          sessionId: session.id,
          expectedSessionVersion: session.version,
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setSession(null);
        onCancel();
        return;
      }
      const result = await discardSessionAction({
        sessionId: session.id,
        version: session.version,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSession(null);
      onCancel();
    });
  }

  const planDayOptions = useMemo(
    () =>
      plans.flatMap((plan) =>
        plan.phases.flatMap((phase) =>
          phase.days.map((day) => ({
            planId: plan.id,
            planName: plan.name,
            phaseName: phase.name,
            dayId: day.id,
            dayName: day.name,
          })),
        ),
      ),
    [plans],
  );

  if (loading) {
    return (
      <FocusPanel title="Rehab" titleId={titleId} onClose={onCancel}>
        <p className="text-sm text-[var(--mt-ink-muted)]">Loading rehab session…</p>
      </FocusPanel>
    );
  }

  if (!session) {
    return (
      <FocusPanel title="Rehab" titleId={titleId} onClose={onCancel}>
        <p className="rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] px-3 py-2 text-sm text-[var(--mt-ink)]">
          {SAFETY_BANNER}
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-[var(--mt-neon-pink)]">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <PixelButton tone="primary" onClick={handleStartBlank} disabled={pending}>
            Start blank session
          </PixelButton>
          {(startOptions?.scheduled || rehabDaySummary?.scheduled) && (
            <section className="mt-4 rounded border bg-[var(--mt-paper)] p-3">
              <h3 className="text-sm font-semibold">Scheduled rehab</h3>
              <p className="mt-1 text-sm">
                {startOptions?.scheduled?.title ?? rehabDaySummary?.scheduled?.title}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <PixelButton
                  tone="neutral"
                  onClick={handleStartScheduled}
                  disabled={pending}
                >
                  Start scheduled rehab
                </PixelButton>
                <label className="text-sm">
                  Move to date
                  <input
                    type="date"
                    className="mt-1 min-h-11 w-full rounded border px-2"
                    value={moveScheduleDate}
                    onChange={(e) => setMoveScheduleDate(e.target.value)}
                  />
                </label>
                <PixelButton
                  tone="neutral"
                  onClick={handleMoveScheduled}
                  disabled={pending}
                >
                  Move scheduled rehab
                </PixelButton>
                <PixelButton
                  tone="neutral"
                  onClick={() => setConfirmSkipScheduled(true)}
                  disabled={pending}
                >
                  Skip scheduled rehab
                </PixelButton>
                <PixelButton
                  tone="neutral"
                  onClick={() => setConfirmCancelScheduled(true)}
                  disabled={pending}
                >
                  Cancel scheduled rehab
                </PixelButton>
              </div>
            </section>
          )}
          {startOptions?.lastCompleted ? (
            <PixelButton tone="cyan" onClick={handleRepeatLast} disabled={pending}>
              Repeat last rehab
            </PixelButton>
          ) : null}
          {planDayOptions.slice(0, 6).map((option) => (
            <PixelButton
              key={option.dayId}
              tone="neutral"
              onClick={() => handleStartPlanDay(option.dayId)}
              disabled={pending}
            >
              {option.planName} · {option.dayName}
            </PixelButton>
          ))}
        </div>
        <div className="mt-4">
          <PixelButton tone="neutral" onClick={onCancel}>
            Close
          </PixelButton>
        </div>
        {confirmSkipScheduled ? (
          <div className="mt-4 rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] p-3">
            <p className="text-sm">Skip today&apos;s scheduled rehab?</p>
            <div className="mt-2 flex gap-2">
              <PixelButton
                tone="neutral"
                onClick={handleSkipScheduled}
                disabled={pending}
              >
                Confirm skip
              </PixelButton>
              <PixelButton tone="neutral" onClick={() => setConfirmSkipScheduled(false)}>
                Cancel
              </PixelButton>
            </div>
          </div>
        ) : null}
        {confirmCancelScheduled ? (
          <div className="mt-4 rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] p-3">
            <p className="text-sm">Cancel this scheduled rehab entry?</p>
            <div className="mt-2 flex gap-2">
              <PixelButton
                tone="neutral"
                onClick={handleCancelScheduled}
                disabled={pending}
              >
                Confirm cancel
              </PixelButton>
              <PixelButton
                tone="neutral"
                onClick={() => setConfirmCancelScheduled(false)}
              >
                Keep scheduled
              </PixelButton>
            </div>
          </div>
        ) : null}
      </FocusPanel>
    );
  }

  return (
    <FocusPanel title={session.title} titleId={titleId} onClose={onCancel}>
      <p className="rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] px-3 py-2 text-sm text-[var(--mt-ink)]">
        {SAFETY_BANNER}
      </p>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--mt-ink-muted)]">
        <span>Elapsed {formatElapsed(session.startedAt, sessionNow)}</span>
        {session.clinicianSourceSnapshot?.clinicianName ? (
          <span>Source: {session.clinicianSourceSnapshot.clinicianName}</span>
        ) : null}
      </div>

      {session.restrictions.length > 0 ? (
        <section className="mt-4 space-y-2" aria-label="Active restrictions">
          <h3 className="text-sm font-semibold text-[var(--mt-ink)]">
            Active restrictions
          </h3>
          <ul className="space-y-2">
            {session.restrictions.map((restriction) => (
              <li
                key={restriction.id}
                className="rounded border border-[var(--mt-ink-muted)]/25 bg-[var(--mt-paper-warm)] px-3 py-2 text-sm"
              >
                <strong>{restriction.restrictionType.replace(/_/g, " ")}</strong>
                <p>{restriction.valueText}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {currentExercise ? (
        <section className="mt-4 space-y-3">
          <h3 className="text-base font-semibold text-[var(--mt-ink)]">
            {currentExercise.exerciseName}
            <span className="ml-2 text-sm font-normal text-[var(--mt-ink-muted)]">
              ({currentExercise.side.replace(/_/g, " ")})
            </span>
          </h3>
          {currentExercise.instructionsSnapshot ? (
            <p className="text-sm text-[var(--mt-ink)]">
              {currentExercise.instructionsSnapshot}
            </p>
          ) : null}
          {currentExercise.stopConditionsSnapshot ? (
            <p className="text-sm text-[var(--mt-ink-muted)]">
              Stop if: {currentExercise.stopConditionsSnapshot}
            </p>
          ) : null}

          {history.length > 0 ? (
            <div className="rounded border border-[var(--mt-ink-muted)]/20 bg-[var(--mt-paper)] p-3 text-sm">
              <p className="font-medium">Previous performance</p>
              <p className="text-[var(--mt-ink-muted)]">
                Pain {history[0]?.painAfter ?? "—"} · Confidence{" "}
                {history[0]?.confidence ?? "—"}
              </p>
            </div>
          ) : null}

          {currentSet ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Pain before ({PAIN_SCALE.min}–{PAIN_SCALE.max}, {PAIN_SCALE.labels[0]}–
                {PAIN_SCALE.labels[10]})
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.painBefore}
                  onChange={(e) => updateDraft("painBefore", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Pain during
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.painDuring}
                  onChange={(e) => updateDraft("painDuring", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Pain after
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.painAfter}
                  onChange={(e) => updateDraft("painAfter", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Confidence ({CONFIDENCE_SCALE.labels[0]}–{CONFIDENCE_SCALE.labels[10]})
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.confidence}
                  onChange={(e) => updateDraft("confidence", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Swelling
                <select
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.swelling}
                  onChange={(e) =>
                    updateDraft("swelling", e.target.value as RehabSwellingLevel | "")
                  }
                >
                  <option value="">—</option>
                  {Object.entries(SWELLING_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Instability
                <select
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.instability}
                  onChange={(e) =>
                    updateDraft(
                      "instability",
                      e.target.value as RehabInstabilityLevel | "",
                    )
                  }
                >
                  <option value="">—</option>
                  {Object.entries(INSTABILITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                ROM achieved (°)
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.romAchieved}
                  onChange={(e) => updateDraft("romAchieved", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Assistance
                <input
                  className="mt-1 w-full rounded border px-2 py-2"
                  value={currentDraft.assistanceAmount}
                  onChange={(e) => updateDraft("assistanceAmount", e.target.value)}
                />
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <PixelButton
              tone="primary"
              onClick={handleCompleteSet}
              disabled={pending || progressionBlocked || !currentSet}
            >
              Complete set
            </PixelButton>
            <PixelButton
              tone="neutral"
              onClick={handleSkipSet}
              disabled={pending || progressionBlocked}
            >
              Skip set
            </PixelButton>
            <PixelButton tone="neutral" onClick={handleStopSet} disabled={pending}>
              Stop set
            </PixelButton>
          </div>
        </section>
      ) : null}

      <section className="mt-4 rounded border bg-[var(--mt-paper)] p-4">
        <h3 className="text-sm font-semibold text-[var(--mt-ink)]">
          Session observations
        </h3>
        <p className="mt-1 text-xs text-[var(--mt-ink-muted)]">
          Symptom notes for your records — not a diagnosis.
        </p>
        {session.observations.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {session.observations.map((obs) => (
              <li
                key={obs.id}
                className="rounded border border-[var(--mt-ink-muted)]/25 p-2"
              >
                <strong>{obs.observationType.replace(/_/g, " ")}</strong>
                {obs.valueNumeric != null ? ` · ${obs.valueNumeric}` : ""}
                {obs.valueText ? ` · ${obs.valueText}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--mt-ink-muted)]">No observations yet.</p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Type
            <select
              className="mt-1 w-full rounded border px-2 py-2"
              value={observationType}
              onChange={(e) => setObservationType(e.target.value as RehabObservationType)}
            >
              {REHAB_OBSERVATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          {OBSERVATION_SCALE_HINTS[observationType].numeric ? (
            <label className="text-sm">
              Numeric value
              <span className="block text-xs text-[var(--mt-ink-muted)]">
                {OBSERVATION_SCALE_HINTS[observationType].numeric}
              </span>
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-2"
                value={observationNumeric}
                onChange={(e) => setObservationNumeric(e.target.value)}
              />
            </label>
          ) : null}
          <label className="text-sm sm:col-span-2">
            Notes
            {OBSERVATION_SCALE_HINTS[observationType].text ? (
              <span className="block text-xs text-[var(--mt-ink-muted)]">
                {OBSERVATION_SCALE_HINTS[observationType].text}
              </span>
            ) : null}
            <textarea
              className="mt-1 min-h-16 w-full rounded border px-2 py-2"
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
            />
          </label>
        </div>
        <PixelButton
          tone="neutral"
          className="mt-3"
          onClick={handleRecordObservation}
          disabled={pending}
        >
          Add observation
        </PixelButton>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <PixelButton
          tone="primary"
          onClick={() => setConfirmFinish(true)}
          disabled={pending}
        >
          Finish session
        </PixelButton>
        <PixelButton
          tone="neutral"
          onClick={() => setConfirmDiscard(true)}
          disabled={pending}
        >
          Discard
        </PixelButton>
        <PixelButton tone="neutral" onClick={onCancel}>
          Close
        </PixelButton>
      </div>

      {statusMessage ? (
        <p className="mt-3 text-sm text-[var(--mt-ink-muted)]" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--mt-neon-pink)]">
          {error}
        </p>
      ) : null}

      {alertDialogOpen && session.alerts.some((a) => !a.acknowledgedAt) ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="rehab-alert-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="max-w-md rounded border-2 border-[var(--mt-ink)] bg-[var(--mt-paper)] p-4 shadow-lg">
            <h4
              id="rehab-alert-title"
              className="text-base font-semibold text-[var(--mt-ink)]"
            >
              Symptom alert recorded
            </h4>
            <p className="mt-2 text-sm text-[var(--mt-ink)]">
              {session.alerts.find((a) => !a.acknowledgedAt)?.messageSnapshot}
            </p>
            <p className="mt-2 text-sm text-[var(--mt-ink-muted)]">{STOP_GUIDANCE}</p>
            <p className="mt-2 text-sm text-[var(--mt-ink-muted)]">
              Continuing is your choice — this app does not say it is safe.
            </p>
            <div className="mt-4 flex gap-2">
              <PixelButton
                tone="primary"
                onClick={handleAcknowledgeAlert}
                disabled={pending}
              >
                Acknowledge and continue
              </PixelButton>
            </div>
          </div>
        </div>
      ) : null}

      {confirmFinish ? (
        <div className="mt-4 rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] p-3">
          <p className="text-sm">Finish this rehab session?</p>
          <div className="mt-2 flex gap-2">
            <PixelButton tone="primary" onClick={handleFinish} disabled={pending}>
              Confirm finish
            </PixelButton>
            <PixelButton tone="neutral" onClick={() => setConfirmFinish(false)}>
              Cancel
            </PixelButton>
          </div>
        </div>
      ) : null}

      {confirmDiscard ? (
        <div className="mt-4 rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] p-3">
          <p className="text-sm">
            Discard this rehab session? Recorded sets will be lost.
          </p>
          <div className="mt-2 flex gap-2">
            <PixelButton tone="neutral" onClick={handleDiscard} disabled={pending}>
              Confirm discard
            </PixelButton>
            <PixelButton tone="neutral" onClick={() => setConfirmDiscard(false)}>
              Cancel
            </PixelButton>
          </div>
        </div>
      ) : null}

      {confirmSkipScheduled ? (
        <div className="mt-4 rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] p-3">
          <p className="text-sm">Skip today&apos;s scheduled rehab?</p>
          <div className="mt-2 flex gap-2">
            <PixelButton tone="neutral" onClick={handleSkipScheduled} disabled={pending}>
              Confirm skip
            </PixelButton>
            <PixelButton tone="neutral" onClick={() => setConfirmSkipScheduled(false)}>
              Cancel
            </PixelButton>
          </div>
        </div>
      ) : null}

      {confirmCancelScheduled ? (
        <div className="mt-4 rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] p-3">
          <p className="text-sm">Cancel this scheduled rehab entry?</p>
          <div className="mt-2 flex gap-2">
            <PixelButton
              tone="neutral"
              onClick={handleCancelScheduled}
              disabled={pending}
            >
              Confirm cancel
            </PixelButton>
            <PixelButton tone="neutral" onClick={() => setConfirmCancelScheduled(false)}>
              Keep scheduled
            </PixelButton>
          </div>
        </div>
      ) : null}

      {!online ? (
        <p className={cn("mt-3 text-sm text-[var(--mt-ink-muted)]")}>
          Offline — changes queued
        </p>
      ) : null}
    </FocusPanel>
  );
}
