"use client";

import { useState } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  workoutStatusLabel,
  type DemoBoardState,
  type WorkoutExercise,
} from "../demo-state";

export type WorkoutFocusProps = {
  titleId: string;
  initial: DemoBoardState["workout"];
  onSave: (next: DemoBoardState["workout"]) => void;
  onCancel: () => void;
};

export function WorkoutFocus({ titleId, initial, onSave, onCancel }: WorkoutFocusProps) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() =>
    structuredClone(initial.exercises),
  );
  const [saving, setSaving] = useState(false);

  function toggleDone(exerciseId: string, setId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)),
            },
      ),
    );
  }

  function updateField(
    exerciseId: string,
    setId: string,
    field: "reps" | "weight",
    value: number,
  ) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
            },
      ),
    );
  }

  return (
    <FocusPanel
      title="Workout (demo)"
      titleId={titleId}
      accent="pink"
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            loading={saving}
            onClick={() => {
              setSaving(true);
              onSave({
                exercises,
                savedLabel: workoutStatusLabel(exercises),
              });
            }}
          >
            Save session
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel} disabled={saving}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <ul className="space-y-4">
        {exercises.map((ex) => (
          <li key={ex.id} className="border-2 border-[var(--mt-ink)] bg-white/80 p-3">
            <h3 className="mb-2 font-black uppercase">{ex.name}</h3>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Demo sets for {ex.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Set</th>
                  <th scope="col">Reps</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Done</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((set, index) => (
                  <tr key={set.id} className="border-t border-[var(--mt-ink)]/30">
                    <td className="py-2">{index + 1}</td>
                    <td>
                      <input
                        className="w-16 border-2 border-[var(--mt-ink)] px-1 py-1"
                        type="number"
                        aria-label={`Reps for ${ex.name} set ${index + 1}`}
                        value={set.reps}
                        onChange={(e) =>
                          updateField(ex.id, set.id, "reps", Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="w-20 border-2 border-[var(--mt-ink)] px-1 py-1"
                        type="number"
                        aria-label={`Weight for ${ex.name} set ${index + 1}`}
                        value={set.weight}
                        onChange={(e) =>
                          updateField(
                            ex.id,
                            set.id,
                            "weight",
                            Number(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="h-6 w-6"
                        checked={set.done}
                        onChange={() => toggleDone(ex.id, set.id)}
                        aria-label={`Mark ${ex.name} set ${index + 1} complete`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </li>
        ))}
      </ul>
    </FocusPanel>
  );
}
