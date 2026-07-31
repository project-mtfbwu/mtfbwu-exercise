"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addBlockAction,
  addBlockExerciseAction,
  addPlanDayAction,
  addPrescriptionAction,
  archivePlanAction,
  copyPlanAction,
  deleteBlockAction,
  deleteBlockExerciseAction,
  deletePlanDayAction,
  deletePrescriptionAction,
  duplicateBlockAction,
  duplicatePlanDayAction,
  duplicatePrescriptionAction,
  getPlanAction,
  createUserExerciseAction,
  reorderBlockExercisesAction,
  reorderBlocksAction,
  reorderPlanDaysAction,
  reorderPrescriptionsAction,
  substituteBlockExerciseAction,
  updateBlockAction,
  updatePlanDayAction,
  updatePlanMetaAction,
  updatePrescriptionAction,
  versionPlanAction,
} from "@/modules/workout/plans/actions";
import { listExercisesAction } from "@/modules/workout/sessions/actions";
import type {
  ExerciseCatalogView,
  PlanDayView,
  PlanSummaryView,
  WorkoutSetRole,
} from "@/modules/workout/sessions/types";
import { AppLink } from "@/shared/ui/app-link";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { ROUTES } from "@/shared/config/constants";
import { moveIds } from "./plan-editor/constants";
import { PlanDayPanel } from "./plan-editor/plan-day-panel";
import type {
  BlockPatch,
  PlanEditorActions,
  PrescriptionPatch,
} from "./plan-editor/types";

type MetaDraft = {
  name: string;
  description: string;
  objective: string;
};

function toMetaDraft(plan: PlanSummaryView): MetaDraft {
  return {
    name: plan.name,
    description: plan.description ?? "",
    objective: plan.objective ?? "",
  };
}

function metaDraftEquals(a: MetaDraft, b: MetaDraft): boolean {
  return (
    a.name === b.name && a.description === b.description && a.objective === b.objective
  );
}

