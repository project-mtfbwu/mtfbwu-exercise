/**
 * One-rep-max formulas are estimates derived from a submaximal set — never a
 * substitute for a measured 1RM attempt. Accuracy degrades quickly outside a
 * low-to-moderate rep range, so both estimators refuse reps outside 1–12 and
 * any non-positive load, returning `null` rather than a misleading number.
 */
const MIN_ESTIMATE_REPS = 1;
const MAX_ESTIMATE_REPS = 12;

function isEstimable(load: number, reps: number): boolean {
  if (!Number.isFinite(load) || load <= 0) return false;
  if (!Number.isFinite(reps)) return false;
  if (reps < MIN_ESTIMATE_REPS || reps > MAX_ESTIMATE_REPS) return false;
  return true;
}

/**
 * Epley formula: `1RM = load * (1 + reps / 30)`.
 * Returns an estimate only, not a measured truth.
 */
export function epleyEstimate(load: number, reps: number): number | null {
  if (!isEstimable(load, reps)) return null;
  if (reps === 1) return load;

  return load * (1 + reps / 30);
}

/**
 * Brzycki formula: `1RM = load * 36 / (37 - reps)`.
 * Returns an estimate only, not a measured truth.
 */
export function brzyckiEstimate(load: number, reps: number): number | null {
  if (!isEstimable(load, reps)) return null;
  if (reps === 1) return load;

  return (load * 36) / (37 - reps);
}
