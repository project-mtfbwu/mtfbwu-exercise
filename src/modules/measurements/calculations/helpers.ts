/** Default same-day aggregation when multiple readings exist on one calendar day. */
export const DEFAULT_SAME_DAY_MODE = "latest" as const;

export type SameDayChartMode = "latest" | "first" | "average";

export type DatedValue = {
  localDate: string;
  value: number;
  recordedAt?: string;
};

export function delta(first: number | null, last: number | null): number | null {
  if (first == null || last == null) return null;
  return round2(last - first);
}

export function percentChange(first: number | null, last: number | null): number | null {
  if (first == null || last == null || first === 0) return null;
  return round2(((last - first) / first) * 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Collapses multiple readings on the same local date into one chart point.
 * Default mode is `latest` (most recent recorded_at wins).
 */
export function aggregateSameDayValues(
  points: readonly DatedValue[],
  mode: SameDayChartMode = DEFAULT_SAME_DAY_MODE,
): DatedValue[] {
  const byDate = new Map<string, DatedValue[]>();
  for (const point of points) {
    const list = byDate.get(point.localDate) ?? [];
    list.push(point);
    byDate.set(point.localDate, list);
  }

  const result: DatedValue[] = [];
  for (const [localDate, group] of byDate) {
    if (mode === "first") {
      const sorted = [...group].sort((a, b) =>
        (a.recordedAt ?? localDate).localeCompare(b.recordedAt ?? localDate),
      );
      result.push({
        localDate,
        value: sorted[0]!.value,
        recordedAt: sorted[0]!.recordedAt,
      });
      continue;
    }
    if (mode === "average") {
      const avg = group.reduce((sum, p) => sum + p.value, 0) / group.length;
      result.push({ localDate, value: round2(avg) });
      continue;
    }
    const sorted = [...group].sort((a, b) =>
      (b.recordedAt ?? localDate).localeCompare(a.recordedAt ?? localDate),
    );
    result.push({
      localDate,
      value: sorted[0]!.value,
      recordedAt: sorted[0]!.recordedAt,
    });
  }
  return result.sort((a, b) => a.localDate.localeCompare(b.localDate));
}

/** Neutral descriptive trend — never medical language. */
export function trendText(
  deltaValue: number | null,
  unitLabel: string,
  options?: { percentChange?: number | null },
): string | null {
  if (deltaValue == null) return null;
  if (deltaValue === 0) return `No change in ${unitLabel} over this period.`;
  const direction = deltaValue > 0 ? "up" : "down";
  const abs = Math.abs(deltaValue);
  const pct =
    options?.percentChange != null
      ? ` (${options.percentChange > 0 ? "+" : ""}${options.percentChange}%)`
      : "";
  return `${unitLabel} ${direction} ${abs}${pct} over this period — user-recorded data.`;
}

export function weightChangeSummary(
  earliestKg: number | null,
  latestKg: number | null,
): { delta: number | null; percentChange: number | null; trendText: string | null } {
  const d = delta(earliestKg, latestKg);
  const pct = percentChange(earliestKg, latestKg);
  return {
    delta: d,
    percentChange: pct,
    trendText: trendText(d, "Weight", { percentChange: pct }),
  };
}

export function measurementChangeSummary(
  earliest: number | null,
  latest: number | null,
  displayName: string,
  unit: string,
): { delta: number | null; percentChange: number | null; trendText: string | null } {
  const d = delta(earliest, latest);
  const pct = percentChange(earliest, latest);
  const label = `${displayName} (${unit})`;
  return {
    delta: d,
    percentChange: pct,
    trendText: trendText(d, label, { percentChange: pct }),
  };
}
