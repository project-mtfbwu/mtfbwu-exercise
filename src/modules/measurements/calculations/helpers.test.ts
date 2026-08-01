import { describe, expect, it } from "vitest";
import {
  DEFAULT_SAME_DAY_MODE,
  aggregateSameDayValues,
  delta,
  percentChange,
  trendText,
  weightChangeSummary,
  measurementChangeSummary,
} from "./helpers";

describe("delta and percentChange", () => {
  it("computes delta between two values", () => {
    expect(delta(70, 72)).toBe(2);
    expect(delta(72, 70)).toBe(-2);
  });

  it("returns null when either value missing", () => {
    expect(delta(null, 70)).toBeNull();
    expect(delta(70, null)).toBeNull();
  });

  it("computes percent change", () => {
    expect(percentChange(100, 110)).toBe(10);
    expect(percentChange(100, 90)).toBe(-10);
  });

  it("returns null percent when baseline is zero", () => {
    expect(percentChange(0, 5)).toBeNull();
  });
});

describe("aggregateSameDayValues", () => {
  const points = [
    { localDate: "2026-01-01", value: 70, recordedAt: "2026-01-01T08:00:00Z" },
    { localDate: "2026-01-01", value: 71, recordedAt: "2026-01-01T18:00:00Z" },
    { localDate: "2026-01-02", value: 72, recordedAt: "2026-01-02T09:00:00Z" },
  ];

  it(`defaults to ${DEFAULT_SAME_DAY_MODE} mode`, () => {
    const result = aggregateSameDayValues(points);
    expect(result).toHaveLength(2);
    expect(result[0]!.value).toBe(71);
  });

  it("uses first reading when mode is first", () => {
    const result = aggregateSameDayValues(points, "first");
    expect(result[0]!.value).toBe(70);
  });

  it("averages when mode is average", () => {
    const result = aggregateSameDayValues(points, "average");
    expect(result[0]!.value).toBe(70.5);
  });
});

describe("trendText", () => {
  it("uses neutral language", () => {
    expect(trendText(2, "Weight", { percentChange: 2.9 })).toContain("user-recorded");
    expect(trendText(0, "Waist")).toContain("No change");
    expect(trendText(-1.5, "Weight")).toContain("down");
  });

  it("returns null without delta", () => {
    expect(trendText(null, "Weight")).toBeNull();
  });
});

describe("weightChangeSummary", () => {
  it("bundles delta, percent, and trend", () => {
    const summary = weightChangeSummary(70, 72);
    expect(summary.delta).toBe(2);
    expect(summary.percentChange).toBeCloseTo(2.86, 1);
    expect(summary.trendText).toContain("up");
  });
});

describe("measurementChangeSummary", () => {
  it("uses measurement display name and unit in trend text", () => {
    const summary = measurementChangeSummary(80, 82, "Waist", "cm");
    expect(summary.delta).toBe(2);
    expect(summary.trendText).toContain("Waist (cm)");
    expect(summary.trendText).toContain("user-recorded");
  });
});
