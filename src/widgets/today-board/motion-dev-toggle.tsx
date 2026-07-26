"use client";

import { useMotionPreference } from "@/shared/providers/motion-provider";
import type { MotionPreference } from "@/shared/providers/motion";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";

const MODES: MotionPreference[] = ["full", "reduced", "off"];

export function MotionDevToggle({ className }: { className?: string }) {
  const { resolution, setUserPreference, ready } = useMotionPreference();

  return (
    <div className={className} role="group" aria-label="Development motion preference">
      <p className="mb-2 text-xs font-bold tracking-wide text-[var(--mt-neon-yellow)] uppercase">
        Dev motion toggle {ready ? `(${resolution.preference})` : "(loading)"}
      </p>
      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => (
          <PixelButton
            key={mode}
            tone={resolution.preference === mode ? "primary" : "neutral"}
            aria-pressed={resolution.preference === mode}
            onClick={() => setUserPreference(mode)}
          >
            {mode}
          </PixelButton>
        ))}
        <PixelButton tone="cyan" onClick={() => setUserPreference(null)}>
          System
        </PixelButton>
      </div>
    </div>
  );
}
