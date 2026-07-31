import { describe, expect, it } from "vitest";
import {
  buildCopySessionPlan,
  formatSetSuggestion,
  type CopySessionSource,
} from "./copy-session";

function source(overrides: Partial<CopySessionSource> = {}): CopySessionSource {
  return {
    title: "Push day",
    workoutPlanId: "plan-1",
    workoutPlanDayId: "plan-day-1",
    sourcePlanVersion: 2,
    snapshotJson: { blocks: [{ blockType: "straight_sets" }] },
    exercises: [
      {
        exerciseDefinitionId: "exercise-def-1",
        userExerciseId: null,
        exerciseName: "Barbell Bench Press",
        blockType: "straight_sets",
        blockOrder: 0,
        sortOrder: 0,
        sets: [
          { setIndex: 1, setRole: "warmup", reps: 10, loadKg: 20, loadUnit: "kg" },
          { setIndex: 2, setRole: "working", reps: 8, loadKg: 60, loadUnit: "kg" },
        ],
      },
    ],
    ...overrides,
  };
}

describe("formatSetSuggestion", () => {
  it("formats reps and load together", () => {
    expect(formatSetSuggestion(8, 60, "kg")).toBe("Suggested: 8 reps @ 60 kg");
  });

  it("formats a single rep without pluralizing", () => {
    expect(formatSetSuggestion(1, 100, "kg")).toBe("Suggested: 1 rep @ 100 kg");
  });

  it("formats reps only when load is missing", () => {
    expect(formatSetSuggestion(12, null, "kg")).toBe("Suggested: 12 reps");
  });

  it("returns null when neither reps nor load were recorded", () => {
    expect(formatSetSuggestion(null, null, "kg")).toBeNull();
  });
});

describe("buildCopySessionPlan", () => {
  it("carries the source title, plan links, and snapshot forward", () => {
    const plan = buildCopySessionPlan(source());
    expect(plan.title).toBe("Push day");
    expect(plan.workoutPlanId).toBe("plan-1");
    expect(plan.workoutPlanDayId).toBe("plan-day-1");
    expect(plan.sourcePlanVersion).toBe(2);
    expect(plan.snapshotJson).toEqual({ blocks: [{ blockType: "straight_sets" }] });
  });

  it("never includes an id field anywhere in the plan", () => {
    const plan = buildCopySessionPlan(source());
    expect(JSON.stringify(plan)).not.toMatch(/"id"\s*:/);
  });

  it("copies exercise identity, block metadata, and ordering", () => {
    const plan = buildCopySessionPlan(source());
    expect(plan.exercises).toHaveLength(1);
    expect(plan.exercises[0]).toMatchObject({
      exerciseDefinitionId: "exercise-def-1",
      displayNameSnapshot: "Barbell Bench Press",
      blockTypeSnapshot: "straight_sets",
      blockOrder: 0,
      sortOrder: 0,
      exerciseOrder: 0,
    });
  });

  it("leaves every new set pending with reps/load left null, suggestion in notes", () => {
    const plan = buildCopySessionPlan(source());
    const sets = plan.exercises[0]?.sets ?? [];
    expect(sets).toHaveLength(2);
    for (const set of sets) {
      expect(set.status).toBe("pending");
      expect(set).not.toHaveProperty("reps");
      expect(set).not.toHaveProperty("loadKg");
    }
    expect(sets[0]).toMatchObject({
      setIndex: 1,
      setRole: "warmup",
      notes: "Suggested: 10 reps @ 20 kg",
    });
    expect(sets[1]).toMatchObject({
      setIndex: 2,
      setRole: "working",
      notes: "Suggested: 8 reps @ 60 kg",
    });
  });

  it("gives a null suggestion for a set with no recorded performance", () => {
    const plan = buildCopySessionPlan(
      source({
        exercises: [
          {
            exerciseDefinitionId: null,
            userExerciseId: "user-exercise-1",
            exerciseName: "Custom curl",
            blockType: null,
            blockOrder: 0,
            sortOrder: 0,
            sets: [
              {
                setIndex: 1,
                setRole: "working",
                reps: null,
                loadKg: null,
                loadUnit: "kg",
              },
            ],
          },
        ],
      }),
    );
    expect(plan.exercises[0]?.sets[0]?.notes).toBeNull();
  });

  it("keeps multiple exercises independently ordered", () => {
    const plan = buildCopySessionPlan(
      source({
        exercises: [
          {
            exerciseDefinitionId: "exercise-def-1",
            userExerciseId: null,
            exerciseName: "Bench",
            blockType: "straight_sets",
            blockOrder: 0,
            sortOrder: 5,
            sets: [],
          },
          {
            exerciseDefinitionId: "exercise-def-2",
            userExerciseId: null,
            exerciseName: "Row",
            blockType: "straight_sets",
            blockOrder: 1,
            sortOrder: 2,
            sets: [],
          },
        ],
      }),
    );
    expect(plan.exercises.map((e) => e.sortOrder)).toEqual([0, 1]);
    expect(plan.exercises.map((e) => e.exerciseOrder)).toEqual([5, 2]);
  });
});
