import type {
  AssistanceTrendInput,
  PainTrendInput,
  RehabExerciseLike,
  RehabSetLike,
  RomProgressionInput,
} from "./types";

export function countCompletedSets(sets: readonly RehabSetLike[]): number {
  return sets.filter((s) => s.status === "completed").length;
}

export function isExerciseComplete(exercise: RehabExerciseLike): boolean {
  if (!exercise.sets.length) return false;
  return exercise.sets.every(
    (s) => s.status === "completed" || s.status === "skipped" || s.status === "stopped",
  );
}

export function sessionDurationSeconds(
  startedAt: string,
  completedAt: string | null,
  nowMs = Date.now(),
): number {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  const end = completedAt ? new Date(completedAt).getTime() : nowMs;
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function maxPain(set: RehabSetLike): number | null {
  const values = [set.painBefore, set.painDuring, set.painAfter].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  return values.length ? Math.max(...values) : null;
}

/** Plain-language comparison — never implies clinical recovery. */
export function comparePainTrend(input: PainTrendInput): string | null {
  const { previousMaxPain, currentMaxPain } = input;
  if (
    previousMaxPain == null ||
    currentMaxPain == null ||
    !Number.isFinite(previousMaxPain) ||
    !Number.isFinite(currentMaxPain)
  ) {
    return null;
  }
  const delta = currentMaxPain - previousMaxPain;
  if (delta === 0) return "Pain was similar to last session";
  if (delta < 0) return "Pain was lower than last session";
  return "Pain was higher than last session";
}

export function averageConfidence(sets: readonly RehabSetLike[]): number | null {
  const values = sets
    .map((s) => s.confidence)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!values.length) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function compareRomProgression(input: RomProgressionInput): string | null {
  const { previousRom, currentRom } = input;
  if (
    previousRom == null ||
    currentRom == null ||
    !Number.isFinite(previousRom) ||
    !Number.isFinite(currentRom)
  ) {
    return null;
  }
  const delta = currentRom - previousRom;
  if (delta === 0) return "Range was similar to last session";
  if (delta > 0) return `Range increased by ${Math.abs(delta)}° compared to last session`;
  return `Range decreased by ${Math.abs(delta)}° compared to last session`;
}

export function assistanceTrend(input: AssistanceTrendInput): string | null {
  const prev = input.previousAmount?.trim() || null;
  const curr = input.currentAmount?.trim() || null;
  if (!prev && !curr) return null;
  if (prev === curr) return "Assistance was the same as last session";
  if (!prev && curr) return "Assistance was recorded this session";
  if (prev && !curr) return "No assistance recorded this session";
  return "Assistance changed from last session";
}

export function countAlerts(alerts: readonly { acknowledgedAt?: string | null }[]): {
  total: number;
  unacknowledged: number;
} {
  const total = alerts.length;
  const unacknowledged = alerts.filter((a) => !a.acknowledgedAt).length;
  return { total, unacknowledged };
}

export function sessionMaxPain(sets: readonly RehabSetLike[]): number | null {
  const pains = sets.map(maxPain).filter((v): v is number => v != null);
  return pains.length ? Math.max(...pains) : null;
}
