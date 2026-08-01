"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  listUserMeasurementsAction,
  saveMeasurementEntryAction,
} from "@/modules/measurements/actions";
import type { UserMeasurementDefinitionView } from "@/modules/measurements/types";
import {
  buildMeasurementValuesFromForm,
  hasAnyMeasurementInput,
  measurementValueKey,
} from "@/widgets/progress/measurement-form-helpers";

export type ProgressMeasurementFormProps = {
  localDate: string;
  timezone: string;
};

export function ProgressMeasurementForm({
  localDate,
  timezone,
}: ProgressMeasurementFormProps) {
  const [definitions, setDefinitions] = useState<UserMeasurementDefinitionView[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const defs = await listUserMeasurementsAction();
    setDefinitions(defs.filter((d) => d.enabled && d.stableKey !== "body_weight"));
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load, startTransition]);

  function save() {
    if (!hasAnyMeasurementInput(definitions, values)) {
      setError("Enter at least one measurement value.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const built = buildMeasurementValuesFromForm(definitions, values);
      const result = await saveMeasurementEntryAction({
        localDate,
        timezone,
        values: built,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      setValues({});
    });
  }

  if (!definitions.length) {
    return (
      <p className="text-sm text-[var(--mt-ink-muted)]">
        Enable measurements above before logging values.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {error ? (
        <p className="font-bold text-[var(--mt-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {definitions.map((def) =>
        def.sideMode === "left_right" ? (
          <div key={def.id} className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold" htmlFor={`pm-${def.id}-left`}>
                {def.displayName} — Left ({def.unit})
              </label>
              <input
                id={`pm-${def.id}-left`}
                type="number"
                min={0}
                step="0.1"
                className="min-h-9 w-full border-2 border-[var(--mt-ink)] px-2"
                value={values[measurementValueKey(def.id, "left")] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [measurementValueKey(def.id, "left")]: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block font-bold" htmlFor={`pm-${def.id}-right`}>
                {def.displayName} — Right ({def.unit})
              </label>
              <input
                id={`pm-${def.id}-right`}
                type="number"
                min={0}
                step="0.1"
                className="min-h-9 w-full border-2 border-[var(--mt-ink)] px-2"
                value={values[measurementValueKey(def.id, "right")] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [measurementValueKey(def.id, "right")]: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        ) : (
          <div key={def.id}>
            <label className="mb-1 block font-bold" htmlFor={`pm-${def.id}-single`}>
              {def.displayName} ({def.unit})
            </label>
            <input
              id={`pm-${def.id}-single`}
              type="number"
              min={0}
              step="0.1"
              className="min-h-9 w-full border-2 border-[var(--mt-ink)] px-2"
              value={values[measurementValueKey(def.id, "single")] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [measurementValueKey(def.id, "single")]: e.target.value,
                }))
              }
            />
          </div>
        ),
      )}
      <PixelButton tone="primary" loading={pending} onClick={save}>
        Save measurements
      </PixelButton>
    </div>
  );
}
