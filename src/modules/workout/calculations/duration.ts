import type { PerformedSetLike } from "./types";

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Whole-second duration between session start and completion. Returns `null`
 * while a session is still in progress (`completedAt` absent) or if either
 * timestamp is unparsable or `completedAt` precedes `startedAt`.
 */
export function sessionDurationSeconds(
  startedAt: string | Date,
  completedAt: string | Date | null | undefined,
): number | null {
  if (completedAt === null || completedAt === undefined) return null;

  const start = toDate(startedAt);
  const end = toDate(completedAt);
  if (start === null || end === null) return null;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;

  return Math.round(diffMs / 1000);
}

/**
 * Sums recorded seconds across `timed` sets (planks, carries, holds). Sets
 * without a positive, finite duration contribute nothing.
 */
export function sumSetDurations(
  sets: readonly Pick<PerformedSetLike, "durationSeconds">[],
): number {
  return sets.reduce((total, set) => {
    const duration = set.durationSeconds;
    if (duration === null || duration === undefined) return total;
    if (!Number.isFinite(duration) || duration <= 0) return total;
    return total + duration;
  }, 0);
}
