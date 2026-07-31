"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  normalizeLoadToKg,
  sessionDurationSeconds,
  totalSessionVolume,
  type PerformedSetLike,
} from "@/modules/workout/calculations";
import {
  addExerciseToSessionAction,
  addSetAction,
  cancelSessionAction,
  completeSetAction,
  confirmPersonalRecordAction,
  copyYesterdaySessionAction,
  dismissPersonalRecordAction,
  finishSessionAction,
  getActiveSessionAction,
  getExerciseHistoryAction,
  getSessionStartOptionsAction,
  installArnoldStarterPlanAction,
  listExercisesAction,
  listPendingPersonalRecordsAction,
  listPlansAction,
  repeatLastSessionAction,
  skipSetAction,
  startBlankSessionAction,
  startFromPlanDayAction,
  startScheduledSessionAction,
} from "@/modules/workout/sessions/actions";
import type {
  ExerciseCatalogView,
  PerformedSetHistoryView,
  PerformedSetView,
  PersonalRecordView,
  PlanSummaryView,
  SessionStartOptionsView,
  WorkoutBlockType,
  WorkoutSessionExerciseView,
  WorkoutSessionView,
  WorkoutSetRole,
} from "@/modules/workout/sessions/types";
import type { WorkoutDaySummary } from "@/modules/workout/sessions/load-workout-day";
import { formatRestTimer } from "@/modules/workout/sessions/rest-timer-utils";
import { useRestTimer } from "@/modules/workout/sessions/use-rest-timer";
import { useOnlineStore } from "@/shared/offline/online-store";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import {
  queueSetCompletion,
  queueSetSkip,
  queueSessionDiscard,
  queueSessionFinish,
} from "@/shared/offline/workout-outbox";
import { cn } from "@/shared/utils/cn";

const SAFETY_NOTE =
  "Stop if you feel sharp pain, instability, dizziness, or unusual symptoms.";

const BLOCK_LABELS: Record<WorkoutBlockType, string> = {
  warmup: "Warm-up",
  straight_sets: "Straight sets",
  superset: "Superset",
  triset: "Tri-set",
  circuit: "Circuit",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For time",
  drop_set: "Drop set",
  stripping_set: "Stripping set",
  one_to_ten: "1–10",
  cardio: "Cardio",
  mobility: "Mobility",
  cooldown: "Cooldown",
  custom: "Custom",
};

const SET_ROLE_LABELS: Record<WorkoutSetRole, string> = {
  warmup: "Warm-up",
  working: "Working",
  top_set: "Top set",
  backoff: "Backoff",
  drop_set: "Drop",
  drop: "Drop",
  amrap: "AMRAP",
  max_effort: "Max effort",
  failure: "Failure",
  timed_hold: "Timed hold",
  technique: "Technique",
};

