"use client";

import { PixelButton } from "./pixel-button";
import { cn } from "@/shared/utils/cn";

export type NumericStepperProps = {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
};

export function NumericStepper({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  disabled = false,
  className,
}: NumericStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>
      <PixelButton
        tone="neutral"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </PixelButton>
      <output
        id={id}
        aria-labelledby={`${id}-label`}
        aria-live="polite"
        className="min-w-12 border-2 border-[var(--mt-ink)] bg-white px-2 py-2 text-center font-bold tabular-nums"
      >
        {value}
      </output>
      <PixelButton
        tone="neutral"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </PixelButton>
    </div>
  );
}
