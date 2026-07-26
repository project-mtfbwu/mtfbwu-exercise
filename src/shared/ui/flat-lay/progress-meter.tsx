import { cn } from "@/shared/utils/cn";

export type ProgressMeterProps = {
  label: string;
  value: number;
  max: number;
  unit?: string;
  segments?: number;
  className?: string;
  tone?: "cyan" | "pink" | "lime" | "purple";
};

const fillTone = {
  cyan: "bg-[var(--mt-neon-cyan)]",
  pink: "bg-[var(--mt-neon-pink)]",
  lime: "bg-[var(--mt-neon-lime)]",
  purple: "bg-[var(--mt-neon-purple)]",
} as const;

export function ProgressMeter({
  label,
  value,
  max,
  unit = "",
  segments = 10,
  className,
  tone = "cyan",
}: ProgressMeterProps) {
  const safeMax = max <= 0 ? 1 : max;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const filled = Math.round(ratio * segments);
  const text = `${value} / ${max}${unit ? ` ${unit}` : ""}`;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm font-bold">
        <span>{label}</span>
        <span className="tabular-nums">{text}</span>
      </div>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${label}: ${text}`}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 border border-[var(--mt-ink)]",
              i < filled ? fillTone[tone] : "bg-white/70",
            )}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
