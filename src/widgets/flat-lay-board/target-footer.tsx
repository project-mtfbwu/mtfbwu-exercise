import { ProgressMeter } from "@/shared/ui/flat-lay/progress-meter";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";

export type TargetFooterMetric = {
  label: string;
  value: number;
  max: number;
  unit: string;
  tone?: "cyan" | "pink" | "lime" | "purple";
};

export type TargetFooterProps = {
  metrics: TargetFooterMetric[];
  note?: string;
};

export function TargetFooter({
  metrics,
  note = "Demo targets footer — placeholder totals only",
}: TargetFooterProps) {
  return (
    <RetroWindow title="Today's targets (demo)" accent="blue">
      <p className="mb-3 text-xs font-bold text-[var(--mt-ink-muted)]">{note}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <ProgressMeter
            key={metric.label}
            label={metric.label}
            value={metric.value}
            max={metric.max}
            unit={metric.unit}
            tone={metric.tone}
          />
        ))}
      </div>
    </RetroWindow>
  );
}