export function PlanEditorClient({ initialPlan }: { initialPlan: PlanSummaryView }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [metaDraft, setMetaDraft] = useState(() => toMetaDraft(initialPlan));
  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    initialPlan.days[0]?.id ?? null,
  );
  const [catalog, setCatalog] = useState<ExerciseCatalogView[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  const metaDirty = !metaDraftEquals(metaDraft, toMetaDraft(plan));

  useEffect(() => {
    let cancelled = false;
    void listExercisesAction().then((rows) => {
      if (!cancelled) setCatalog(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedDay =
    (selectedDayId ? plan.days.find((day) => day.id === selectedDayId) : null) ??
    plan.days[0] ??
    null;

  const applyPlan = useCallback((next: PlanSummaryView, statusMessage: string) => {
    setPlan(next);
    setMetaDraft(toMetaDraft(next));
    setConflict(false);
    setError(null);
    setMessage(statusMessage);
  }, []);

  const handleMutationError = useCallback(
    (mutationError: string, isConflict?: boolean) => {
      if (isConflict) setConflict(true);
      setError(mutationError);
      setMessage(null);
    },
    [],
  );

  const runPlanMutation = useCallback(
    (
      action: () => Promise<
        | { ok: true; plan: PlanSummaryView; message: string }
        | { ok: false; error: string; conflict?: boolean }
      >,
    ) => {
      startTransition(async () => {
        const result = await action();
        if (!result.ok) {
          handleMutationError(result.error, result.conflict);
          return;
        }
        applyPlan(result.plan, result.message);
      });
    },
    [applyPlan, handleMutationError],
  );

  const version = plan.version;

  const actions: PlanEditorActions = useMemo(
    () => ({
      updateDay: (dayId, patch) => {
        runPlanMutation(() =>
          updatePlanDayAction({ dayId, expectedVersion: version, ...patch }),
        );
      },
      deleteDay: (dayId) => {
        runPlanMutation(() => deletePlanDayAction({ dayId, expectedVersion: version }));
      },
      duplicateDay: (dayId) => {
        runPlanMutation(() =>
          duplicatePlanDayAction({ dayId, expectedVersion: version }),
        );
      },
      moveDay: (dayId, delta) => {
        const ids = plan.days.map((day) => day.id);
        const index = ids.indexOf(dayId);
        if (index < 0) return;
        const orderedDayIds = moveIds(ids, index, delta);
        runPlanMutation(() =>
          reorderPlanDaysAction({
            planId: plan.id,
            expectedVersion: version,
            orderedDayIds,
          }),
        );
      },
      addBlock: (planDayId, blockType) => {
        runPlanMutation(() =>
          addBlockAction({ planDayId, expectedVersion: version, blockType }),
        );
      },
      updateBlock: (blockId, patch: BlockPatch) => {
        runPlanMutation(() =>
          updateBlockAction({ blockId, expectedVersion: version, ...patch }),
        );
      },
      deleteBlock: (blockId) => {
        runPlanMutation(() => deleteBlockAction({ blockId, expectedVersion: version }));
      },
      duplicateBlock: (blockId) => {
        runPlanMutation(() =>
          duplicateBlockAction({ blockId, expectedVersion: version }),
        );
      },
      moveBlock: (planDayId, blockId, delta) => {
        const day = plan.days.find((candidate) => candidate.id === planDayId);
        if (!day) return;
        const ids = day.blocks.map((block) => block.id);
        const index = ids.indexOf(blockId);
        if (index < 0) return;
        runPlanMutation(() =>
          reorderBlocksAction({
            planDayId,
            expectedVersion: version,
            orderedBlockIds: moveIds(ids, index, delta),
          }),
        );
      },
      addExerciseFromCatalog: (blockId, exerciseDefinitionId) => {
        runPlanMutation(() =>
          addBlockExerciseAction({
            blockId,
            expectedVersion: version,
            exerciseDefinitionId,
          }),
        );
      },
      addCustomExercise: (blockId) => {
        startTransition(async () => {
          const customName = window.prompt("Custom exercise name");
          if (!customName?.trim()) return;
          const created = await createUserExerciseAction({
            customName: customName.trim(),
          });
          if (!created.ok) {
            handleMutationError(created.error);
            return;
          }
          const result = await addBlockExerciseAction({
            blockId,
            expectedVersion: version,
            userExerciseId: created.id,
          });
          if (!result.ok) {
            handleMutationError(result.error, result.conflict);
            return;
          }
          applyPlan(result.plan, result.message);
        });
      },
      substituteExerciseFromCatalog: (blockExerciseId, exerciseDefinitionId) => {
        runPlanMutation(() =>
          substituteBlockExerciseAction({
            blockExerciseId,
            expectedVersion: version,
            exerciseDefinitionId,
          }),
        );
      },
      substituteWithCustomExercise: (blockExerciseId) => {
        startTransition(async () => {
          const customName = window.prompt("Custom exercise name");
          if (!customName?.trim()) return;
          const created = await createUserExerciseAction({
            customName: customName.trim(),
          });
          if (!created.ok) {
            handleMutationError(created.error);
            return;
          }
          const result = await substituteBlockExerciseAction({
            blockExerciseId,
            expectedVersion: version,
            userExerciseId: created.id,
          });
          if (!result.ok) {
            handleMutationError(result.error, result.conflict);
            return;
          }
          applyPlan(result.plan, result.message);
        });
      },
      deleteExercise: (blockExerciseId) => {
        runPlanMutation(() =>
          deleteBlockExerciseAction({ blockExerciseId, expectedVersion: version }),
        );
      },
      moveExercise: (blockId, blockExerciseId, delta) => {
        const block = plan.days
          .flatMap((day) => day.blocks)
          .find((candidate) => candidate.id === blockId);
        if (!block) return;
        const ids = block.exercises.map((exercise) => exercise.id);
        const index = ids.indexOf(blockExerciseId);
        if (index < 0) return;
        runPlanMutation(() =>
          reorderBlockExercisesAction({
            blockId,
            expectedVersion: version,
            orderedBlockExerciseIds: moveIds(ids, index, delta),
          }),
        );
      },
      addPrescription: (blockExerciseId, setRole: WorkoutSetRole) => {
        runPlanMutation(() =>
          addPrescriptionAction({
            blockExerciseId,
            expectedVersion: version,
            setRole,
          }),
        );
      },
      updatePrescription: (prescriptionId, patch: PrescriptionPatch) => {
        runPlanMutation(() =>
          updatePrescriptionAction({
            prescriptionId,
            expectedVersion: version,
            ...patch,
          }),
        );
      },
      deletePrescription: (prescriptionId) => {
        runPlanMutation(() =>
          deletePrescriptionAction({ prescriptionId, expectedVersion: version }),
        );
      },
      duplicatePrescription: (prescriptionId) => {
        runPlanMutation(() =>
          duplicatePrescriptionAction({ prescriptionId, expectedVersion: version }),
        );
      },
      movePrescription: (blockExerciseId, prescriptionId, delta) => {
        const blockExercise = plan.days
          .flatMap((day) => day.blocks)
          .flatMap((block) => block.exercises)
          .find((exercise) => exercise.id === blockExerciseId);
        if (!blockExercise) return;
        const ids = blockExercise.prescriptions.map((prescription) => prescription.id);
        const index = ids.indexOf(prescriptionId);
        if (index < 0) return;
        runPlanMutation(() =>
          reorderPrescriptionsAction({
            blockExerciseId,
            expectedVersion: version,
            orderedPrescriptionIds: moveIds(ids, index, delta),
          }),
        );
      },
    }),
    [applyPlan, handleMutationError, plan, runPlanMutation, version],
  );

  function saveMeta() {
    startTransition(async () => {
      const result = await updatePlanMetaAction({
        planId: plan.id,
        expectedVersion: version,
        name: metaDraft.name.trim(),
        description: metaDraft.description.trim() || undefined,
        objective: metaDraft.objective.trim() || undefined,
      });
      if (!result.ok) {
        handleMutationError(result.error, result.conflict);
        return;
      }
      applyPlan(result.plan, result.message);
    });
  }

  function addDay() {
    runPlanMutation(() =>
      addPlanDayAction({
        planId: plan.id,
        expectedVersion: version,
        name: `Day ${plan.days.length + 1}`,
      }),
    );
  }

  function archive() {
    if (!window.confirm(`Archive "${plan.name}"? Performed sessions are kept.`)) return;
    startTransition(async () => {
      const result = await archivePlanAction({
        planId: plan.id,
        expectedVersion: version,
      });
      if (!result.ok) {
        handleMutationError(result.error, result.conflict);
        return;
      }
      router.push(ROUTES.plans);
      router.refresh();
    });
  }

  function copyPlan() {
    startTransition(async () => {
      const result = await copyPlanAction({ planId: plan.id });
      if (!result.ok) {
        handleMutationError(result.error);
        return;
      }
      router.push(`/plans/${result.id}`);
      router.refresh();
    });
  }

  function versionPlan() {
    startTransition(async () => {
      const result = await versionPlanAction({
        planId: plan.id,
        expectedVersion: version,
      });
      if (!result.ok) {
        handleMutationError(result.error, result.conflict);
        return;
      }
      router.push(`/plans/${result.id}`);
      router.refresh();
    });
  }

  function refreshPlan() {
    startTransition(async () => {
      const fresh = await getPlanAction(plan.id);
      if (!fresh) {
        setError("Plan not found.");
        return;
      }
      applyPlan(fresh, "Plan refreshed.");
    });
  }

  function handleDayKeyDown(day: PlanDayView, index: number, event: React.KeyboardEvent) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      actions.moveDay(day.id, -1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      actions.moveDay(day.id, 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedDayId(day.id);
    }
  }

  return (
    <article className="mt-paper-panel space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-[var(--mt-neon-cyan)] uppercase">
          Plan editor
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-bold text-[var(--mt-ink)]">{plan.name}</h1>
          <p className="text-xs font-bold uppercase">Version {plan.version}</p>
        </div>
      </header>

      {conflict ? (
        <div
          role="alert"
          className="border-2 border-[var(--mt-neon-yellow)] bg-white p-3 text-sm font-bold"
        >
          <p>This plan changed elsewhere. Refresh before editing again.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <PixelButton tone="primary" loading={pending} onClick={refreshPlan}>
              Refresh plan
            </PixelButton>
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          className="border-2 border-[var(--mt-neon-lime)] bg-white p-2 text-sm font-bold"
        >
          {message}
        </p>
      ) : null}
      {error && !conflict ? (
        <p
          role="alert"
          className="border-2 border-[var(--mt-danger)] bg-white p-2 text-sm font-bold text-[var(--mt-danger)]"
        >
          {error}
        </p>
      ) : null}

      <RetroWindow title="Plan details" accent="pink">
        <div className="space-y-3">
          <label className="block text-sm font-bold" htmlFor="plan-name">
            Name
            <input
              id="plan-name"
              value={metaDraft.name}
              maxLength={120}
              onChange={(event) =>
                setMetaDraft((draft) => ({ ...draft, name: event.target.value }))
              }
              className="mt-1 block min-h-11 w-full max-w-md border-2 border-[var(--mt-ink)] px-2"
            />
          </label>
          <label className="block text-sm font-bold" htmlFor="plan-description">
            Description
            <textarea
              id="plan-description"
              value={metaDraft.description}
              maxLength={2000}
              rows={2}
              onChange={(event) =>
                setMetaDraft((draft) => ({ ...draft, description: event.target.value }))
              }
              className="mt-1 block w-full max-w-prose border-2 border-[var(--mt-ink)] px-2 py-2"
            />
          </label>
          <label className="block text-sm font-bold" htmlFor="plan-objective">
            Objective
            <input
              id="plan-objective"
              value={metaDraft.objective}
              maxLength={120}
              onChange={(event) =>
                setMetaDraft((draft) => ({ ...draft, objective: event.target.value }))
              }
              className="mt-1 block min-h-11 w-full max-w-md border-2 border-[var(--mt-ink)] px-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <PixelButton
              tone="primary"
              disabled={!metaDirty || pending}
              onClick={saveMeta}
            >
              Save details
            </PixelButton>
            <PixelButton tone="cyan" disabled={pending} onClick={copyPlan}>
              Copy plan
            </PixelButton>
            <PixelButton tone="cyan" disabled={pending} onClick={versionPlan}>
              New version
            </PixelButton>
            <PixelButton tone="danger" disabled={pending} onClick={archive}>
              Archive
            </PixelButton>
            <AppLink
              href={ROUTES.plans}
              className="inline-flex min-h-11 items-center border-2 border-[var(--mt-ink)] bg-white px-3 text-sm font-extrabold text-[var(--mt-ink)] no-underline"
            >
              Back to plans
            </AppLink>
          </div>
        </div>
      </RetroWindow>

      <div className="grid gap-4 lg:grid-cols-[minmax(12rem,16rem)_1fr]">
        <RetroWindow title="Days" accent="lime">
          <div className="flex flex-wrap gap-2">
            <PixelButton tone="primary" disabled={pending} onClick={addDay}>
              Add day
            </PixelButton>
          </div>
          {plan.days.length === 0 ? (
            <p className="mt-3 text-sm">No days yet — add one to start building.</p>
          ) : (
            <ul className="mt-3 space-y-2" aria-label="Plan days">
              {plan.days.map((day, index) => {
                const selected = day.id === selectedDayId;
                return (
                  <li key={day.id}>
                    <button
                      type="button"
                      tabIndex={0}
                      aria-current={selected ? "true" : undefined}
                      onClick={() => setSelectedDayId(day.id)}
                      onKeyDown={(event) => handleDayKeyDown(day, index, event)}
                      className={`w-full border-2 border-[var(--mt-ink)] p-2 text-left text-sm font-bold ${
                        selected
                          ? "bg-[var(--mt-neon-cyan)]"
                          : "bg-white/80 hover:bg-[var(--mt-paper-warm)]"
                      }`}
                    >
                      <span className="block uppercase">{day.name}</span>
                      <span className="text-xs font-normal">
                        {day.restDay
                          ? "Rest day"
                          : `${day.blocks.length} block${day.blocks.length === 1 ? "" : "s"}`}
                      </span>
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <PixelButton
                        tone="neutral"
                        aria-label={`Move ${day.name} up`}
                        disabled={index === 0 || pending}
                        onClick={() => actions.moveDay(day.id, -1)}
                      >
                        Up
                      </PixelButton>
                      <PixelButton
                        tone="neutral"
                        aria-label={`Move ${day.name} down`}
                        disabled={index === plan.days.length - 1 || pending}
                        onClick={() => actions.moveDay(day.id, 1)}
                      >
                        Down
                      </PixelButton>
                      <PixelButton
                        tone="cyan"
                        disabled={pending}
                        onClick={() => actions.duplicateDay(day.id)}
                      >
                        Duplicate
                      </PixelButton>
                      <PixelButton
                        tone="danger"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete "${day.name}" and all blocks inside it?`,
                            )
                          ) {
                            return;
                          }
                          actions.deleteDay(day.id);
                        }}
                      >
                        Delete
                      </PixelButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </RetroWindow>

        {selectedDay ? (
          <div className="space-y-4">
            <RetroWindow title={`Edit ${selectedDay.name}`} accent="orange">
              <DayMetaEditor
                key={`${selectedDay.id}-${plan.version}-${selectedDay.name}-${selectedDay.restDay}`}
                day={selectedDay}
                pending={pending}
                actions={actions}
              />
            </RetroWindow>
            <PlanDayPanel
              key={`${selectedDay.id}-${plan.version}`}
              day={selectedDay}
              catalog={catalog}
              pending={pending}
              actions={actions}
            />
          </div>
        ) : (
          <p className="border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-4 text-sm font-bold">
            Select a day to edit blocks, exercises, and prescriptions.
          </p>
        )}
      </div>
    </article>
  );
}

function DayMetaEditor({
  day,
  pending,
  actions,
}: {
  day: PlanDayView;
  pending: boolean;
  actions: PlanEditorActions;
}) {
  const [name, setName] = useState(day.name);
  const [restDay, setRestDay] = useState(day.restDay);

  const dirty = name.trim() !== day.name || restDay !== day.restDay;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-bold" htmlFor={`day-name-${day.id}`}>
        Day name
        <input
          id={`day-name-${day.id}`}
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 block min-h-11 w-48 border-2 border-[var(--mt-ink)] px-2"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={restDay}
          onChange={(event) => setRestDay(event.target.checked)}
          className="size-4 border-2 border-[var(--mt-ink)]"
        />
        Rest day
      </label>
      <PixelButton
        tone="primary"
        disabled={!dirty || pending || !name.trim()}
        onClick={() => actions.updateDay(day.id, { name: name.trim(), restDay })}
      >
        Save day
      </PixelButton>
    </div>
  );
}
