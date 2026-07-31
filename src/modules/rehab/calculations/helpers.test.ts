import { describe, expect, it } from "vitest";
import {
  averageConfidence,
  assistanceTrend,
  comparePainTrend,
  compareRomProgression,
  countAlerts,
  countCompletedSets,
  isExerciseComplete,
  sessionDurationSeconds,
  sessionMaxPain,
} from "@/modules/rehab/calculations/helpers";

describe("countCompletedSets", () => {
  it("counts completed sets only", () => {
    expect(
      countCompletedSets([
        { status: "completed" },
        { status: "pending" },
        { status: "skipped" },
      ]),
    ).toBe(1);
  });
});

describe("isExerciseComplete", () => {
  it("returns true when all sets are terminal", () => {
    expect(
      isExerciseComplete({
        sets: [{ status: "completed" }, { status: "skipped" }],
      }),
    ).toBe(true);
  });

  it("returns false when a set is pending", () => {
    expect(
      isExerciseComplete({
        sets: [{ status: "completed" }, { status: "pending" }],
      }),
    ).toBe(false);
  });
});

describe("sessionDurationSeconds", () => {
  it("computes elapsed seconds", () => {
    expect(sessionDurationSeconds("2026-07-31T10:00:00Z", "2026-07-31T10:05:00Z")).toBe(
      300,
    );
  });
});

describe("comparePainTrend", () => {
  it("returns null for incompatible records", () => {
    expect(comparePainTrend({ previousMaxPain: null, currentMaxPain: 5 })).toBeNull();
  });

  it("uses plain language for lower pain", () => {
    expect(comparePainTrend({ previousMaxPain: 6, currentMaxPain: 4 })).toBe(
      "Pain was lower than last session",
    );
  });

  it("uses plain language for higher pain", () => {
    expect(comparePainTrend({ previousMaxPain: 3, currentMaxPain: 5 })).toBe(
      "Pain was higher than last session",
    );
  });
});

describe("averageConfidence", () => {
  it("returns null when no confidence values", () => {
    expect(averageConfidence([{ status: "completed", confidence: null }])).toBeNull();
  });

  it("averages confidence values", () => {
    expect(
      averageConfidence([
        { status: "completed", confidence: 6 },
        { status: "completed", confidence: 8 },
      ]),
    ).toBe(7);
  });
});

describe("compareRomProgression", () => {
  it("reports range increase in plain language", () => {
    expect(compareRomProgression({ previousRom: 80, currentRom: 90 })).toBe(
      "Range increased by 10° compared to last session",
    );
  });
});

describe("assistanceTrend", () => {
  it("detects newly recorded assistance", () => {
    expect(assistanceTrend({ previousAmount: null, currentAmount: "Band assist" })).toBe(
      "Assistance was recorded this session",
    );
  });
});

describe("countAlerts", () => {
  it("counts unacknowledged alerts", () => {
    expect(
      countAlerts([{ acknowledgedAt: null }, { acknowledgedAt: "2026-07-31T10:00:00Z" }]),
    ).toEqual({ total: 2, unacknowledged: 1 });
  });
});

describe("sessionMaxPain", () => {
  it("uses max of before/during/after", () => {
    expect(
      sessionMaxPain([
        { status: "completed", painBefore: 2, painDuring: 5, painAfter: 3 },
      ]),
    ).toBe(5);
  });
});
