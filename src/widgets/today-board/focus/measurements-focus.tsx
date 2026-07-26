"use client";

import { useState } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import type { DemoBoardState } from "../demo-state";

export type MeasurementsFocusProps = {
  titleId: string;
  initial: DemoBoardState["measurements"];
  onSave: (next: DemoBoardState["measurements"]) => void;
  onCancel: () => void;
};

export function MeasurementsFocus({
  titleId,
  initial,
  onSave,
  onCancel,
}: MeasurementsFocusProps) {
  const [weightKg, setWeightKg] = useState(initial.weightKg);
  const [waistCm, setWaistCm] = useState(initial.waistCm);
  const [date, setDate] = useState(initial.date);
  const [saving, setSaving] = useState(false);

  return (
    <FocusPanel
      title="Measurements (demo)"
      titleId={titleId}
      accent="orange"
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            loading={saving}
            onClick={() => {
              setSaving(true);
              onSave({
                weightKg,
                waistCm,
                date,
                savedLabel: `${weightKg} kg · ${waistCm} cm (demo)`,
              });
            }}
          >
            Save
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel} disabled={saving}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="meas-weight">
            Weight (kg, demo)
          </label>
          <input
            id="meas-weight"
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="meas-waist">
            Waist (cm, demo)
          </label>
          <input
            id="meas-waist"
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={waistCm}
            onChange={(e) => setWaistCm(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="meas-date">
            Date (demo)
          </label>
          <input
            id="meas-date"
            type="date"
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
    </FocusPanel>
  );
}
