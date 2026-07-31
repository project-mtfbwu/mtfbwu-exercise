import { describe, expect, it } from "vitest";
import {
  buildBlockExerciseSeed,
  buildBlockSeed,
  buildDaySeed,
  buildPlanTreeSeed,
  buildPrescriptionSeed,
  buildReorderPlan,
  bumpVersionOrConflict,
} from "./plan-tree";
import {
  addBlockExerciseSchema,
  addBlockSchema,
  addPrescriptionSchema,
  createPlanSchema,
  createUserExerciseSchema,
  reorderPlanDaysSchema,
  substituteBlockExerciseSchema,
  updatePlanMetaSchema,
  updatePrescriptionSchema,
} from "./schemas";

describe("bumpVersionOrConflict", () => {
  it("bumps the version when expected matches actual", () => {
    expect(bumpVersionOrConflict(3, 3)).toEqual({ ok: true, nextVersion: 4 });
  });

  it("reports a conflict when expected does not match actual", () => {
    expect(bumpVersionOrConflict(2, 3)).toEqual({ ok: false, conflict: true });
    expect(bumpVersionOrConflict(4, 3)).toEqual({ ok: false, conflict: true });
  });
});

describe("buildReorderPlan", () => {
  it("produces a temp phase strictly above any plausible existing sort_order", () => {
    const plan = buildReorderPlan(["a", "b", "c"]);
    for (const step of plan.tempSteps) {
      expect(step.sortOrder).toBeGreaterThanOrEqual(100_000);
    }
  });

  it("produces a final phase that is a dense 0..n-1 sequence in input order", () => {
    const plan = buildReorderPlan(["c", "a", "b"]);
    expect(plan.finalSteps).toEqual([
      { id: "c", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });

  it("keeps temp and final steps in the same relative order for the same id", () => {
    const plan = buildReorderPlan(["x", "y"]);
    expect(plan.tempSteps.map((s) => s.id)).toEqual(plan.finalSteps.map((s) => s.id));
  });

  it("handles an empty list", () => {
    const plan = buildReorderPlan([]);
    expect(plan.tempSteps).toEqual([]);
    expect(plan.finalSteps).toEqual([]);
  });
});

describe("buildPrescriptionSeed", () => {
  it("maps every prescription column, defaulting missing values to null", () => {
    expect(
      buildPrescriptionSeed({
        set_index: 2,
        set_role: "working",
        completion_rule: "rep_range",
        target_reps_min: 8,
        target_reps_max: 12,
        target_weight_kg: 60,
        target_rpe: 8,
        target_rir: 2,
        tempo_eccentric_seconds: 3,
        tempo_pause_bottom_seconds: 1,
        tempo_concentric_seconds: 1,
        tempo_pause_top_seconds: 0,
        rest_seconds: 90,
        notes: "Chase the pump",
      }),
    ).toEqual({
      set_index: 2,
      set_role: "working",
      completion_rule: "rep_range",
      target_reps_min: 8,
      target_reps_max: 12,
      target_weight_kg: 60,
      target_duration_seconds: null,
      target_distance_meters: null,
      target_rpe: 8,
      target_rir: 2,
      tempo_eccentric_seconds: 3,
      tempo_pause_bottom_seconds: 1,
      tempo_concentric_seconds: 1,
      tempo_pause_top_seconds: 0,
      rest_seconds: 90,
      notes: "Chase the pump",
    });
  });

  it("falls back to set_index 1 and role working for garbage input", () => {
    const seed = buildPrescriptionSeed({});
    expect(seed.set_index).toBe(1);
    expect(seed.set_role).toBe("working");
    expect(seed.completion_rule).toBe("rep_range");
    expect(seed.notes).toBeNull();
  });
});

describe("buildBlockExerciseSeed / buildBlockSeed / buildDaySeed / buildPlanTreeSeed", () => {
  const prescriptions = [
    { id: "rx-2", workout_block_exercise_id: "be-1", set_index: 2, set_role: "working" },
    { id: "rx-1", workout_block_exercise_id: "be-1", set_index: 1, set_role: "warmup" },
    { id: "rx-3", workout_block_exercise_id: "be-2", set_index: 1, set_role: "working" },
  ];
  const blockExercises = [
    {
      id: "be-2",
      workout_block_id: "block-1",
      sort_order: 1,
      exercise_definition_id: "ex-2",
    },
    {
      id: "be-1",
      workout_block_id: "block-1",
      sort_order: 0,
      exercise_definition_id: "ex-1",
    },
  ];
  const blocks = [
    { id: "block-2", workout_plan_day_id: "day-1", sort_order: 1, block_type: "warmup" },
    {
      id: "block-1",
      workout_plan_day_id: "day-1",
      sort_order: 0,
      block_type: "superset",
    },
  ];
  const days = [
    { id: "day-2", workout_plan_id: "plan-1", sort_order: 1, name: "Day 2" },
    { id: "day-1", workout_plan_id: "plan-1", sort_order: 0, name: "Day 1" },
  ];

  it("orders an exercise's prescriptions by set_index regardless of input order", () => {
    const seed = buildBlockExerciseSeed(blockExercises[1]!, prescriptions);
    expect(seed.prescriptions.map((p) => p.set_index)).toEqual([1, 2]);
    expect(seed.exercise_definition_id).toBe("ex-1");
    expect(seed.user_exercise_id).toBeNull();
  });

  it("orders a block's exercises by sort_order regardless of input order", () => {
    // blocks[1] is "block-1" — the only block that owns any block exercises.
    const seed = buildBlockSeed(blocks[1]!, blockExercises, prescriptions);
    expect(seed.exercises.map((e) => e.exercise_definition_id)).toEqual(["ex-1", "ex-2"]);
  });

  it("orders a day's blocks by sort_order regardless of input order", () => {
    // days[1] is "day-1" — the only day that owns any blocks in this fixture.
    const seed = buildDaySeed(days[1]!, blocks, blockExercises, prescriptions);
    expect(seed.blocks.map((b) => b.block_type)).toEqual(["superset", "warmup"]);
  });

  it("only attaches children that belong to the given parent", () => {
    const seed = buildDaySeed(days[0]!, blocks, blockExercises, prescriptions);
    expect(seed.blocks).toEqual([]);
  });

  it("builds the full tree ordered by sort_order at every level", () => {
    const seeds = buildPlanTreeSeed(days, blocks, blockExercises, prescriptions);
    expect(seeds.map((d) => d.name)).toEqual(["Day 1", "Day 2"]);
    expect(seeds[0]!.blocks).toHaveLength(2);
    expect(seeds[1]!.blocks).toHaveLength(0);
  });

  it("never carries an id field into the seed (fresh rows on insert)", () => {
    const seeds = buildPlanTreeSeed(days, blocks, blockExercises, prescriptions);
    const json = JSON.stringify(seeds);
    expect(json).not.toContain("day-1");
    expect(json).not.toContain("block-1");
    expect(json).not.toContain("be-1");
    expect(json).not.toContain("rx-1");
  });
});

describe("plan schema validation", () => {
  it("accepts a minimal createPlanSchema payload", () => {
    expect(createPlanSchema.safeParse({ name: "Push Pull Legs" }).success).toBe(true);
  });

  it("rejects an empty plan name", () => {
    expect(createPlanSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("requires expectedVersion on updatePlanMetaSchema", () => {
    const result = updatePlanMetaSchema.safeParse({
      planId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      name: "Renamed plan",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a full updatePlanMetaSchema payload", () => {
    const result = updatePlanMetaSchema.safeParse({
      planId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      name: "Renamed plan",
      description: "New description",
      objective: "hypertrophy",
      expectedVersion: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive expectedVersion", () => {
    const result = reorderPlanDaysSchema.safeParse({
      planId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 0,
      orderedDayIds: ["9f8b9b0a-1111-4a11-8a11-000000000002"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one day id when reordering", () => {
    const result = reorderPlanDaysSchema.safeParse({
      planId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 1,
      orderedDayIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("addBlockSchema", () => {
  it("accepts every advanced block type from the Increment 6 enum", () => {
    for (const blockType of [
      "triset",
      "stripping_set",
      "one_to_ten",
      "cardio",
      "mobility",
      "custom",
    ]) {
      const result = addBlockSchema.safeParse({
        planDayId: "9f8b9b0a-1111-4a11-8a11-000000000001",
        expectedVersion: 1,
        blockType,
      });
      expect(result.success, `expected ${blockType} to be accepted`).toBe(true);
    }
  });

  it("rejects an unknown block type", () => {
    const result = addBlockSchema.safeParse({
      planDayId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 1,
      blockType: "not_a_real_block_type",
    });
    expect(result.success).toBe(false);
  });

  it("accepts rounds, restSeconds, and transitionSeconds together", () => {
    const result = addBlockSchema.safeParse({
      planDayId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 1,
      blockType: "circuit",
      rounds: 4,
      restSeconds: 60,
      transitionSeconds: 15,
    });
    expect(result.success).toBe(true);
  });
});

describe("exercise-source XOR refinement", () => {
  it("rejects addBlockExerciseSchema when neither source is provided", () => {
    const result = addBlockExerciseSchema.safeParse({
      blockId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects addBlockExerciseSchema when both sources are provided", () => {
    const result = addBlockExerciseSchema.safeParse({
      blockId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 1,
      exerciseDefinitionId: "9f8b9b0a-1111-4a11-8a11-000000000002",
      userExerciseId: "9f8b9b0a-1111-4a11-8a11-000000000003",
    });
    expect(result.success).toBe(false);
  });

  it("accepts addBlockExerciseSchema with exactly one source", () => {
    const result = addBlockExerciseSchema.safeParse({
      blockId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 1,
      exerciseDefinitionId: "9f8b9b0a-1111-4a11-8a11-000000000002",
    });
    expect(result.success).toBe(true);
  });

  it("applies the same XOR rule to substituteBlockExerciseSchema", () => {
    expect(
      substituteBlockExerciseSchema.safeParse({
        blockExerciseId: "9f8b9b0a-1111-4a11-8a11-000000000001",
        expectedVersion: 1,
        userExerciseId: "9f8b9b0a-1111-4a11-8a11-000000000002",
      }).success,
    ).toBe(true);
    expect(
      substituteBlockExerciseSchema.safeParse({
        blockExerciseId: "9f8b9b0a-1111-4a11-8a11-000000000001",
        expectedVersion: 1,
      }).success,
    ).toBe(false);
  });
});

describe("createUserExerciseSchema", () => {
  it("accepts a custom name with optional notes", () => {
    expect(
      createUserExerciseSchema.safeParse({
        customName: "Sled Push",
        notes: "Backyard sled",
      }).success,
    ).toBe(true);
  });

  it("rejects a blank custom name", () => {
    expect(createUserExerciseSchema.safeParse({ customName: "  " }).success).toBe(false);
  });
});

describe("prescription schema validation (straight / superset / circuit fields)", () => {
  const base = {
    blockExerciseId: "9f8b9b0a-1111-4a11-8a11-000000000001",
    expectedVersion: 1,
    setRole: "working" as const,
  };

  it("accepts a straight-set style prescription (rep range + weight)", () => {
    const result = addPrescriptionSchema.safeParse({
      ...base,
      completionRule: "rep_range",
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetWeightKg: 60,
      restSeconds: 90,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a tempo-prescribed set (all four tempo phases)", () => {
    const result = addPrescriptionSchema.safeParse({
      ...base,
      tempoEccentricSeconds: 3,
      tempoPauseBottomSeconds: 1,
      tempoConcentricSeconds: 1,
      tempoPauseTopSeconds: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an RPE/RIR-based prescription within 0-10", () => {
    expect(addPrescriptionSchema.safeParse({ ...base, targetRpe: 8.5 }).success).toBe(
      true,
    );
    expect(addPrescriptionSchema.safeParse({ ...base, targetRir: 2 }).success).toBe(true);
    expect(addPrescriptionSchema.safeParse({ ...base, targetRpe: 11 }).success).toBe(
      false,
    );
    expect(addPrescriptionSchema.safeParse({ ...base, targetRir: -1 }).success).toBe(
      false,
    );
  });

  it("rejects an inverted rep range (max below min)", () => {
    const result = addPrescriptionSchema.safeParse({
      ...base,
      targetRepsMin: 12,
      targetRepsMax: 8,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a circuit/superset set with no reps (round-based) as long as another target is present", () => {
    const result = addPrescriptionSchema.safeParse({
      ...base,
      completionRule: "amrap",
      targetDurationSeconds: 45,
    });
    expect(result.success).toBe(true);
  });

  it("allows updatePrescriptionSchema to omit setRole (partial update)", () => {
    const result = updatePrescriptionSchema.safeParse({
      prescriptionId: "9f8b9b0a-1111-4a11-8a11-000000000001",
      expectedVersion: 1,
      targetWeightKg: 65,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an out-of-range weight", () => {
    const result = addPrescriptionSchema.safeParse({ ...base, targetWeightKg: -5 });
    expect(result.success).toBe(false);
  });
});