function formatElapsed(startedAt: string, nowMs: number): string {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor((nowMs - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function countSessionSets(session: WorkoutSessionView) {
  const sets = session.exercises.flatMap((exercise) => exercise.sets);
  return {
    total: sets.length,
    completed: sets.filter((set) => set.status === "completed").length,
  };
}

function findCurrentExerciseIndex(exercises: WorkoutSessionExerciseView[]): number {
  const pendingIndex = exercises.findIndex((exercise) =>
    exercise.sets.some((set) => set.status === "pending"),
  );
  if (pendingIndex >= 0) return pendingIndex;
  return Math.max(0, exercises.length - 1);
}

function formatPersonalRecord(pr: PersonalRecordView): string {
  const unit = pr.unit ? ` ${pr.unit}` : "";
  return `${pr.exerciseLabel} · ${pr.recordType.replace(/_/g, " ")} · ${pr.value}${unit}`;
}

function sessionVolumeInputs(session: WorkoutSessionView) {
  return session.exercises.map((exercise) => ({
    exerciseId: exercise.id,
    sets: exercise.sets.map((set): PerformedSetLike => ({
      kind: "strength",
      status:
        set.status === "completed"
          ? "completed"
          : set.status === "partial"
            ? "partial"
            : "skipped",
      reps: set.reps,
      load: set.loadKg,
      loadUnit: set.loadUnit === "lb" ? "lb" : "kg",
    })),
  }));
}

function sessionFinishSummary(session: WorkoutSessionView): string {
  const { completed, total } = countSessionSets(session);
  return `${session.title} · ${completed}/${total} sets completed`;
}

export type WorkoutFocusProps = {
  titleId: string;
  userId: string;
  dailyRecordId: string;
  localDate: string;
  timezone: string;
  workoutDaySummary?: WorkoutDaySummary | null;
  onCancel: () => void;
  onSaved: (summaryText: string) => void;
};

type SetDraft = {
  reps: string;
  load: string;
  loadUnit: "kg" | "lb";
};

function defaultDraft(set: PerformedSetView): SetDraft {
  return {
    reps: set.reps != null ? String(set.reps) : "",
    load: set.loadKg != null ? String(set.loadKg) : "",
    loadUnit: set.loadUnit === "lb" ? "lb" : "kg",
  };
}

export function WorkoutFocus({
  titleId,
  userId,
  dailyRecordId,
  localDate,
  timezone,
  workoutDaySummary,
  onCancel,
  onSaved,
}: WorkoutFocusProps) {
  const [session, setSession] = useState<WorkoutSessionView | null>(null);
  const [plans, setPlans] = useState<PlanSummaryView[]>([]);
  const [startOptions, setStartOptions] = useState<SessionStartOptionsView | null>(null);
  const [pendingPRs, setPendingPRs] = useState<PersonalRecordView[]>([]);
  const [catalog, setCatalog] = useState<ExerciseCatalogView[]>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({});
  const [history, setHistory] = useState<PerformedSetHistoryView[]>([]);
  const [conflictSessionId, setConflictSessionId] = useState<string | null>(null);
  const [pendingOffline, setPendingOffline] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [sessionNow, setSessionNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";

  const restTimer = useRestTimer({
    persistKey: session ? `mtfbwu:rest-timer:${session.id}` : null,
    autoStartAfterSet: true,
    defaultRestSeconds: 90,
  });

  const currentExercise = session?.exercises[exerciseIndex] ?? null;

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setSessionNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [active, planList, exercises, options, records] = await Promise.all([
        getActiveSessionAction(),
        listPlansAction(),
        listExercisesAction(),
        getSessionStartOptionsAction({ localDate, timezone }),
        listPendingPersonalRecordsAction(),
      ]);
      if (cancelled) return;
      setSession(active);
      setPlans(planList);
      setCatalog(exercises);
      setStartOptions(options);
      setPendingPRs(records);
      if (active) {
        setExerciseIndex(findCurrentExerciseIndex(active.exercises));
      } else if (options.activeSession) {
        setConflictSessionId(options.activeSession.id);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [dailyRecordId, localDate, timezone]);

  useEffect(() => {
    let cancelled = false;
    const exerciseDefinitionId = currentExercise?.exerciseDefinitionId ?? null;
    if (!exerciseDefinitionId) {
      const id = window.setTimeout(() => {
        if (!cancelled) setHistory([]);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(id);
      };
    }
    void getExerciseHistoryAction({
      exerciseDefinitionId,
      limit: 5,
    }).then((rows) => {
      if (!cancelled) setHistory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [currentExercise?.exerciseDefinitionId, currentExercise?.id]);

  useEffect(() => {
    if (!session) return;
    const id = window.setTimeout(() => {
      setSetDrafts((previous) => {
        const next = { ...previous };
        for (const exercise of session.exercises) {
          for (const set of exercise.sets) {
            if (!next[set.id]) next[set.id] = defaultDraft(set);
          }
        }
        return next;
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [session]);

  const scheduled =
    startOptions?.scheduled ??
    (workoutDaySummary?.scheduled
      ? { id: workoutDaySummary.scheduled.id, title: workoutDaySummary.scheduled.title }
      : null);

  function handleStartResult(
    result: Awaited<
      ReturnType<
        | typeof startBlankSessionAction
        | typeof copyYesterdaySessionAction
        | typeof repeatLastSessionAction
      >
    >,
  ) {
    if (!result.ok) {
      if (result.conflict && result.activeSessionId) {
        setConflictSessionId(result.activeSessionId);
      }
      setError(result.error);
      return;
    }
    setSession(result.session);
    setExerciseIndex(findCurrentExerciseIndex(result.session.exercises));
    setConflictSessionId(null);
    setError(null);
    setStatusMessage(result.message);
  }

  function startBlank() {
    startTransition(async () => {
      handleStartResult(await startBlankSessionAction({ localDate, title: "Workout" }));
    });
  }

  function startPlanDay(planDayId: string) {
    startTransition(async () => {
      handleStartResult(await startFromPlanDayAction({ planDayId, localDate }));
    });
  }

  function startScheduled() {
    if (!scheduled) return;
    startTransition(async () => {
      handleStartResult(
        await startScheduledSessionAction({ scheduledWorkoutId: scheduled.id }),
      );
    });
  }

  function copyYesterday() {
    startTransition(async () => {
      handleStartResult(await copyYesterdaySessionAction({ localDate, timezone }));
    });
  }

  function repeatLast() {
    startTransition(async () => {
      handleStartResult(await repeatLastSessionAction({ localDate }));
    });
  }

  function installArnold() {
    startTransition(async () => {
      const result = await installArnoldStarterPlanAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPlans(await listPlansAction());
      setError(null);
      setStatusMessage(result.message);
    });
  }

  function resumeConflict() {
    startTransition(async () => {
      const active = await getActiveSessionAction();
      if (!active) {
        setConflictSessionId(null);
        setError("No active session found — try starting again.");
        return;
      }
      setSession(active);
      setExerciseIndex(findCurrentExerciseIndex(active.exercises));
      setConflictSessionId(null);
      setError(null);
    });
  }

  const applySession = useCallback((next: WorkoutSessionView, message: string) => {
    setSession(next);
    setExerciseIndex(findCurrentExerciseIndex(next.exercises));
    setStatusMessage(message);
    setError(null);
  }, []);

  function updateSetDraft(setId: string, patch: Partial<SetDraft>) {
    setSetDrafts((previous) => {
      const current = previous[setId] ?? { reps: "", load: "", loadUnit: "kg" as const };
      return {
        ...previous,
        [setId]: { ...current, ...patch },
      };
    });
  }

  function completeSet(set: PerformedSetView, sessionExerciseId: string) {
    if (!session) return;
    const draft = setDrafts[set.id] ?? defaultDraft(set);
    const reps = draft.reps.trim() ? Number(draft.reps) : undefined;
    const load = draft.load.trim() ? Number(draft.load) : undefined;
    const loadUnit = draft.loadUnit;

    startTransition(async () => {
      if (!online) {
        const loadKg =
          load !== undefined ? (normalizeLoadToKg(load, loadUnit) ?? load) : null;
        await queueSetCompletion({
          userId,
          sessionId: session.id,
          completion: {
            setId: set.id,
            sessionExerciseId,
            reps: reps ?? null,
            loadKg,
            loadUnit,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setPendingOffline((count) => count + 1);

        const optimistic: WorkoutSessionView = {
          ...session,
          version: session.version + 1,
          exercises: session.exercises.map((exercise) =>
            exercise.id !== sessionExerciseId
              ? exercise
              : {
                  ...exercise,
                  sets: exercise.sets.map((candidate) =>
                    candidate.id !== set.id
                      ? candidate
                      : {
                          ...candidate,
                          status: "completed",
                          reps: reps ?? candidate.reps,
                          loadKg: loadKg ?? candidate.loadKg,
                          loadUnit,
                        },
                  ),
                },
          ),
        };
        applySession(optimistic, "Set queued offline");
        restTimer.notifySetCompleted();
        return;
      }

      const result = await completeSetAction({
        setId: set.id,
        version: session.version,
        reps,
        load,
        loadUnit,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
      restTimer.notifySetCompleted();
    });
  }

  function skipSet(set: PerformedSetView) {
    if (!session) return;
    startTransition(async () => {
      if (!online) {
        await queueSetSkip({
          userId,
          sessionId: session.id,
          setId: set.id,
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setPendingOffline((count) => count + 1);

        const optimistic: WorkoutSessionView = {
          ...session,
          version: session.version + 1,
          exercises: session.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((candidate) =>
              candidate.id !== set.id ? candidate : { ...candidate, status: "skipped" },
            ),
          })),
        };
        applySession(optimistic, "Set skip queued offline");
        return;
      }

      const result = await skipSetAction({ setId: set.id, version: session.version });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function addSet() {
    if (!session || !currentExercise) return;
    startTransition(async () => {
      const result = await addSetAction({
        sessionExerciseId: currentExercise.id,
        setRole: "working",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
    });
  }

  function finishWorkout() {
    if (!session) return;
    startTransition(async () => {
      if (!online) {
        const completedAt = new Date().toISOString();
        const durationSeconds = sessionDurationSeconds(session.startedAt, completedAt);
        const totalVolume = totalSessionVolume(sessionVolumeInputs(session));
        await queueSessionFinish({
          userId,
          finish: {
            sessionId: session.id,
            expectedVersion: session.version,
            completedAt,
            durationSeconds,
            totalVolume,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        const summary = sessionFinishSummary(session);
        setSession(null);
        setConfirmFinish(false);
        onSaved(`${summary} · queued offline`);
        return;
      }

      const result = await finishSessionAction({
        sessionId: session.id,
        version: session.version,
      });
      if (!result.ok) {
        setError(result.error);
        setConfirmFinish(false);
        return;
      }
      const summary = sessionFinishSummary(result.session);
      setSession(null);
      setConfirmFinish(false);
      if (result.pendingPersonalRecords?.length) {
        setPendingPRs(result.pendingPersonalRecords);
      } else {
        const records = await listPendingPersonalRecordsAction();
        setPendingPRs(records);
      }
      onSaved(summary);
    });
  }

  function discardWorkout() {
    if (!session) return;
    startTransition(async () => {
      if (!online) {
        await queueSessionDiscard({
          userId,
          discard: {
            sessionId: session.id,
            expectedVersion: session.version,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setSession(null);
        setConfirmDiscard(false);
        setStatusMessage("Workout discard queued offline");
        return;
      }

      const result = await cancelSessionAction({
        sessionId: session.id,
        version: session.version,
      });
      if (!result.ok) {
        setError(result.error);
        setConfirmDiscard(false);
        return;
      }
      setSession(null);
      setConfirmDiscard(false);
      setStatusMessage(result.message);
    });
  }

  function confirmPR(recordId: string) {
    startTransition(async () => {
      const result = await confirmPersonalRecordAction({ id: recordId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingPRs((records) => records.filter((record) => record.id !== recordId));
      setStatusMessage(result.message);
      setError(null);
    });
  }

  function dismissPR(recordId: string) {
    startTransition(async () => {
      const result = await dismissPersonalRecordAction({ id: recordId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingPRs((records) => records.filter((record) => record.id !== recordId));
      setStatusMessage(result.message);
      setError(null);
    });
  }

  function addCatalogExercise(exerciseDefinitionId: string) {
    if (!session) return;
    startTransition(async () => {
      const result = await addExerciseToSessionAction({
        sessionId: session.id,
        exerciseDefinitionId,
        workingSets: 3,
        version: session.version,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applySession(result.session, result.message);
      setCatalogQuery("");
    });
  }

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return catalog.slice(0, 12);
    return catalog
      .filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(q) ||
          exercise.stableKey.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [catalog, catalogQuery]);

  const elapsedLabel = useMemo(
    () => (session ? formatElapsed(session.startedAt, sessionNow) : "0:00"),
    [session, sessionNow],
  );

  const startMenu = (
    <>
      <p className="border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-2 text-sm font-bold">
        Start a live session — closing this panel does not discard an in-progress workout.
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-2 border-2 border-[var(--mt-danger)] bg-white p-2 text-sm font-bold text-[var(--mt-danger)]"
        >
          {error}
        </p>
      ) : null}
      {conflictSessionId ? (
        <div className="mt-3 border-2 border-[var(--mt-neon-yellow)] bg-white p-3">
          <p className="font-bold">
            A workout is already in progress
            {startOptions?.activeSession ? `: ${startOptions.activeSession.title}` : "."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <PixelButton tone="primary" loading={pending} onClick={resumeConflict}>
              Resume active session
            </PixelButton>
          </div>
        </div>
      ) : null}
      {pendingPRs.length > 0 ? (
        <section
          className="mt-3 border-2 border-[var(--mt-neon-lime)] bg-white/90 p-3"
          aria-label="Pending personal records"
        >
          <h3 className="font-black uppercase">New personal records</h3>
          <p className="mt-1 text-xs font-bold">
            Confirm to keep these on your record board, or dismiss if the detection looks
            off.
          </p>
          <ul className="mt-2 space-y-2">
            {pendingPRs.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mt-ink)]/30 pt-2 first:border-t-0 first:pt-0"
              >
                <span className="text-sm font-bold">{formatPersonalRecord(record)}</span>
                <div className="flex flex-wrap gap-1">
                  <PixelButton
                    tone="primary"
                    loading={pending}
                    onClick={() => confirmPR(record.id)}
                  >
                    Confirm
                  </PixelButton>
                  <PixelButton
                    tone="neutral"
                    loading={pending}
                    onClick={() => dismissPR(record.id)}
                  >
                    Dismiss
                  </PixelButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <PixelButton tone="primary" loading={pending} onClick={startBlank}>
          Start blank workout
        </PixelButton>
        {scheduled ? (
          <PixelButton tone="cyan" loading={pending} onClick={startScheduled}>
            Start scheduled · {scheduled.title}
          </PixelButton>
        ) : null}
        {startOptions?.yesterdayCompleted ? (
          <PixelButton tone="cyan" loading={pending} onClick={copyYesterday}>
            Copy yesterday · {startOptions.yesterdayCompleted.title}
          </PixelButton>
        ) : null}
        {startOptions?.lastCompleted ? (
          <PixelButton tone="cyan" loading={pending} onClick={repeatLast}>
            Repeat last · {startOptions.lastCompleted.title}
          </PixelButton>
        ) : null}
      </div>
      <div className="mt-4 border-2 border-[var(--mt-ink)] bg-white/80 p-3">
        <h3 className="font-black uppercase">From a plan</h3>
        {plans.length === 0 ? (
          <p className="mt-2 text-sm">
            No plans yet. Install the Arnold starter below or create one on the Plans
            page.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {plans.flatMap((plan) =>
              plan.days
                .filter((day) => !day.restDay && day.blocks.length > 0)
                .map((day) => (
                  <li
                    key={day.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mt-ink)]/30 pt-2 first:border-t-0 first:pt-0"
                  >
                    <span>
                      <strong>{plan.name}</strong> · {day.name}
                    </span>
                    <PixelButton
                      tone="cyan"
                      loading={pending}
                      onClick={() => startPlanDay(day.id)}
                    >
                      Start
                    </PixelButton>
                  </li>
                )),
            )}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <PixelButton tone="neutral" loading={pending} onClick={installArnold}>
          Install Arnold starter plan
        </PixelButton>
        <p className="mt-1 text-xs font-bold">
          Explicit install only — never added automatically.
        </p>
      </div>
    </>
  );

  const runner = session ? (
    <>
      {!online ? (
        <p
          role="status"
          className="mb-2 border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-cyan)] p-2 text-sm font-bold"
        >
          Offline — set completions queue locally
          {pendingOffline > 0 ? ` (${pendingOffline} pending sync)` : ""}.
        </p>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-black uppercase">{session.title}</p>
        <p className="font-mono text-sm font-bold" aria-live="off">
          Elapsed {elapsedLabel}
        </p>
      </div>
      <p className="mt-2 border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-pink)]/40 p-2 text-xs font-bold">
        {SAFETY_NOTE}
      </p>
      {session.exercises.length === 0 ? (
        <div className="mt-4 border-2 border-[var(--mt-ink)] bg-white/80 p-3">
          <h3 className="font-black uppercase">Add an exercise</h3>
          <label
            className="mt-2 block text-sm font-bold"
            htmlFor="workout-catalog-search"
          >
            Search catalog
          </label>
          <input
            id="workout-catalog-search"
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
            value={catalogQuery}
            onChange={(event) => setCatalogQuery(event.target.value)}
            placeholder="Bench, squat, plank…"
          />
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {filteredCatalog.map((exercise) => (
              <li key={exercise.id} className="flex items-center justify-between gap-2">
                <span className="text-sm">{exercise.name}</span>
                <PixelButton
                  tone="cyan"
                  loading={pending}
                  onClick={() => addCatalogExercise(exercise.id)}
                >
                  Add
                </PixelButton>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-1" aria-label="Exercises">
            {session.exercises.map((exercise, index) => (
              <PixelButton
                key={exercise.id}
                tone={index === exerciseIndex ? "primary" : "neutral"}
                onClick={() => setExerciseIndex(index)}
              >
                {exercise.exerciseName}
              </PixelButton>
            ))}
          </div>
          {currentExercise ? (
            <section className="mt-4 border-2 border-[var(--mt-ink)] bg-white/80 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black uppercase">{currentExercise.exerciseName}</h3>
                {currentExercise.blockType ? (
                  <span className="border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-cyan)] px-2 py-0.5 text-[10px] font-extrabold uppercase">
                    {BLOCK_LABELS[currentExercise.blockType] ?? currentExercise.blockType}
                  </span>
                ) : null}
              </div>
              {history.length > 0 ? (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-bold select-none">
                    Previous performance
                  </summary>
                  <ul className="mt-1 list-disc pl-4">
                    {history.map((entry) => (
                      <li key={entry.id}>
                        {entry.reps ?? "—"} reps
                        {entry.loadKg != null ? ` @ ${entry.loadKg} kg` : ""}
                        {entry.rpe != null ? ` · RPE ${entry.rpe}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <table className="mt-3 w-full text-left text-sm">
                <caption className="sr-only">
                  Sets for {currentExercise.exerciseName}
                </caption>
                <thead>
                  <tr className="border-b-2 border-[var(--mt-ink)]">
                    <th scope="col" className="py-1 pr-2">
                      Set
                    </th>
                    <th scope="col" className="py-1 pr-2">
                      Role
                    </th>
                    <th scope="col" className="py-1 pr-2">
                      Reps
                    </th>
                    <th scope="col" className="py-1 pr-2">
                      Load
                    </th>
                    <th scope="col" className="py-1">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentExercise.sets.map((set) => {
                    const draft = setDrafts[set.id] ?? defaultDraft(set);
                    const done = set.status === "completed";
                    const skipped = set.status === "skipped";
                    return (
                      <tr
                        key={set.id}
                        className="border-t border-[var(--mt-ink)]/30 align-middle"
                      >
                        <td className="py-2 pr-2 font-bold">{set.setIndex}</td>
                        <td className="py-2 pr-2 text-xs uppercase">
                          {SET_ROLE_LABELS[set.setRole] ?? set.setRole}
                        </td>
                        <td className="py-2 pr-2">
                          <label className="sr-only" htmlFor={`reps-${set.id}`}>
                            Reps for set {set.setIndex}
                          </label>
                          <input
                            id={`reps-${set.id}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={done || skipped || pending}
                            value={draft.reps}
                            onChange={(event) =>
                              updateSetDraft(set.id, { reps: event.target.value })
                            }
                            className="min-h-11 w-16 border-2 border-[var(--mt-ink)] px-1"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <label className="sr-only" htmlFor={`load-${set.id}`}>
                              Load for set {set.setIndex}
                            </label>
                            <input
                              id={`load-${set.id}`}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              disabled={done || skipped || pending}
                              value={draft.load}
                              onChange={(event) =>
                                updateSetDraft(set.id, { load: event.target.value })
                              }
                              className="min-h-11 w-20 border-2 border-[var(--mt-ink)] px-1"
                            />
                            <select
                              aria-label={`Load unit for set ${set.setIndex}`}
                              disabled={done || skipped || pending}
                              value={draft.loadUnit}
                              onChange={(event) =>
                                updateSetDraft(set.id, {
                                  loadUnit: event.target.value as "kg" | "lb",
                                })
                              }
                              className="min-h-11 border-2 border-[var(--mt-ink)] bg-white px-1 text-xs font-bold"
                            >
                              <option value="kg">kg</option>
                              <option value="lb">lb</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            <PixelButton
                              tone="primary"
                              disabled={done || skipped || pending}
                              loading={pending}
                              onClick={() => completeSet(set, currentExercise.id)}
                            >
                              Complete
                            </PixelButton>
                            <PixelButton
                              tone="neutral"
                              disabled={done || skipped || pending}
                              onClick={() => skipSet(set)}
                            >
                              Skip
                            </PixelButton>
                          </div>
                          {done ? (
                            <span className="sr-only" aria-live="polite">
                              Set {set.setIndex} completed
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <PixelButton
                tone="cyan"
                className="mt-2"
                disabled={pending}
                onClick={addSet}
              >
                Add set
              </PixelButton>
            </section>
          ) : null}
        </>
      )}
      <section
        className="mt-4 border-2 border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-3"
        aria-live="polite"
        aria-label="Rest timer"
      >
        <h3 className="font-black uppercase">Rest timer</h3>
        <p
          className={cn(
            "mt-2 font-mono text-3xl font-black tabular-nums",
            restTimer.isActive && !restTimer.reducedMotion && "animate-pulse",
          )}
        >
          {formatRestTimer(restTimer.remainingSeconds)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {restTimer.isPaused ? (
            <PixelButton tone="primary" onClick={restTimer.resume}>
              Resume
            </PixelButton>
          ) : restTimer.isActive ? (
            <PixelButton tone="neutral" onClick={restTimer.pause}>
              Pause
            </PixelButton>
          ) : (
            <PixelButton tone="cyan" onClick={() => restTimer.start()}>
              Start 90s
            </PixelButton>
          )}
          <PixelButton tone="neutral" onClick={() => restTimer.addSeconds(15)}>
            +15s
          </PixelButton>
          <PixelButton tone="neutral" onClick={() => restTimer.addSeconds(-15)}>
            −15s
          </PixelButton>
          <PixelButton tone="neutral" onClick={restTimer.skip}>
            Skip rest
          </PixelButton>
        </div>
      </section>
      {error ? (
        <p
          role="alert"
          className="mt-2 border-2 border-[var(--mt-danger)] bg-white p-2 text-sm font-bold text-[var(--mt-danger)]"
        >
          {error}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>
    </>
  ) : null;

  return (
    <FocusPanel
      title={session ? session.title : "Workout"}
      titleId={titleId}
      chrome="paper"
      accent="pink"
      onClose={onCancel}
      footer={
        session ? (
          <>
            {confirmFinish ? (
              <>
                <PixelButton tone="primary" loading={pending} onClick={finishWorkout}>
                  Confirm finish
                </PixelButton>
                <PixelButton tone="neutral" onClick={() => setConfirmFinish(false)}>
                  Back
                </PixelButton>
              </>
            ) : confirmDiscard ? (
              <>
                <PixelButton tone="danger" loading={pending} onClick={discardWorkout}>
                  Confirm discard
                </PixelButton>
                <PixelButton tone="neutral" onClick={() => setConfirmDiscard(false)}>
                  Back
                </PixelButton>
              </>
            ) : (
              <>
                <PixelButton
                  tone="primary"
                  disabled={pending}
                  onClick={() => setConfirmFinish(true)}
                >
                  Finish workout
                </PixelButton>
                <PixelButton
                  tone="danger"
                  disabled={pending}
                  onClick={() => setConfirmDiscard(true)}
                >
                  Discard
                </PixelButton>
                <PixelButton tone="neutral" disabled={pending} onClick={onCancel}>
                  Close
                </PixelButton>
              </>
            )}
          </>
        ) : (
          <>
            <PixelButton tone="neutral" onClick={onCancel}>
              Close
            </PixelButton>
          </>
        )
      }
    >
      {loading ? <p className="text-sm">Loading workout session…</p> : null}
      {!loading && !session ? startMenu : null}
      {!loading && session ? runner : null}
    </FocusPanel>
  );
}
