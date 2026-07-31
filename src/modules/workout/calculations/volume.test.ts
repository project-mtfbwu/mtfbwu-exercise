import { describe, expect, it } from "vitest";
import {
  countCompletedSets,
  countSets,
  exerciseVolume,
  setVolume,
  summarizeSetCounts,
  totalSessionVolume,
} from "./index";
import type { PerformedSetLike } from "./index";

function strengthSet(overrides: Partial<PerformedSetLike> = {}): PerformedSetLike {
  return {
    kind: "strength",
    status: "completed",
    reps: 10,
    load: 100,
    loadUnit: "kg",
    ...overrides,
  };
}

describe("exerciseVolume", () => {
  it("sums load times reps for completed strength sets", () => {
    const sets = [
      strengthSet({ load: 100, reps: 10 }),
      strengthSet({ load: 100, reps: 8 }),
      strengthSet({ load: 90, reps: 8 }),
    ];

    expect(exerciseVolume(sets)).toBe(1000 + 800 + 720);
  });

  it("counts a caller-resolved bodyweight load like any other strength set", () => {
    const set = strengthSet({ loadUnit: "bodyweight", load: 75, reps: 10 });
    expect(setVolume(set)).toBe(750);
  });

  it("contributes nothing for an unresolved bodyweight load", () => {
    const set = strengthSet({ loadUnit: "bodyweight", load: null, reps: 10 });
    expect(setVolume(set)).toBe(0);
  });

  it("doubles load for per-hand dumbbell sets", () => {
    const set = strengthSet({ load: 20, reps: 10, dumbbellSemantics: "per_hand" });
    expect(setVolume(set)).toBe(20 * 2 * 10);
  });

  it("does not double load for total-combined dumbbell sets", () => {
    const set = strengthSet({ load: 40, reps: 10, dumbbellSemantics: "total_combined" });
    expect(setVolume(set)).toBe(40 * 10);
  });

  it("does not auto-double a unilateral set without per-hand dumbbell semantics", () => {
    const barbellUnilateral = strengthSet({ load: 60, reps: 8, isUnilateral: true });
    expect(setVolume(barbellUnilateral)).toBe(60 * 8);

    const totalCombinedUnilateral = strengthSet({
      load: 30,
      reps: 8,
      isUnilateral: true,
      dumbbellSemantics: "total_combined",
    });
    expect(setVolume(totalCombinedUnilateral)).toBe(30 * 8);
  });

  it("still doubles a unilateral set when per-hand dumbbell semantics apply", () => {
    const set = strengthSet({
      load: 15,
      reps: 8,
      isUnilateral: true,
      dumbbellSemantics: "per_hand",
    });
    expect(setVolume(set)).toBe(15 * 2 * 8);
  });

  it("excludes timed holds from volume", () => {
    const timedHold = strengthSet({
      kind: "timed",
      reps: null,
      load: null,
      durationSeconds: 60,
    });
    expect(setVolume(timedHold)).toBe(0);
  });

  it("excludes distance cardio from volume", () => {
    const row = strengthSet({
      kind: "distance",
      reps: null,
      load: null,
      distance: 2000,
      distanceUnit: "m",
    });
    expect(setVolume(row)).toBe(0);

    // Even if load/reps happen to be present, distance sets never count.
    const rowWithStrayValues = strengthSet({
      kind: "distance",
      distance: 500,
      distanceUnit: "m",
    });
    expect(setVolume(rowWithStrayValues)).toBe(0);
  });

  it("excludes skipped sets", () => {
    const skipped = strengthSet({ status: "skipped" });
    expect(setVolume(skipped)).toBe(0);
  });

  it("includes partial sets using the reps actually performed", () => {
    const partial = strengthSet({ status: "partial", load: 100, reps: 4 });
    expect(setVolume(partial)).toBe(400);
  });

  it("sums a drop set's successive reduced-load sets", () => {
    const dropSet = [
      strengthSet({ load: 100, reps: 8 }),
      strengthSet({ load: 80, reps: 6 }),
      strengthSet({ load: 60, reps: 6 }),
    ];

    expect(exerciseVolume(dropSet)).toBe(800 + 480 + 360);
  });

  it.each([
    ["zero load", { load: 0 }],
    ["negative load", { load: -20 }],
    ["zero reps", { reps: 0 }],
    ["negative reps", { reps: -5 }],
    ["non-finite load", { load: Number.NaN }],
  ])("treats %s as no volume", (_, overrides) => {
    expect(setVolume(strengthSet(overrides))).toBe(0);
  });
});

describe("totalSessionVolume", () => {
  it("sums exercise volume across an entire session", () => {
    const benchPress = {
      exerciseId: "bench-press",
      sets: [strengthSet({ load: 100, reps: 8 }), strengthSet({ load: 100, reps: 8 })],
    };
    const legPress = {
      exerciseId: "leg-press",
      sets: [strengthSet({ load: 200, reps: 10 })],
    };

    expect(totalSessionVolume([benchPress, legPress])).toBe(1600 + 2000);
  });

  it("returns zero for an empty session", () => {
    expect(totalSessionVolume([])).toBe(0);
  });
});

describe("set counting", () => {
  it("counts all sets regardless of status", () => {
    const sets = [
      strengthSet({ status: "completed" }),
      strengthSet({ status: "partial" }),
      strengthSet({ status: "skipped" }),
    ];
    expect(countSets(sets)).toBe(3);
  });

  it("counts only completed sets", () => {
    const sets = [
      strengthSet({ status: "completed" }),
      strengthSet({ status: "partial" }),
      strengthSet({ status: "skipped" }),
    ];
    expect(countCompletedSets(sets)).toBe(1);
  });

  it("summarizes total and completed counts together", () => {
    const sets = [
      strengthSet({ status: "completed" }),
      strengthSet({ status: "completed" }),
      strengthSet({ status: "skipped" }),
    ];
    expect(summarizeSetCounts(sets)).toEqual({ totalSets: 3, completedSets: 2 });
  });
});
