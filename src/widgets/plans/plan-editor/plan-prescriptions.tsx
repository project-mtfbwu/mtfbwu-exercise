"use client";

import { useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import type {
  SetPrescriptionView,
  WorkoutSetRole,
} from "@/modules/workout/sessions/types";
import { WORKOUT_SET_ROLES } from "@/modules/workout/sessions/types";
import {
  COMPLETION_RULE_SUGGESTIONS,
  SET_ROLE_LABELS,
  parseOptionalNumber,
} from "./constants";
import type { PlanEditorActions, PrescriptionPatch } from "./types";

type Draft = {
  setRole: WorkoutSetRole;
  targetRepsMin: string;
  targetRepsMax: string;
  targetWeightKg: string;
  targetDurationSeconds: string;
  targetDistanceMeters: string;
  restSeconds: string;
  targetRpe: string;
  targetRir: string;
  completionRule: string;
  tempoEccentricSeconds: string;
  tempoPauseBottomSeconds: string;
  tempoConcentricSeconds: string;
  tempoPauseTopSeconds: string;
  notes: string;
};

function toDraft(p: SetPrescriptionView): Draft {
  return {
    setRole: p.setRole,
    targetRepsMin: p.targetRepsMin != null ? String(p.targetRepsMin) : "",
    targetRepsMax: p.targetRepsMax != null ? String(p.targetRepsMax) : "",
    targetWeightKg: p.targetWeightKg != null ? String(p.targetWeightKg) : "",
    targetDurationSeconds:
      p.targetDurationSeconds != null ? String(p.targetDurationSeconds) : "",
    targetDistanceMeters:
      p.targetDistanceMeters != null ? String(p.targetDistanceMeters) : "",
    restSeconds: p.restSeconds != null ? String(p.restSeconds) : "",
    targetRpe: p.targetRpe != null ? String(p.targetRpe) : "",
    targetRir: p.targetRir != null ? String(p.targetRir) : "",
    completionRule: p.completionRule ?? "",
    tempoEccentricSeconds:
      p.tempoEccentricSeconds != null ? String(p.tempoEccentricSeconds) : "",
    tempoPauseBottomSeconds:
      p.tempoPauseBottomSeconds != null ? String(p.tempoPauseBottomSeconds) : "",
    tempoConcentricSeconds:
      p.tempoConcentricSeconds != null ? String(p.tempoConcentricSeconds) : "",
    tempoPauseTopSeconds:
      p.tempoPauseTopSeconds != null ? String(p.tempoPauseTopSeconds) : "",
    notes: p.notes ?? "",
  };
}

function draftEquals(a: Draft, b: Draft): boolean {
  return (Object.keys(a) as (keyof Draft)[]).every((key) => a[key] === b[key]);
}

function NumberField({
  id,
  label,
  value,
  width = "w-16",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  width?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-[10px] font-bold uppercase" htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 block min-h-11 ${width} border-2 border-[var(--mt-ink)] px-1 text-sm font-normal normal-case`}
      />
    </label>
  );
}

function PrescriptionRow({
  blockExerciseId,
  prescription,
  index,
  count,
  exerciseLabel,
  pending,
  actions,
}: {
  blockExerciseId: string;
  prescription: SetPrescriptionView;
  index: number;
  count: number;
  exerciseLabel: string;
  pending: boolean;
  actions: PlanEditorActions;
}) {
  const [draft, setDraft] = useState(() => toDraft(prescription));

  const dirty = !draftEquals(draft, toDraft(prescription));

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function save() {
    const update: PrescriptionPatch = {
      setRole: draft.setRole,
      completionRule: draft.completionRule.trim() || undefined,
      targetRepsMin: parseOptionalNumber(draft.targetRepsMin),
      targetRepsMax: parseOptionalNumber(draft.targetRepsMax),
      targetWeightKg: parseOptionalNumber(draft.targetWeightKg),
      targetDurationSeconds: parseOptionalNumber(draft.targetDurationSeconds),
      targetDistanceMeters: parseOptionalNumber(draft.targetDistanceMeters),
      restSeconds: parseOptionalNumber(draft.restSeconds),
      targetRpe: parseOptionalNumber(draft.targetRpe),
      targetRir: parseOptionalNumber(draft.targetRir),
      tempoEccentricSeconds: parseOptionalNumber(draft.tempoEccentricSeconds),
      tempoPauseBottomSeconds: parseOptionalNumber(draft.tempoPauseBottomSeconds),
      tempoConcentricSeconds: parseOptionalNumber(draft.tempoConcentricSeconds),
      tempoPauseTopSeconds: parseOptionalNumber(draft.tempoPauseTopSeconds),
      notes: draft.notes.trim() || undefined,
    };
    actions.updatePrescription(prescription.id, update);
  }

  function remove() {
    if (!window.confirm(`Delete set ${prescription.setIndex} for ${exerciseLabel}?`))
      return;
    actions.deletePrescription(prescription.id);
  }

  const idBase = `prescription-${prescription.id}`;

  return (
    <li className="border-2 border-[var(--mt-ink)] bg-white/70 p-2">
      <div className="flex flex-wrap items-end gap-2">
        <span className="mt-1 min-h-11 content-center text-xs font-black" aria-hidden>
          #{prescription.setIndex}
        </span>
        <label className="text-[10px] font-bold uppercase" htmlFor={`${idBase}-role`}>
          Role
          <select
            id={`${idBase}-role`}
            value={draft.setRole}
            onChange={(event) => patch("setRole", event.target.value as WorkoutSetRole)}
            className="mt-1 block min-h-11 border-2 border-[var(--mt-ink)] bg-white px-1 text-sm font-normal normal-case"
          >
            {WORKOUT_SET_ROLES.map((role) => (
              <option key={role} value={role}>
                {SET_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <NumberField
          id={`${idBase}-reps-min`}
          label="Reps min"
          value={draft.targetRepsMin}
          onChange={(v) => patch("targetRepsMin", v)}
        />
        <NumberField
          id={`${idBase}-reps-max`}
          label="Reps max"
          value={draft.targetRepsMax}
          onChange={(v) => patch("targetRepsMax", v)}
        />
        <NumberField
          id={`${idBase}-load`}
          label="Load kg"
          value={draft.targetWeightKg}
          onChange={(v) => patch("targetWeightKg", v)}
        />
        <NumberField
          id={`${idBase}-duration`}
          label="Duration s"
          value={draft.targetDurationSeconds}
          onChange={(v) => patch("targetDurationSeconds", v)}
        />
        <NumberField
          id={`${idBase}-distance`}
          label="Distance m"
          value={draft.targetDistanceMeters}
          onChange={(v) => patch("targetDistanceMeters", v)}
        />
        <NumberField
          id={`${idBase}-rest`}
          label="Rest s"
          value={draft.restSeconds}
          onChange={(v) => patch("restSeconds", v)}
        />
        <NumberField
          id={`${idBase}-rpe`}
          label="RPE"
          value={draft.targetRpe}
          width="w-14"
          onChange={(v) => patch("targetRpe", v)}
        />
        <NumberField
          id={`${idBase}-rir`}
          label="RIR"
          value={draft.targetRir}
          width="w-14"
          onChange={(v) => patch("targetRir", v)}
        />
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-bold select-none">
          Tempo, completion rule &amp; notes
        </summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <NumberField
            id={`${idBase}-tempo-ecc`}
            label="Eccentric s"
            value={draft.tempoEccentricSeconds}
            width="w-14"
            onChange={(v) => patch("tempoEccentricSeconds", v)}
          />
          <NumberField
            id={`${idBase}-tempo-pause-bottom`}
            label="Pause bottom s"
            value={draft.tempoPauseBottomSeconds}
            width="w-14"
            onChange={(v) => patch("tempoPauseBottomSeconds", v)}
          />
          <NumberField
            id={`${idBase}-tempo-con`}
            label="Concentric s"
            value={draft.tempoConcentricSeconds}
            width="w-14"
            onChange={(v) => patch("tempoConcentricSeconds", v)}
          />
          <NumberField
            id={`${idBase}-tempo-pause-top`}
            label="Pause top s"
            value={draft.tempoPauseTopSeconds}
            width="w-14"
            onChange={(v) => patch("tempoPauseTopSeconds", v)}
          />
          <label
            className="text-[10px] font-bold uppercase"
            htmlFor={`${idBase}-completion`}
          >
            Completion rule
            <input
              id={`${idBase}-completion`}
              list="completion-rule-suggestions"
              value={draft.completionRule}
              onChange={(event) => patch("completionRule", event.target.value)}
              className="mt-1 block min-h-11 w-32 border-2 border-[var(--mt-ink)] px-1 text-sm font-normal normal-case"
            />
          </label>
          <label className="text-[10px] font-bold uppercase" htmlFor={`${idBase}-notes`}>
            Notes
            <input
              id={`${idBase}-notes`}
              value={draft.notes}
              maxLength={2000}
              onChange={(event) => patch("notes", event.target.value)}
              className="mt-1 block min-h-11 w-40 border-2 border-[var(--mt-ink)] px-1 text-sm font-normal normal-case"
            />
          </label>
        </div>
      </details>
      <div className="mt-2 flex flex-wrap gap-1">
        <PixelButton tone="primary" disabled={!dirty || pending} onClick={save}>
          Save set
        </PixelButton>
        <PixelButton
          tone="neutral"
          aria-label={`Move set ${prescription.setIndex} up for ${exerciseLabel}`}
          disabled={index === 0 || pending}
          onClick={() => actions.movePrescription(blockExerciseId, prescription.id, -1)}
        >
          Up
        </PixelButton>
        <PixelButton
          tone="neutral"
          aria-label={`Move set ${prescription.setIndex} down for ${exerciseLabel}`}
          disabled={index === count - 1 || pending}
          onClick={() => actions.movePrescription(blockExerciseId, prescription.id, 1)}
        >
          Down
        </PixelButton>
        <PixelButton
          tone="cyan"
          disabled={pending}
          onClick={() => actions.duplicatePrescription(prescription.id)}
        >
          Duplicate
        </PixelButton>
        <PixelButton tone="danger" disabled={pending} onClick={remove}>
          Delete
        </PixelButton>
      </div>
    </li>
  );
}

export function PlanPrescriptions({
  blockExerciseId,
  exerciseLabel,
  prescriptions,
  pending,
  actions,
}: {
  blockExerciseId: string;
  exerciseLabel: string;
  prescriptions: SetPrescriptionView[];
  pending: boolean;
  actions: PlanEditorActions;
}) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-xs font-black uppercase">Sets</h5>
        <PixelButton
          tone="cyan"
          disabled={pending}
          onClick={() => actions.addPrescription(blockExerciseId, "working")}
        >
          Add set
        </PixelButton>
      </div>
      {prescriptions.length === 0 ? (
        <p className="mt-1 text-xs">No sets prescribed yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {prescriptions.map((prescription, index) => (
            <PrescriptionRow
              key={prescription.id}
              blockExerciseId={blockExerciseId}
              prescription={prescription}
              index={index}
              count={prescriptions.length}
              exerciseLabel={exerciseLabel}
              pending={pending}
              actions={actions}
            />
          ))}
        </ul>
      )}
      <datalist id="completion-rule-suggestions">
        {COMPLETION_RULE_SUGGESTIONS.map((rule) => (
          <option key={rule} value={rule} />
        ))}
      </datalist>
    </div>
  );
}
