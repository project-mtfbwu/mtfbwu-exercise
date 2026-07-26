"use client";

import { useState } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import type { DemoBoardState } from "../demo-state";

const PRESETS = [5, 10, 12, 20] as const;
const TYPES = ["breath", "body scan", "guided", "silent"] as const;

export type MeditationFocusProps = {
  titleId: string;
  initial: DemoBoardState["meditation"];
  onSave: (next: DemoBoardState["meditation"]) => void;
  onCancel: () => void;
};

export function MeditationFocus({
  titleId,
  initial,
  onSave,
  onCancel,
}: MeditationFocusProps) {
  const [minutes, setMinutes] = useState(initial.minutes);
  const [type, setType] = useState(initial.type);
  const [running, setRunning] = useState(initial.running);
  const [saving, setSaving] = useState(false);

  return (
    <FocusPanel
      title="Meditation (demo)"
      titleId={titleId}
      accent="purple"
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            loading={saving}
            onClick={() => {
              setSaving(true);
              onSave({
                minutes,
                goalMinutes: initial.goalMinutes,
                type,
                running: false,
                savedLabel: `${minutes} / ${initial.goalMinutes} min (demo)`,
              });
            }}
          >
            Complete
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel} disabled={saving}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <p className="mb-2 text-sm font-bold" aria-live="polite">
        Timer placeholder: {running ? "Running (demo)" : "Paused (demo)"} · {minutes} min
      </p>
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Duration presets"
      >
        {PRESETS.map((preset) => (
          <PixelButton
            key={preset}
            tone={minutes === preset ? "purple" : "neutral"}
            onClick={() => setMinutes(preset)}
            aria-pressed={minutes === preset}
          >
            {preset} min
          </PixelButton>
        ))}
      </div>
      <label className="mb-1 block text-sm font-bold" htmlFor="meditation-type">
        Meditation type (demo)
      </label>
      <select
        id="meditation-type"
        className="mb-4 min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <PixelButton tone="cyan" onClick={() => setRunning((r) => !r)}>
        {running ? "Pause" : "Start"} demo
      </PixelButton>
    </FocusPanel>
  );
}
