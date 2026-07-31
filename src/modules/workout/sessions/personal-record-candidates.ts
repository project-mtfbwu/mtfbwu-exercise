/**
 * Pure personal-record detection. Extracted from `actions.ts` so the rules —
 * which sets are eligible, which record types apply, what beats a prior
 * best — are unit-testable without a database. See `PersonalRecordView` in
 * `types.ts` for the persisted-row shape this feeds.
 */
import { brzyckiEstimate, epleyEstimate } from "@/modules/workout/calculations";
import type { PersonalRecordType } from "./types";

export type EstimationMethod = "epley" | "brzycki";

/**
 * Warmups, technique work, and timed holds never count toward a PR — only
 * sets performed with working intent. `drop`/`drop_set` are included since a
 * drop-set's first (heaviest) portion is still a genuine working effort.
 */
export const PR_ELIGIBLE_SET_ROLES = [
  "working",
  "top_set",
  "backoff",
  "amrap",
  "max_effort",
  "failure",
  "drop_set",
  "drop",
] as const;
export type PrEligibleSetRole = (typeof PR_ELIGIBLE_SET_ROLES)[number];

export type PersonalRecordCandidateSet = {
  id: string;
  status: string;
  setRole: string;
  reps: number | null;
  loadKg: number | null;
};

export type PersonalRecordCandidateExercise = {
  exerciseDefinitionId: string | null;
  userExerciseId: string | null;
  exerciseLabel: string;
  sets: readonly PersonalRecordCandidateSet[];
};

export type PersonalRecordCandidate = {
  exerciseDefinitionId: string | null;
  userExerciseId: string | null;
  exerciseLabel: string;
  recordType: PersonalRecordType;
  value: number;
  unit: "kg" | "reps";
  workoutSetId: string;
  estimationMethod: EstimationMethod | null;
  priorBest: number | null;
};

/** Only a `confirmed` prior record counts as the bar to beat — never a still-pending or dismissed one. */
export type PersonalRecordPriorBests = Partial<Record<PersonalRecordType, number | null>>;

function isEligibleSet(set: PersonalRecordCandidateSet): boolean {
  return (
    set.status === "completed" &&
    (PR_ELIGIBLE_SET_ROLES as readonly string[]).includes(set.setRole)
  );
}

/**
 * Detects up to one candidate per record type for a single exercise's
 * performed sets: an estimated 1RM (best of Epley/Brzycki across eligible
 * sets), the heaviest load lifted, and — for load-free rep work only — the
 * most reps performed. Each candidate is only returned when it beats the
 * caller-supplied confirmed prior best (or there is no prior best yet).
 * Never considers warmup, skipped, failed, or partial sets.
 */
export function detectPersonalRecordCandidates(
  exercise: PersonalRecordCandidateExercise,
  priorBests: PersonalRecordPriorBests = {},
): PersonalRecordCandidate[] {
  const eligible = exercise.sets.filter(isEligibleSet);
  const candidates: PersonalRecordCandidate[] = [];

  // A true single-rep attempt is a measured max, not an estimate — it feeds
  // `max_load` directly. Everything else with a usable rep range feeds the
  // Epley/Brzycki projection instead, so a set never doubles as both.
  let best1rm: { value: number; method: EstimationMethod; setId: string } | null = null;
  let bestLoad: { value: number; setId: string } | null = null;
  for (const set of eligible) {
    if (set.reps === null || set.loadKg === null) continue;
    if (set.reps === 1) {
      if (!bestLoad || set.loadKg > bestLoad.value)
        bestLoad = { value: set.loadKg, setId: set.id };
      continue;
    }
    const epley = epleyEstimate(set.loadKg, set.reps);
    const brzycki = brzyckiEstimate(set.loadKg, set.reps);
    const value = epley ?? brzycki;
    if (value === null) {
      // Outside the estimable rep range — the raw load is still a fact worth tracking.
      if (!bestLoad || set.loadKg > bestLoad.value)
        bestLoad = { value: set.loadKg, setId: set.id };
      continue;
    }
    const method: EstimationMethod = epley !== null ? "epley" : "brzycki";
    if (!best1rm || value > best1rm.value) best1rm = { value, method, setId: set.id };
  }
  if (best1rm) {
    const prior = priorBests.estimated_1rm ?? null;
    if (prior === null || best1rm.value > prior) {
      candidates.push({
        exerciseDefinitionId: exercise.exerciseDefinitionId,
        userExerciseId: exercise.userExerciseId,
        exerciseLabel: exercise.exerciseLabel,
        recordType: "estimated_1rm",
        value: Math.round(best1rm.value * 100) / 100,
        unit: "kg",
        workoutSetId: best1rm.setId,
        estimationMethod: best1rm.method,
        priorBest: prior,
      });
    }
  }

  if (bestLoad) {
    const prior = priorBests.max_load ?? null;
    if (prior === null || bestLoad.value > prior) {
      candidates.push({
        exerciseDefinitionId: exercise.exerciseDefinitionId,
        userExerciseId: exercise.userExerciseId,
        exerciseLabel: exercise.exerciseLabel,
        recordType: "max_load",
        value: bestLoad.value,
        unit: "kg",
        workoutSetId: bestLoad.setId,
        estimationMethod: null,
        priorBest: prior,
      });
    }
  }

  // Load-free rep work (e.g. bodyweight pull-ups logged with no added load).
  let bestReps: { value: number; setId: string } | null = null;
  for (const set of eligible) {
    if (set.loadKg !== null || set.reps === null) continue;
    if (!bestReps || set.reps > bestReps.value)
      bestReps = { value: set.reps, setId: set.id };
  }
  if (bestReps) {
    const prior = priorBests.max_reps ?? null;
    if (prior === null || bestReps.value > prior) {
      candidates.push({
        exerciseDefinitionId: exercise.exerciseDefinitionId,
        userExerciseId: exercise.userExerciseId,
        exerciseLabel: exercise.exerciseLabel,
        recordType: "max_reps",
        value: bestReps.value,
        unit: "reps",
        workoutSetId: bestReps.setId,
        estimationMethod: null,
        priorBest: prior,
      });
    }
  }

  return candidates;
}

export type PersonalRecordMeta = {
  estimationMethod: EstimationMethod | null;
  priorBest: number | null;
};

const EMPTY_META: PersonalRecordMeta = { estimationMethod: null, priorBest: null };

/** Serializes detection context into `personal_records.notes` — see `PersonalRecordView`. */
export function encodePersonalRecordMeta(meta: PersonalRecordMeta): string {
  return JSON.stringify(meta);
}

export function decodePersonalRecordMeta(
  raw: string | null | undefined,
): PersonalRecordMeta {
  if (!raw) return EMPTY_META;
  try {
    const parsed = JSON.parse(raw) as Partial<PersonalRecordMeta>;
    const method = parsed.estimationMethod;
    return {
      estimationMethod: method === "epley" || method === "brzycki" ? method : null,
      priorBest: typeof parsed.priorBest === "number" ? parsed.priorBest : null,
    };
  } catch {
    return EMPTY_META;
  }
}
