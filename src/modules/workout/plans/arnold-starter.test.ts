import { describe, expect, it } from "vitest";
import { ARNOLD_STARTER_PLAN, ARNOLD_STARTER_NOTE } from "./arnold-starter";

function collectKeys(value: unknown, keys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
}

describe("ARNOLD_STARTER_PLAN", () => {
  it("has six training days", () => {
    expect(ARNOLD_STARTER_PLAN.days).toHaveLength(6);
  });

  it("covers Monday through Saturday exactly once each", () => {
    const daysOfWeek = ARNOLD_STARTER_PLAN.days.map((day) => day.dayOfWeek).sort();
    expect(daysOfWeek).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("gives every day at least one superset block", () => {
    for (const day of ARNOLD_STARTER_PLAN.days) {
      const supersetBlocks = day.blocks.filter((b) => b.blockType === "superset");
      expect(supersetBlocks.length).toBeGreaterThan(0);
      for (const superset of supersetBlocks) {
        expect(superset.exercises.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("gives every day a warmup block", () => {
    for (const day of ARNOLD_STARTER_PLAN.days) {
      expect(day.blocks.some((b) => b.blockType === "warmup")).toBe(true);
    }
  });

  it("never invents a weight/load field anywhere in the prescription data", () => {
    const keys = new Set<string>();
    collectKeys(ARNOLD_STARTER_PLAN, keys);
    for (const key of keys) {
      expect(key.toLowerCase()).not.toMatch(/weight|load/);
    }
  });

  it("only prescribes finite, ordered rep ranges — never a specific rep count masquerading as a load", () => {
    for (const day of ARNOLD_STARTER_PLAN.days) {
      for (const b of day.blocks) {
        for (const ex of b.exercises) {
          expect(ex.sets.length).toBeGreaterThan(0);
          for (const set of ex.sets) {
            expect(Number.isFinite(set.repsMin)).toBe(true);
            expect(Number.isFinite(set.repsMax)).toBe(true);
            expect(set.repsMin).toBeGreaterThan(0);
            expect(set.repsMax).toBeGreaterThanOrEqual(set.repsMin);
          }
        }
      }
    }
  });

  it("references only known set roles and block types", () => {
    for (const day of ARNOLD_STARTER_PLAN.days) {
      for (const b of day.blocks) {
        expect(["warmup", "straight_sets", "superset"]).toContain(b.blockType);
        for (const ex of b.exercises) {
          for (const set of ex.sets) {
            expect(["warmup", "working"]).toContain(set.role);
          }
        }
      }
    }
  });

  it("uses non-empty, snake_case exercise stable keys", () => {
    for (const day of ARNOLD_STARTER_PLAN.days) {
      for (const b of day.blocks) {
        for (const ex of b.exercises) {
          expect(ex.exerciseStableKey).toMatch(/^[a-z][a-z0-9_]*$/);
        }
      }
    }
  });

  it("carries a not-medical-advice disclaimer in the description", () => {
    expect(ARNOLD_STARTER_PLAN.description).toBe(ARNOLD_STARTER_NOTE);
    expect(ARNOLD_STARTER_PLAN.description.toLowerCase()).toContain("not medical");
  });
});
