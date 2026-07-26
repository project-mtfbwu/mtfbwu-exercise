"use client";

import { useState } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { ProgressMeter } from "@/shared/ui/flat-lay/progress-meter";
import type { DemoBoardState } from "../demo-state";

export type WaterFocusProps = {
  titleId: string;
  initial: DemoBoardState["water"];
  onSave: (next: DemoBoardState["water"]) => void;
  onCancel: () => void;
};

export function WaterFocus({ titleId, initial, onSave, onCancel }: WaterFocusProps) {
  const [ml, setMl] = useState(initial.ml);
  const [custom, setCustom] = useState("100");
  const [saving, setSaving] = useState(false);
  const liters = ml / 1000;
  const goalLiters = initial.goalMl / 1000;

  return (
    <FocusPanel
      title="Water (demo)"
      titleId={titleId}
      accent="cyan"
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            loading={saving}
            onClick={() => {
              setSaving(true);
              onSave({
                ml,
                goalMl: initial.goalMl,
                savedLabel: `${liters.toFixed(2)} / ${goalLiters.toFixed(1)} L (demo)`,
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
      <ProgressMeter
        label="Demo hydration"
        value={Number(liters.toFixed(2))}
        max={goalLiters}
        unit="L"
        tone="cyan"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <PixelButton tone="cyan" onClick={() => setMl((v) => v + 250)}>
          +250 ml
        </PixelButton>
        <PixelButton tone="cyan" onClick={() => setMl((v) => v + 500)}>
          +500 ml
        </PixelButton>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block text-sm font-bold" htmlFor="water-custom">
          Custom demo amount (ml)
        </label>
        <input
          id="water-custom"
          className="w-28 border-2 border-[var(--mt-ink)] px-2 py-2"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <PixelButton
          tone="neutral"
          onClick={() => {
            const n = Number(custom);
            if (!Number.isFinite(n) || n <= 0) return;
            setMl((v) => v + n);
          }}
        >
          Add custom
        </PixelButton>
      </div>
    </FocusPanel>
  );
}
