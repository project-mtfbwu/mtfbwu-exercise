"use client";

import { useState } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import type { DemoBoardState } from "../demo-state";

export type ProfileFocusProps = {
  titleId: string;
  initial: DemoBoardState["profile"];
  onSave: (next: DemoBoardState["profile"]) => void;
  onCancel: () => void;
};

export function ProfileFocus({ titleId, initial, onSave, onCancel }: ProfileFocusProps) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [goal, setGoal] = useState(initial.goal);
  const [saving, setSaving] = useState(false);

  return (
    <FocusPanel
      title="Profile (demo)"
      titleId={titleId}
      accent="blue"
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            loading={saving}
            onClick={() => {
              setSaving(true);
              onSave({
                displayName,
                goal,
                savedLabel: `${displayName} · ${goal}`,
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
      <div
        className="mb-4 flex h-24 w-24 items-center justify-center border-2 border-[var(--mt-ink)] bg-[var(--mt-window-chrome)] text-xs font-bold"
        aria-hidden
      >
        Avatar
      </div>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="profile-name">
            Display name (demo)
          </label>
          <input
            id="profile-name"
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="profile-goal">
            Current goal (demo)
          </label>
          <input
            id="profile-goal"
            className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>
      </div>
    </FocusPanel>
  );
}
