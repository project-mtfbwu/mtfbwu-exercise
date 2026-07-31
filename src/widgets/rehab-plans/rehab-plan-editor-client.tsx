"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import {
  addDayAction,
  addExerciseAction,
  addPhaseAction,
  addPrescriptionAction,
  addRestrictionAction,
  createClinicianSourceAction,
  deleteClinicianSourceAction,
  duplicateDayAction,
  duplicatePhaseAction,
  listCatalogAction,
  listClinicianSourcesAction,
  reorderDaysAction,
  reorderExercisesAction,
  reorderPhasesAction,
  reorderPrescriptionsAction,
  reorderRestrictionsAction,
  updateClinicianSourceAction,
  updatePlanAction,
} from "@/modules/rehab/plans/actions";
import { moveIdInOrder } from "@/modules/rehab/plans/plan-tree";
import {
  CLINICIAN_PROVENANCE_WARNING,
  clinicianSourceUnconfirmedLabel,
} from "@/modules/rehab/plans/clinician-source-helpers";
import type {
  RehabClinicianSourceView,
  RehabExerciseCatalogView,
  RehabPlanSummaryView,
  RehabSide,
} from "@/modules/rehab/types";
import { REHAB_CLINICIAN_SOURCE_TYPES, REHAB_SIDES } from "@/modules/rehab/types";
import { SAFETY_BANNER } from "@/modules/rehab/safety";

const RehabPlanEditorDetails = dynamic(
  () => import("./rehab-plan-editor-details").then((m) => m.RehabPlanEditorDetails),
  {
    loading: () => <p className="text-sm text-[var(--mt-ink-muted)]">Loading editor…</p>,
    ssr: false,
  },
);

const SIDE_LABELS: Record<RehabSide, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
  not_applicable: "N/A",
};

function MoveButtons({
  label,
  canMoveUp,
  canMoveDown,
  disabled,
  onUp,
  onDown,
}: {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <PixelButton
        tone="neutral"
        aria-label={`Move ${label} up`}
        disabled={!canMoveUp || disabled}
        onClick={onUp}
      >
        Move up
      </PixelButton>
      <PixelButton
        tone="neutral"
        aria-label={`Move ${label} down`}
        disabled={!canMoveDown || disabled}
        onClick={onDown}
      >
        Move down
      </PixelButton>
    </div>
  );
}

