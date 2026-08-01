"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  createCustomMeasurementAction,
  disableMeasurementAction,
  enableMeasurementAction,
  listMeasurementCatalogAction,
  listUserMeasurementsAction,
} from "@/modules/measurements/actions";
import type {
  MeasurementDefinitionView,
  UserMeasurementDefinitionView,
} from "@/modules/measurements/types";

export function MeasurementEnablementPanel() {
  const [catalog, setCatalog] = useState<MeasurementDefinitionView[]>([]);
  const [userDefs, setUserDefs] = useState<UserMeasurementDefinitionView[]>([]);
  const [customName, setCustomName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const [cat, defs] = await Promise.all([
      listMeasurementCatalogAction(),
      listUserMeasurementsAction(),
    ]);
    setCatalog(
      cat.filter((c) => c.stableKey !== "body_weight" && c.stableKey !== "custom"),
    );
    setUserDefs(defs);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load, startTransition]);

  const enabledIds = new Set(
    userDefs
      .filter((d) => d.enabled)
      .map((d) => d.measurementDefinitionId)
      .filter(Boolean),
  );

  function toggleCatalog(def: MeasurementDefinitionView, enable: boolean) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = enable
        ? await enableMeasurementAction({ measurementDefinitionId: def.id })
        : await disableMeasurementAction({ measurementDefinitionId: def.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      await load();
    });
  }

  function createCustom() {
    if (!customName.trim()) {
      setError("Enter a custom measurement name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCustomMeasurementAction({
        customName: customName.trim(),
        unit: "cm",
        sideMode: "not_applicable",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCustomName("");
      setMessage(result.message);
      await load();
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-[var(--mt-ink-muted)]">
        Enable catalog measurements or add a custom name. Body weight is logged
        separately.
      </p>
      {error ? (
        <p className="font-bold text-[var(--mt-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <ul className="space-y-1">
        {catalog.map((def) => {
          const on = enabledIds.has(def.id);
          return (
            <li
              key={def.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {def.displayName}
                {def.supportsSide ? " (L/R)" : ""} · {def.defaultUnit}
              </span>
              <PixelButton
                tone={on ? "danger" : "primary"}
                loading={pending}
                onClick={() => toggleCatalog(def, !on)}
              >
                {on ? "Disable" : "Enable"}
              </PixelButton>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-2 border-t-2 border-[var(--mt-ink-muted)] pt-3">
        <div className="min-w-48 flex-1">
          <label className="mb-1 block font-bold" htmlFor="custom-meas-name">
            Custom measurement
          </label>
          <input
            id="custom-meas-name"
            className="min-h-9 w-full border-2 border-[var(--mt-ink)] px-2"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Shoulder flexion"
          />
        </div>
        <PixelButton tone="cyan" loading={pending} onClick={createCustom}>
          Add custom
        </PixelButton>
      </div>
      {userDefs.filter((d) => d.customName).length > 0 ? (
        <div>
          <h4 className="font-bold">Your custom measurements</h4>
          <ul className="text-[var(--mt-ink-muted)]">
            {userDefs
              .filter((d) => d.customName)
              .map((d) => (
                <li key={d.id}>{d.customName}</li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
