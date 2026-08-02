import type { HydrationDaySummary, HydrationEntryView } from "@/modules/hydration/types";

/** Sum non-deleted hydration entries for a local date. */
export function sumHydrationMl(entries: HydrationEntryView[]): number {
  return entries.reduce((sum, e) => sum + e.amountMl, 0);
}

export type HydrationProgress = {
  totalMl: number;
  targetMl: number | null;
  confirmed: boolean;
  percent: number | null;
  label: string;
};

/**
 * Neutral board status label — no shame language, no medical claims.
 * When target is unconfirmed, shows total only with a placeholder hint.
 */
export function hydrationProgressLabel(summary: HydrationDaySummary): string {
  const totalL = (summary.totalMl / 1000).toFixed(1);
  if (!summary.target?.confirmedByUser || summary.target.targetMl == null) {
    if (summary.entryCount === 0) return "Hydration · not started";
    return `${totalL} L logged · target not set`;
  }
  const targetL = (summary.target.targetMl / 1000).toFixed(1);
  return `${totalL} / ${targetL} L`;
}

export function hydrationProgress(summary: HydrationDaySummary): HydrationProgress {
  const totalMl = summary.totalMl;
  const targetMl = summary.target?.confirmedByUser ? summary.target.targetMl : null;
  const confirmed = summary.target?.confirmedByUser ?? false;
  const percent =
    targetMl != null && targetMl > 0
      ? Math.min(100, Math.round((totalMl / targetMl) * 100))
      : null;
  return {
    totalMl,
    targetMl,
    confirmed,
    percent,
    label: hydrationProgressLabel(summary),
  };
}

/** Format ml for display — prefers liters when >= 1000 ml. */
export function formatHydrationAmount(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${Math.round(ml)} ml`;
}
