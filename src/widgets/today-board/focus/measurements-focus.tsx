"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import {
  listRecentWeightEntriesAction,
  listUserMeasurementsAction,
  saveMeasurementEntryAction,
  saveWeightEntryAction,
} from "@/modules/measurements/actions";
import type {
  UserMeasurementDefinitionView,
  WeightEntryView,
} from "@/modules/measurements/types";
import type { ProgressDaySummary } from "@/modules/progress/load-progress-day";
import { NEUTRAL_CHANGE_LANGUAGE } from "@/modules/progress-photos/safety";
import { useOnlineStore } from "@/shared/offline/online-store";
import {
  buildWeightUpsertWrites,
  queueProgressMutation,
  PROGRESS_ENTITY,
  PHOTO_SEQUENCE,
} from "@/shared/offline/progress-outbox";
import { normalizeWeightToKg } from "@/modules/measurements/units";
import {
  buildMeasurementValuesFromForm,
  hasAnyMeasurementInput,
  measurementValueKey,
} from "@/widgets/progress/measurement-form-helpers";

export type MeasurementsFocusProps = {
  titleId: string;
  userId: string;
  localDate: string;
  timezone: string;
  unitsSystem: "metric" | "imperial";
  progressDaySummary?: ProgressDaySummary;
  onSaved: (summary: string) => void;
  onCancel: () => void;
};

export function MeasurementsFocus({
  titleId,
  userId,
  localDate,
  timezone,
  unitsSystem,
  progressDaySummary,
  onSaved,
  onCancel,
}: MeasurementsFocusProps) {
  const defaultUnit = unitsSystem === "imperial" ? "lb" : "kg";
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">(defaultUnit);
  const [recentWeights, setRecentWeights] = useState<WeightEntryView[]>([]);
  const [measurements, setMeasurements] = useState<UserMeasurementDefinitionView[]>([]);
  const [measValues, setMeasValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnlineStore((s) => s.status) !== "offline";

  const loadData = useCallback(async () => {
    const [weights, defs] = await Promise.all([
      listRecentWeightEntriesAction(5),
      listUserMeasurementsAction(),
    ]);
    setRecentWeights(weights);
    setMeasurements(defs.filter((d) => d.enabled && d.stableKey !== "body_weight"));
    if (progressDaySummary?.weightEntry) {
      setWeightValue(String(progressDaySummary.weightEntry.normalizedKg));
      setWeightUnit("kg");
    }
  }, [progressDaySummary]);

  useEffect(() => {
    startTransition(() => {
      void loadData();
    });
  }, [loadData, startTransition]);

  function saveWeight() {
    const parsed = Number(weightValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid weight.");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (!online) {
        const entryId = crypto.randomUUID();
        let normalizedKg: number;
        try {
          normalizedKg = normalizeWeightToKg(parsed, weightUnit);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Invalid weight.");
          return;
        }
        await queueProgressMutation({
          userId,
          entityType: PROGRESS_ENTITY.weight,
          entityId: entryId,
          payload: {
            kind: "progress",
            entity: PROGRESS_ENTITY.weight,
            sequence: PHOTO_SEQUENCE.set,
            writes: buildWeightUpsertWrites({
              entryId,
              userId,
              localDate,
              timezone,
              weightValue: parsed,
              weightUnit,
              normalizedKg,
            }),
          },
          weightDraft: { entryId, payload: { weightValue: parsed, weightUnit } },
        });
        onSaved(`${normalizedKg} kg queued offline`);
        return;
      }
      const result = await saveWeightEntryAction({
        localDate,
        timezone,
        weightValue: parsed,
        weightUnit,
        note: null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(`${parsed} ${weightUnit} saved`);
    });
  }

  function saveMeasurements() {
    if (!hasAnyMeasurementInput(measurements, measValues)) {
      setError("Enter at least one measurement value.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const values = buildMeasurementValuesFromForm(measurements, measValues);
      const result = await saveMeasurementEntryAction({
        localDate,
        timezone,
        values,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(`${values.length} measurement(s) saved`);
      setMeasValues({});
    });
  }

  return (
    <FocusPanel
      title="Measurements"
      titleId={titleId}
      accent="orange"
      onClose={onCancel}
      footer={
        <>
          <PixelButton tone="primary" loading={pending} onClick={saveWeight}>
            Save weight
          </PixelButton>
          <PixelButton tone="cyan" loading={pending} onClick={saveMeasurements}>
            Save measurements
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel} disabled={pending}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <p className="mb-3 text-xs text-[var(--mt-ink-muted)]">{NEUTRAL_CHANGE_LANGUAGE}</p>
      {error ? (
        <p className="mb-2 text-sm font-bold text-[var(--mt-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="meas-weight">
            Weight
          </label>
          <input
            id="meas-weight"
            type="number"
            min={0}
            step="0.1"
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={weightValue}
            onChange={(e) => setWeightValue(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="meas-unit">
            Unit
          </label>
          <select
            id="meas-unit"
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={weightUnit}
            onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="meas-date">
            Date
          </label>
          <input
            id="meas-date"
            type="date"
            readOnly
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={localDate}
          />
        </div>
      </div>

      {measurements.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-bold">Enabled measurements</h3>
          {measurements.map((m) =>
            m.sideMode === "left_right" ? (
              <div key={m.id} className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm" htmlFor={`meas-${m.id}-left`}>
                    {m.displayName} — Left ({m.unit})
                  </label>
                  <input
                    id={`meas-${m.id}-left`}
                    type="number"
                    min={0}
                    step="0.1"
                    className="min-h-9 w-full border-2 border-[var(--mt-ink)] px-2"
                    value={measValues[measurementValueKey(m.id, "left")] ?? ""}
                    onChange={(e) =>
                      setMeasValues((prev) => ({
                        ...prev,
                        [measurementValueKey(m.id, "left")]: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm" htmlFor={`meas-${m.id}-right`}>
                    {m.displayName} — Right ({m.unit})
                  </label>
                  <input
                    id={`meas-${m.id}-right`}
                    type="number"
                    min={0}
                    step="0.1"
                    className="min-h-9 w-full border-2 border-[var(--mt-ink)] px-2"
                    value={measValues[measurementValueKey(m.id, "right")] ?? ""}
                    onChange={(e) =>
                      setMeasValues((prev) => ({
                        ...prev,
                        [measurementValueKey(m.id, "right")]: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex items-center gap-2">
                <label className="min-w-28 text-sm" htmlFor={`meas-${m.id}-single`}>
                  {m.displayName} ({m.unit})
                </label>
                <input
                  id={`meas-${m.id}-single`}
                  type="number"
                  min={0}
                  step="0.1"
                  className="min-h-9 flex-1 border-2 border-[var(--mt-ink)] px-2"
                  value={measValues[measurementValueKey(m.id, "single")] ?? ""}
                  onChange={(e) =>
                    setMeasValues((prev) => ({
                      ...prev,
                      [measurementValueKey(m.id, "single")]: e.target.value,
                    }))
                  }
                />
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--mt-ink-muted)]">
          Enable measurements on the <AppLink href={ROUTES.progress}>Progress</AppLink>{" "}
          page.
        </p>
      )}

      {recentWeights.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-bold">Recent weight</h3>
          <ul className="text-sm text-[var(--mt-ink-muted)]">
            {recentWeights.slice(0, 3).map((w) => (
              <li key={w.id}>
                {w.localDate}: {w.weightValue} {w.weightUnit}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </FocusPanel>
  );
}
