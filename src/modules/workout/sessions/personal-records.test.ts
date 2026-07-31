import { describe, expect, it } from "vitest";
import {
  decodePersonalRecordMeta,
  detectPersonalRecordCandidates,
  encodePersonalRecordMeta,
  type PersonalRecordCandidateExercise,
} from "./personal-record-candidates";

function exercise(
  sets: PersonalRecordCandidateExercise["sets"],
): PersonalRecordCandidateExercise {
  return {
    exerciseDefinitionId: "exercise-def-1",
    userExerciseId: null,
    exerciseLabel: "Barbell Bench Press",
    sets,
  };
}

describe("detectPersonalRecordCandidates", () => {
  it("detects an estimated 1RM candidate with no prior best", () => {
    const candidates = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "completed", setRole: "working", reps: 5, loadKg: 100 },
      ]),
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      recordType: "estimated_1rm",
      workoutSetId: "set-1",
      estimationMethod: "epley",
      priorBest: null,
    });
    expect(candidates[0]?.value).toBeGreaterThan(100);
  });

  it("never creates a candidate from a warmup set", () => {
    const candidates = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "completed", setRole: "warmup", reps: 5, loadKg: 999 },
      ]),
    );
    expect(candidates).toHaveLength(0);
  });

  it("ignores skipped, failed, and partial sets", () => {
    const candidates = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "skipped", setRole: "working", reps: 5, loadKg: 100 },
        { id: "set-2", status: "failed", setRole: "working", reps: 5, loadKg: 100 },
        { id: "set-3", status: "partial", setRole: "working", reps: 5, loadKg: 100 },
      ]),
    );
    expect(candidates).toHaveLength(0);
  });

  it("only beats a confirmed prior best, not a lower pending one", () => {
    const belowPrior = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "completed", setRole: "working", reps: 5, loadKg: 100 },
      ]),
      { estimated_1rm: 200 },
    );
    expect(belowPrior).toHaveLength(0);

    const abovePrior = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "completed", setRole: "working", reps: 5, loadKg: 100 },
      ]),
      { estimated_1rm: 50 },
    );
    expect(abovePrior).toHaveLength(1);
  });

  it("picks the best working set across several for the same exercise", () => {
    const candidates = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "completed", setRole: "working", reps: 5, loadKg: 80 },
        { id: "set-2", status: "completed", setRole: "top_set", reps: 3, loadKg: 100 },
        { id: "set-3", status: "completed", setRole: "backoff", reps: 8, loadKg: 70 },
      ]),
    );
    const oneRm = candidates.find((c) => c.recordType === "estimated_1rm");
    expect(oneRm?.workoutSetId).toBe("set-2");
  });

  it("detects a max_load candidate independent of 1RM eligibility", () => {
    const candidates = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "completed", setRole: "max_effort", reps: 1, loadKg: 150 },
      ]),
    );
    const maxLoad = candidates.find((c) => c.recordType === "max_load");
    expect(maxLoad).toMatchObject({ value: 150, unit: "kg", workoutSetId: "set-1" });
  });

  it("detects a max_reps candidate only for load-free sets", () => {
    const candidates = detectPersonalRecordCandidates(
      exercise([
        { id: "set-1", status: "completed", setRole: "amrap", reps: 20, loadKg: null },
        { id: "set-2", status: "completed", setRole: "working", reps: 12, loadKg: 60 },
      ]),
    );
    const maxReps = candidates.find((c) => c.recordType === "max_reps");
    expect(maxReps).toMatchObject({ value: 20, unit: "reps", workoutSetId: "set-1" });
  });

  it("returns no candidates when nothing is eligible", () => {
    expect(detectPersonalRecordCandidates(exercise([]))).toHaveLength(0);
  });
});

describe("personal record meta encoding", () => {
  it("round-trips estimation method and prior best", () => {
    const encoded = encodePersonalRecordMeta({
      estimationMethod: "epley",
      priorBest: 95.5,
    });
    expect(decodePersonalRecordMeta(encoded)).toEqual({
      estimationMethod: "epley",
      priorBest: 95.5,
    });
  });

  it("falls back to empty meta for missing or invalid input", () => {
    expect(decodePersonalRecordMeta(null)).toEqual({
      estimationMethod: null,
      priorBest: null,
    });
    expect(decodePersonalRecordMeta("not json")).toEqual({
      estimationMethod: null,
      priorBest: null,
    });
    expect(
      decodePersonalRecordMeta(JSON.stringify({ estimationMethod: "bogus" })),
    ).toEqual({
      estimationMethod: null,
      priorBest: null,
    });
  });
});
