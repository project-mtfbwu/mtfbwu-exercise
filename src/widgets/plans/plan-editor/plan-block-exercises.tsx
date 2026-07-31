"use client";

import { useMemo, useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import type {
  ExerciseCatalogView,
  PlanBlockExerciseView,
} from "@/modules/workout/sessions/types";
import { PlanPrescriptions } from "./plan-prescriptions";
import type { PlanEditorActions } from "./types";

function ExercisePicker({
  catalog,
  pending,
  onSelect,
  onCreateCustom,
  onCancel,
}: {
  catalog: ExerciseCatalogView[];
  pending: boolean;
  onSelect: (exerciseDefinitionId: string) => void;
  onCreateCustom: () => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? catalog.filter((exercise) => exercise.name.toLowerCase().includes(q))
      : catalog;
    return pool.slice(0, 10);
  }, [catalog, query]);

  return (
    <div className="mt-2 border-2 border-dashed border-[var(--mt-ink)] bg-white p-2">
      <label className="sr-only" htmlFor="plan-exercise-search">
        Search exercise catalog
      </label>
      <input
        id="plan-exercise-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search catalog…"
        className="block min-h-11 w-full border-2 border-[var(--mt-ink)] px-2 text-sm"
      />
      {filtered.length ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {filtered.map((exercise) => (
            <li key={exercise.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{exercise.name}</span>
              <PixelButton
                tone="cyan"
                disabled={pending}
                onClick={() => onSelect(exercise.id)}
              >
                Choose
              </PixelButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs">No catalog matches.</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        <PixelButton tone="neutral" disabled={pending} onClick={onCreateCustom}>
          + Create custom exercise
        </PixelButton>
        <PixelButton tone="neutral" disabled={pending} onClick={onCancel}>
          Cancel
        </PixelButton>
      </div>
    </div>
  );
}

function BlockExerciseItem({
  blockId,
  exercise,
  index,
  count,
  catalog,
  pending,
  actions,
}: {
  blockId: string;
  exercise: PlanBlockExerciseView;
  index: number;
  count: number;
  catalog: ExerciseCatalogView[];
  pending: boolean;
  actions: PlanEditorActions;
}) {
  const [substituting, setSubstituting] = useState(false);

  function remove() {
    if (!window.confirm(`Remove ${exercise.exerciseName} from this block?`)) return;
    actions.deleteExercise(exercise.id);
  }

  return (
    <li className="border-2 border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-black uppercase">{exercise.exerciseName}</h4>
        <div className="flex flex-wrap gap-1">
          <PixelButton
            tone="neutral"
            aria-label={`Move ${exercise.exerciseName} up`}
            disabled={index === 0 || pending}
            onClick={() => actions.moveExercise(blockId, exercise.id, -1)}
          >
            Up
          </PixelButton>
          <PixelButton
            tone="neutral"
            aria-label={`Move ${exercise.exerciseName} down`}
            disabled={index === count - 1 || pending}
            onClick={() => actions.moveExercise(blockId, exercise.id, 1)}
          >
            Down
          </PixelButton>
          <PixelButton
            tone="cyan"
            disabled={pending}
            onClick={() => setSubstituting((v) => !v)}
          >
            Substitute
          </PixelButton>
          <PixelButton tone="danger" disabled={pending} onClick={remove}>
            Remove
          </PixelButton>
        </div>
      </div>
      {substituting ? (
        <ExercisePicker
          catalog={catalog}
          pending={pending}
          onSelect={(id) => {
            actions.substituteExerciseFromCatalog(exercise.id, id);
            setSubstituting(false);
          }}
          onCreateCustom={() => {
            actions.substituteWithCustomExercise(exercise.id);
            setSubstituting(false);
          }}
          onCancel={() => setSubstituting(false)}
        />
      ) : null}
      <PlanPrescriptions
        blockExerciseId={exercise.id}
        exerciseLabel={exercise.exerciseName}
        prescriptions={exercise.prescriptions}
        pending={pending}
        actions={actions}
      />
    </li>
  );
}

export function PlanBlockExercises({
  blockId,
  exercises,
  catalog,
  pending,
  actions,
}: {
  blockId: string;
  exercises: PlanBlockExerciseView[];
  catalog: ExerciseCatalogView[];
  pending: boolean;
  actions: PlanEditorActions;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase">Exercises</h4>
        <PixelButton tone="cyan" disabled={pending} onClick={() => setAdding((v) => !v)}>
          {adding ? "Close" : "Add exercise"}
        </PixelButton>
      </div>
      {adding ? (
        <ExercisePicker
          catalog={catalog}
          pending={pending}
          onSelect={(id) => {
            actions.addExerciseFromCatalog(blockId, id);
            setAdding(false);
          }}
          onCreateCustom={() => {
            actions.addCustomExercise(blockId);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
      {exercises.length === 0 ? (
        <p className="mt-2 text-xs">No exercises in this block yet.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {exercises.map((exercise, index) => (
            <BlockExerciseItem
              key={exercise.id}
              blockId={blockId}
              exercise={exercise}
              index={index}
              count={exercises.length}
              catalog={catalog}
              pending={pending}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