export function RehabPlanEditorClient({
  initialPlan,
}: {
  initialPlan: RehabPlanSummaryView;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [catalog, setCatalog] = useState<RehabExerciseCatalogView[]>([]);
  const [clinicianSources, setClinicianSources] = useState<RehabClinicianSourceView[]>(
    [],
  );
  const [clinicianSource, setClinicianSource] = useState<RehabClinicianSourceView | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [restrictionText, setRestrictionText] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string>("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [catalogExerciseId, setCatalogExerciseId] = useState("");
  const [exerciseSide, setExerciseSide] = useState<RehabSide>("not_applicable");
  const [targetReps, setTargetReps] = useState("");
  const [targetDuration, setTargetDuration] = useState("");
  const [targetHold, setTargetHold] = useState("");
  const [painLimit, setPainLimit] = useState("");
  const [showClinicianForm, setShowClinicianForm] = useState(false);
  const [clinicianForm, setClinicianForm] = useState({
    sourceType: "physiotherapist" as RehabClinicianSourceView["sourceType"],
    clinicianName: "",
    clinicName: "",
    documentTitle: "",
    documentDate: "",
    notes: "",
    confirmedByUser: false,
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listCatalogAction(), listClinicianSourcesAction()]).then(
      ([catalogRows, clinicians]) => {
        if (cancelled) return;
        setCatalog(catalogRows);
        setClinicianSources(clinicians);
        if (initialPlan.clinicianSourceId) {
          setClinicianSource(
            clinicians.find(
              (c: RehabClinicianSourceView) => c.id === initialPlan.clinicianSourceId,
            ) ?? null,
          );
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [initialPlan.clinicianSourceId]);

  const allDays = plan.phases.flatMap((phase) => phase.days);
  const effectiveDayId =
    selectedDayId && allDays.some((d) => d.id === selectedDayId)
      ? selectedDayId
      : (allDays[0]?.id ?? "");
  const selectedDay = allDays.find((day) => day.id === effectiveDayId);
  const effectiveExerciseId =
    selectedExerciseId && selectedDay?.exercises.some((e) => e.id === selectedExerciseId)
      ? selectedExerciseId
      : (selectedDay?.exercises[0]?.id ?? "");
  const selectedExercise = selectedDay?.exercises.find(
    (e) => e.id === effectiveExerciseId,
  );

  function applyPlan(next: RehabPlanSummaryView, msg: string) {
    setPlan(next);
    setMessage(msg);
    setError(null);
    if (next.clinicianSourceId) {
      setClinicianSource(
        clinicianSources.find((c) => c.id === next.clinicianSourceId) ?? null,
      );
    } else {
      setClinicianSource(null);
    }
  }

  function runMutation(
    action: () => Promise<{
      ok: boolean;
      error?: string;
      plan?: RehabPlanSummaryView;
      message?: string;
    }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Request failed.");
        return;
      }
      if (result.plan) applyPlan(result.plan, result.message ?? "Saved");
    });
  }

  function reorderPhases(phaseId: string, direction: "up" | "down") {
    const ids = plan.phases.map((p) => p.id);
    runMutation(() =>
      reorderPhasesAction({
        planId: plan.id,
        expectedVersion: plan.version,
        orderedPhaseIds: moveIdInOrder(ids, phaseId, direction),
      }),
    );
  }

  function reorderDays(phaseId: string, dayId: string, direction: "up" | "down") {
    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    runMutation(() =>
      reorderDaysAction({
        phaseId,
        expectedVersion: plan.version,
        orderedDayIds: moveIdInOrder(
          phase.days.map((d) => d.id),
          dayId,
          direction,
        ),
      }),
    );
  }

  function reorderExercises(dayId: string, exerciseId: string, direction: "up" | "down") {
    const day = allDays.find((d) => d.id === dayId);
    if (!day) return;
    runMutation(() =>
      reorderExercisesAction({
        dayId,
        expectedVersion: plan.version,
        orderedExerciseIds: moveIdInOrder(
          day.exercises.map((e) => e.id),
          exerciseId,
          direction,
        ),
      }),
    );
  }

  function reorderPrescriptions(
    exerciseId: string,
    prescriptionId: string,
    direction: "up" | "down",
  ) {
    const exercise = allDays.flatMap((d) => d.exercises).find((e) => e.id === exerciseId);
    if (!exercise) return;
    runMutation(() =>
      reorderPrescriptionsAction({
        exerciseId,
        expectedVersion: plan.version,
        orderedPrescriptionIds: moveIdInOrder(
          exercise.prescriptions.map((p) => p.id),
          prescriptionId,
          direction,
        ),
      }),
    );
  }

  function reorderRestrictions(restrictionId: string, direction: "up" | "down") {
    runMutation(() =>
      reorderRestrictionsAction({
        planId: plan.id,
        expectedVersion: plan.version,
        orderedRestrictionIds: moveIdInOrder(
          plan.restrictions.map((r) => r.id),
          restrictionId,
          direction,
        ),
      }),
    );
  }

  function addPhase() {
    runMutation(() =>
      addPhaseAction({
        planId: plan.id,
        expectedVersion: plan.version,
        name: `Phase ${plan.phases.length + 1}`,
      }),
    );
  }

  function duplicatePhase(phaseId: string) {
    runMutation(() => duplicatePhaseAction({ phaseId, expectedVersion: plan.version }));
  }

  function addDay(phaseId: string) {
    runMutation(() => addDayAction({ phaseId, expectedVersion: plan.version }));
  }

  function duplicateDay(dayId: string) {
    runMutation(() => duplicateDayAction({ dayId, expectedVersion: plan.version }));
  }

  function addExercise() {
    if (!effectiveDayId || !catalogExerciseId) return;
    runMutation(() =>
      addExerciseAction({
        dayId: effectiveDayId,
        expectedVersion: plan.version,
        rehabExerciseDefinitionId: catalogExerciseId,
        side: exerciseSide,
      }),
    );
  }

  function addPrescription() {
    if (!effectiveExerciseId) return;
    runMutation(() =>
      addPrescriptionAction({
        exerciseId: effectiveExerciseId,
        expectedVersion: plan.version,
        targetReps: targetReps.trim() ? Number.parseInt(targetReps, 10) : undefined,
        targetDurationSeconds: targetDuration.trim()
          ? Number.parseInt(targetDuration, 10)
          : undefined,
        targetHoldSeconds: targetHold.trim()
          ? Number.parseInt(targetHold, 10)
          : undefined,
        painLimit: painLimit.trim() ? Number.parseInt(painLimit, 10) : undefined,
      }),
    );
  }

  function addRestriction() {
    const valueText = restrictionText.trim();
    if (!valueText) return;
    runMutation(() =>
      addRestrictionAction({
        planId: plan.id,
        expectedVersion: plan.version,
        restrictionType: "clinician_instruction",
        valueText,
      }),
    );
    setRestrictionText("");
  }

  function saveMeta(name: string) {
    startTransition(async () => {
      const result = await updatePlanAction({
        planId: plan.id,
        expectedVersion: plan.version,
        name,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPlan((prev) => ({ ...prev, name, version: prev.version + 1 }));
      setMessage(result.message);
      setError(null);
    });
  }

  function attachClinicianSource(sourceId: string | null) {
    startTransition(async () => {
      const result = await updatePlanAction({
        planId: plan.id,
        expectedVersion: plan.version,
        clinicianSourceId: sourceId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPlan((prev) => ({
        ...prev,
        clinicianSourceId: sourceId,
        version: prev.version + 1,
      }));
      setClinicianSource(clinicianSources.find((c) => c.id === sourceId) ?? null);
      setMessage(sourceId ? "Clinician source attached" : "Clinician source detached");
      setError(null);
    });
  }

  function saveClinicianSource() {
    startTransition(async () => {
      const payload = {
        sourceType: clinicianForm.sourceType,
        clinicianName: clinicianForm.clinicianName || undefined,
        clinicName: clinicianForm.clinicName || undefined,
        documentTitle: clinicianForm.documentTitle || undefined,
        documentDate: clinicianForm.documentDate || undefined,
        notes: clinicianForm.notes || undefined,
        confirmedByUser: clinicianForm.confirmedByUser,
      };
      const result = clinicianSource
        ? await updateClinicianSourceAction({
            sourceId: clinicianSource.id,
            ...payload,
          })
        : await createClinicianSourceAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const refreshed = await listClinicianSourcesAction();
      setClinicianSources(refreshed);
      const savedId = clinicianSource?.id ?? ("id" in result ? result.id : null);
      const saved =
        refreshed.find((c: RehabClinicianSourceView) => c.id === savedId) ?? null;
      if (saved) {
        setClinicianSource(saved);
        await updatePlanAction({
          planId: plan.id,
          expectedVersion: plan.version,
          clinicianSourceId: saved.id,
        });
        setPlan((prev) => ({
          ...prev,
          clinicianSourceId: saved.id,
          version: prev.version + 1,
        }));
      }
      setShowClinicianForm(false);
      setMessage(result.message);
      setError(null);
    });
  }

  function removeClinicianSource() {
    if (!clinicianSource) return;
    const sourceId = clinicianSource.id;
    startTransition(async () => {
      const detach = await updatePlanAction({
        planId: plan.id,
        expectedVersion: plan.version,
        clinicianSourceId: null,
      });
      if (!detach.ok) {
        setError(detach.error);
        return;
      }
      const result = await deleteClinicianSourceAction({ sourceId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClinicianSources((prev) => prev.filter((c) => c.id !== sourceId));
      setClinicianSource(null);
      setPlan((prev) => ({
        ...prev,
        clinicianSourceId: null,
        version: prev.version + 1,
      }));
      setMessage("Clinician source removed");
    });
  }

  const unconfirmedLabel = clinicianSource
    ? clinicianSourceUnconfirmedLabel(clinicianSource)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <AppLink href={ROUTES.rehabPlans} className="text-sm underline">
        ← Rehab plans
      </AppLink>
      <p className="rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] px-3 py-2 text-sm">
        {SAFETY_BANNER}
      </p>
      <RehabPlanEditorDetails
        plan={plan}
        clinicianSource={clinicianSource}
        unconfirmedLabel={unconfirmedLabel}
        onSaveName={saveMeta}
        disabled={pending}
      />

      <section className="rounded border bg-[var(--mt-paper)] p-4">
        <h2 className="font-bold">Clinician source</h2>
        <p className="mt-2 text-sm text-[var(--mt-ink-muted)]">
          {CLINICIAN_PROVENANCE_WARNING}
        </p>
        <label className="mt-3 block text-sm">
          Attach existing source
          <select
            className="mt-1 min-h-11 w-full border px-2"
            value={plan.clinicianSourceId ?? ""}
            disabled={pending}
            onChange={(e) => attachClinicianSource(e.target.value || null)}
          >
            <option value="">None</option>
            {clinicianSources.map((source) => (
              <option key={source.id} value={source.id}>
                {[source.clinicianName, source.clinicName, source.documentTitle]
                  .filter(Boolean)
                  .join(" · ") || source.sourceType}
                {!source.confirmedByUser ? " (unconfirmed)" : ""}
              </option>
            ))}
          </select>
        </label>
        {unconfirmedLabel ? (
          <p className="mt-2 text-sm text-[var(--mt-neon-pink)]">{unconfirmedLabel}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <PixelButton
            tone="neutral"
            disabled={pending}
            onClick={() => {
              if (clinicianSource) {
                setClinicianForm({
                  sourceType: clinicianSource.sourceType,
                  clinicianName: clinicianSource.clinicianName ?? "",
                  clinicName: clinicianSource.clinicName ?? "",
                  documentTitle: clinicianSource.documentTitle ?? "",
                  documentDate: clinicianSource.documentDate ?? "",
                  notes: clinicianSource.notes ?? "",
                  confirmedByUser: clinicianSource.confirmedByUser,
                });
              }
              setShowClinicianForm((v) => !v);
            }}
          >
            {clinicianSource ? "Edit source" : "Create source"}
          </PixelButton>
          {clinicianSource ? (
            <>
              <PixelButton
                tone="neutral"
                disabled={pending}
                onClick={() => attachClinicianSource(null)}
              >
                Detach from plan
              </PixelButton>
              <PixelButton
                tone="neutral"
                disabled={pending}
                onClick={removeClinicianSource}
              >
                Delete source
              </PixelButton>
            </>
          ) : null}
        </div>
        {showClinicianForm ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              Source type
              <select
                className="mt-1 min-h-11 w-full border px-2"
                value={clinicianForm.sourceType}
                onChange={(e) =>
                  setClinicianForm((f) => ({
                    ...f,
                    sourceType: e.target.value as RehabClinicianSourceView["sourceType"],
                  }))
                }
              >
                {REHAB_CLINICIAN_SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Clinician name
              <input
                className="mt-1 min-h-11 w-full border px-2"
                value={clinicianForm.clinicianName}
                onChange={(e) =>
                  setClinicianForm((f) => ({ ...f, clinicianName: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Clinic name
              <input
                className="mt-1 min-h-11 w-full border px-2"
                value={clinicianForm.clinicName}
                onChange={(e) =>
                  setClinicianForm((f) => ({ ...f, clinicName: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Document title
              <input
                className="mt-1 min-h-11 w-full border px-2"
                value={clinicianForm.documentTitle}
                onChange={(e) =>
                  setClinicianForm((f) => ({ ...f, documentTitle: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Document date
              <input
                type="date"
                className="mt-1 min-h-11 w-full border px-2"
                value={clinicianForm.documentDate}
                onChange={(e) =>
                  setClinicianForm((f) => ({ ...f, documentDate: e.target.value }))
                }
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Notes
              <textarea
                className="mt-1 min-h-20 w-full border px-2"
                value={clinicianForm.notes}
                onChange={(e) =>
                  setClinicianForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={clinicianForm.confirmedByUser}
                onChange={(e) =>
                  setClinicianForm((f) => ({ ...f, confirmedByUser: e.target.checked }))
                }
              />
              I confirm this matches my clinician&apos;s instructions
            </label>
            <PixelButton tone="primary" disabled={pending} onClick={saveClinicianSource}>
              Save clinician source
            </PixelButton>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <PixelButton tone="primary" onClick={addPhase} disabled={pending}>
          Add phase
        </PixelButton>
      </div>
      {plan.phases.map((phase, phaseIndex) => (
        <section key={phase.id} className="rounded border bg-[var(--mt-paper)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{phase.name}</h2>
            <MoveButtons
              label={phase.name}
              canMoveUp={phaseIndex > 0}
              canMoveDown={phaseIndex < plan.phases.length - 1}
              disabled={pending}
              onUp={() => reorderPhases(phase.id, "up")}
              onDown={() => reorderPhases(phase.id, "down")}
            />
          </div>
          <PixelButton
            tone="neutral"
            className="mt-2"
            onClick={() => duplicatePhase(phase.id)}
            disabled={pending}
          >
            Duplicate phase
          </PixelButton>
          <PixelButton
            tone="neutral"
            className="mt-2 ml-2"
            onClick={() => addDay(phase.id)}
            disabled={pending}
          >
            Add day
          </PixelButton>
          <ul className="mt-2 space-y-3 text-sm">
            {phase.days.map((day, dayIndex) => (
              <li
                key={day.id}
                className="rounded border border-[var(--mt-ink-muted)]/30 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => {
                      setSelectedDayId(day.id);
                      setSelectedExerciseId(day.exercises[0]?.id ?? "");
                    }}
                  >
                    {day.name}
                  </button>
                  <MoveButtons
                    label={day.name}
                    canMoveUp={dayIndex > 0}
                    canMoveDown={dayIndex < phase.days.length - 1}
                    disabled={pending}
                    onUp={() => reorderDays(phase.id, day.id, "up")}
                    onDown={() => reorderDays(phase.id, day.id, "down")}
                  />
                </div>
                <PixelButton
                  tone="neutral"
                  className="mt-2"
                  onClick={() => duplicateDay(day.id)}
                  disabled={pending}
                >
                  Duplicate day
                </PixelButton>
                <ul className="mt-2 space-y-2 pl-2">
                  {day.exercises.map((exercise, exerciseIndex) => (
                    <li key={exercise.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            setSelectedDayId(day.id);
                            setSelectedExerciseId(exercise.id);
                          }}
                        >
                          {exercise.exerciseName}
                        </button>
                        <span>
                          {SIDE_LABELS[exercise.side]}
                          {exercise.prescriptions.length
                            ? ` · ${exercise.prescriptions.length} rx`
                            : ""}
                        </span>
                        <MoveButtons
                          label={exercise.exerciseName}
                          canMoveUp={exerciseIndex > 0}
                          canMoveDown={exerciseIndex < day.exercises.length - 1}
                          disabled={pending}
                          onUp={() => reorderExercises(day.id, exercise.id, "up")}
                          onDown={() => reorderExercises(day.id, exercise.id, "down")}
                        />
                      </div>
                      {exercise.prescriptions.length > 0 ? (
                        <ul className="mt-1 space-y-1 pl-4">
                          {exercise.prescriptions.map((rx, rxIndex) => (
                            <li key={rx.id} className="flex flex-wrap items-center gap-2">
                              <span>
                                Set {rx.setIndex}
                                {rx.targetReps != null ? ` · ${rx.targetReps} reps` : ""}
                              </span>
                              <MoveButtons
                                label={`set ${rx.setIndex}`}
                                canMoveUp={rxIndex > 0}
                                canMoveDown={rxIndex < exercise.prescriptions.length - 1}
                                disabled={pending}
                                onUp={() =>
                                  reorderPrescriptions(exercise.id, rx.id, "up")
                                }
                                onDown={() =>
                                  reorderPrescriptions(exercise.id, rx.id, "down")
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded border bg-[var(--mt-paper)] p-4">
        <h2 className="font-bold">Add exercise from catalog</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-sm">
            Day
            <select
              className="mt-1 min-h-11 w-full border px-2"
              value={effectiveDayId}
              onChange={(e) => {
                setSelectedDayId(e.target.value);
                const day = allDays.find((d) => d.id === e.target.value);
                setSelectedExerciseId(day?.exercises[0]?.id ?? "");
              }}
            >
              {plan.phases.flatMap((phase) =>
                phase.days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {phase.name} · {day.name}
                  </option>
                )),
              )}
            </select>
          </label>
          <label className="block text-sm">
            Side
            <select
              className="mt-1 min-h-11 w-full border px-2"
              value={exerciseSide}
              onChange={(e) => setExerciseSide(e.target.value as RehabSide)}
            >
              {REHAB_SIDES.map((side) => (
                <option key={side} value={side}>
                  {SIDE_LABELS[side]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Catalog exercise
            <select
              className="mt-1 min-h-11 w-full border px-2"
              value={catalogExerciseId}
              onChange={(e) => setCatalogExerciseId(e.target.value)}
            >
              <option value="">Select exercise…</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <PixelButton
          tone="primary"
          className="mt-3"
          onClick={addExercise}
          disabled={pending}
        >
          Add exercise
        </PixelButton>
      </section>

      {selectedDay && effectiveExerciseId ? (
        <section className="rounded border bg-[var(--mt-paper)] p-4">
          <h2 className="font-bold">Add prescription</h2>
          <p className="mt-1 text-sm text-[var(--mt-ink-muted)]">
            {selectedExercise?.exerciseName}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              Target reps
              <input
                className="mt-1 min-h-11 w-full border px-2"
                inputMode="numeric"
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Duration (sec)
              <input
                className="mt-1 min-h-11 w-full border px-2"
                inputMode="numeric"
                value={targetDuration}
                onChange={(e) => setTargetDuration(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Hold (sec)
              <input
                className="mt-1 min-h-11 w-full border px-2"
                inputMode="numeric"
                value={targetHold}
                onChange={(e) => setTargetHold(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Pain limit (0–10)
              <input
                className="mt-1 min-h-11 w-full border px-2"
                inputMode="numeric"
                value={painLimit}
                onChange={(e) => setPainLimit(e.target.value)}
              />
            </label>
          </div>
          <PixelButton
            tone="primary"
            className="mt-3"
            onClick={addPrescription}
            disabled={pending}
          >
            Add prescription
          </PixelButton>
        </section>
      ) : null}

      <section className="rounded border bg-[var(--mt-paper)] p-4">
        <h2 className="font-bold">Restrictions</h2>
        <ul className="mt-3 space-y-2">
          {plan.restrictions.map((restriction, index) => (
            <li
              key={restriction.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border p-2"
            >
              <span className="text-sm">{restriction.valueText}</span>
              <MoveButtons
                label="restriction"
                canMoveUp={index > 0}
                canMoveDown={index < plan.restrictions.length - 1}
                disabled={pending}
                onUp={() => reorderRestrictions(restriction.id, "up")}
                onDown={() => reorderRestrictions(restriction.id, "down")}
              />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            className="min-h-11 flex-1 border px-2"
            value={restrictionText}
            onChange={(e) => setRestrictionText(e.target.value)}
            placeholder="Clinician wording"
            aria-label="Restriction wording"
          />
          <PixelButton tone="neutral" onClick={addRestriction} disabled={pending}>
            Add
          </PixelButton>
        </div>
      </section>

      {message ? <p className="text-sm">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-[var(--mt-neon-pink)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
