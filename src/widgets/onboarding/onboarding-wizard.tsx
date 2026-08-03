"use client";

import { useMemo, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { BoardBackdrop } from "@/widgets/flat-lay-board/board-backdrop";
import { completeOnboardingAction } from "@/shared/board/actions";
import type { ModuleDefinition } from "@/shared/database/types";
import type { AnimationMode, UnitsSystem } from "@/shared/database/types";
import { detectBrowserTimeZone } from "@/shared/utils/local-date";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { trackProductEvent } from "@/shared/observability/analytics";

const STEPS = [
  "Welcome",
  "Display name",
  "Timezone",
  "Units",
  "Modules",
  "Optional targets",
  "Motion",
  "Privacy",
  "Finish",
] as const;

type Props = {
  modules: Pick<
    ModuleDefinition,
    "key" | "display_name" | "description" | "default_enabled" | "category"
  >[];
  initialDisplayName: string;
};

export function OnboardingWizard({ modules, initialDisplayName }: Props) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [timezone, setTimezone] = useState(detectBrowserTimeZone());
  const [unitsSystem, setUnitsSystem] = useState<UnitsSystem>("metric");
  const [animationMode, setAnimationMode] = useState<AnimationMode>("full");
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(modules.filter((m) => m.default_enabled).map((m) => m.key)),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const recommended = useMemo(
    () => modules.filter((m) => m.default_enabled).map((m) => m.key),
    [modules],
  );

  function toggle(key: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function finish() {
    startTransition(async () => {
      const result = await completeOnboardingAction({
        displayName,
        timezone,
        unitsSystem,
        animationMode,
        enabledModuleKeys: [...enabled],
      });
      if (result && !result.ok) {
        setError(result.error);
        return;
      }
      trackProductEvent("onboarding_completed", { modules: enabled.size });
    });
  }

  return (
    <BoardBackdrop motionPreference="reduced">
      <div className="mx-auto max-w-2xl space-y-4 py-6">
        <RetroWindow title="Onboarding" accent="lime">
          <p className="mb-3 text-sm text-[var(--mt-ink-muted)]" aria-live="polite">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
          <PaperCard>
            {step === 0 ? (
              <div className="space-y-2 text-sm">
                <p className="font-bold">Welcome to MTFBWU</p>
                <p>
                  Personal body-and-training tracker — not a journal, feed, or medical
                  device. You choose which modules to enable.
                </p>
              </div>
            ) : null}
            {step === 1 ? (
              <div className="space-y-2">
                <label className="font-bold" htmlFor="ob-name">
                  Display name
                </label>
                <input
                  id="ob-name"
                  className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            ) : null}
            {step === 2 ? (
              <div className="space-y-2">
                <label className="font-bold" htmlFor="ob-tz">
                  Timezone
                </label>
                <input
                  id="ob-tz"
                  className="min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
                <p className="text-xs text-[var(--mt-ink-muted)]">
                  Used for local daily dates. Changing timezone later does not rewrite
                  historical local dates.
                </p>
              </div>
            ) : null}
            {step === 3 ? (
              <fieldset className="space-y-2">
                <legend className="font-bold">Units</legend>
                {(["metric", "imperial"] as const).map((u) => (
                  <label key={u} className="flex min-h-11 items-center gap-2">
                    <input
                      type="radio"
                      name="units"
                      checked={unitsSystem === u}
                      onChange={() => setUnitsSystem(u)}
                    />
                    {u}
                  </label>
                ))}
              </fieldset>
            ) : null}
            {step === 4 ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Recommendations preselected: {recommended.join(", ")}. Smoking-free
                  stays optional/off by default.
                </p>
                <ul className="space-y-2">
                  {modules.map((m) => (
                    <li key={m.key}>
                      <label className="flex min-h-11 items-start gap-2 border-2 border-[var(--mt-ink)]/30 p-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5"
                          checked={enabled.has(m.key)}
                          onChange={() => toggle(m.key)}
                        />
                        <span>
                          <span className="font-bold">{m.display_name}</span>
                          <span className="block text-xs text-[var(--mt-ink-muted)]">
                            {m.description}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {step === 5 ? (
              <div className="space-y-2 text-sm">
                <p className="font-bold">Optional targets</p>
                <p>
                  Targets are optional. You can set hydration or tracker targets later in
                  Customize. Progress photos and supplements are never required.
                </p>
              </div>
            ) : null}
            {step === 6 ? (
              <fieldset className="space-y-2">
                <legend className="font-bold">Motion mode</legend>
                {(["full", "reduced", "off"] as const).map((mode) => (
                  <label key={mode} className="flex min-h-11 items-center gap-2">
                    <input
                      type="radio"
                      name="motion"
                      checked={animationMode === mode}
                      onChange={() => setAnimationMode(mode)}
                    />
                    {mode}
                  </label>
                ))}
              </fieldset>
            ) : null}
            {step === 7 ? (
              <div className="space-y-2 text-sm">
                <p className="font-bold">Privacy summary</p>
                <p>
                  Your records stay private to your account. Read the draft{" "}
                  <AppLink href={ROUTES.privacy}>privacy policy</AppLink> (legal review
                  still required before public launch).
                </p>
              </div>
            ) : null}
            {step === 8 ? (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>{displayName || "Athlete"}</strong> · {timezone} · {unitsSystem}{" "}
                  · motion {animationMode}
                </p>
                <p>Enabled modules: {[...enabled].join(", ") || "(none)"}</p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-3 text-sm font-bold text-[var(--mt-danger)]">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <PixelButton
                tone="neutral"
                disabled={step === 0 || pending}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </PixelButton>
              {step < STEPS.length - 1 ? (
                <PixelButton
                  tone="primary"
                  disabled={pending || (step === 1 && !displayName.trim())}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continue
                </PixelButton>
              ) : (
                <PixelButton
                  tone="primary"
                  loading={pending}
                  disabled={pending || enabled.size === 0}
                  onClick={finish}
                >
                  Open Today board
                </PixelButton>
              )}
            </div>
          </PaperCard>
        </RetroWindow>
      </div>
    </BoardBackdrop>
  );
}
