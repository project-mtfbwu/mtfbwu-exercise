import { describe, expect, it } from "vitest";
import { buildReorderPlan, bumpVersionOrConflict, moveIdInOrder } from "./plan-tree";

describe("bumpVersionOrConflict", () => {
  it("bumps the version when expected matches actual", () => {
    expect(bumpVersionOrConflict(3, 3)).toEqual({ ok: true, nextVersion: 4 });
  });

  it("reports a conflict when expected does not match actual", () => {
    expect(bumpVersionOrConflict(2, 3)).toEqual({ ok: false, conflict: true });
  });
});

describe("buildReorderPlan", () => {
  it("produces temp orders at or above 100_000", () => {
    const plan = buildReorderPlan(["a", "b", "c"]);
    for (const step of plan.tempSteps) {
      expect(step.sortOrder).toBeGreaterThanOrEqual(100_000);
    }
  });

  it("produces dense final indices in input order", () => {
    expect(buildReorderPlan(["c", "a", "b"]).finalSteps).toEqual([
      { id: "c", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });
});

describe("moveIdInOrder", () => {
  const ids = ["phase-a", "phase-b", "phase-c"];

  it("moves an item down one slot", () => {
    expect(moveIdInOrder(ids, "phase-a", "down")).toEqual([
      "phase-b",
      "phase-a",
      "phase-c",
    ]);
  });

  it("moves an item up one slot", () => {
    expect(moveIdInOrder(ids, "phase-c", "up")).toEqual([
      "phase-a",
      "phase-c",
      "phase-b",
    ]);
  });

  it("is a no-op at the top boundary", () => {
    expect(moveIdInOrder(ids, "phase-a", "up")).toEqual(ids);
  });

  it("is a no-op at the bottom boundary", () => {
    expect(moveIdInOrder(ids, "phase-c", "down")).toEqual(ids);
  });

  it("is a no-op for an unknown id", () => {
    expect(moveIdInOrder(ids, "missing", "up")).toEqual(ids);
  });
});
