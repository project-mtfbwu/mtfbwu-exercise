import { describe, expect, it } from "vitest";
import {
  formatHydrationAmount,
  hydrationProgress,
  hydrationProgressLabel,
  sumHydrationMl,
} from "@/modules/hydration/calculations/helpers";
import type { HydrationDaySummary, HydrationEntryView } from "@/modules/hydration/types";

const entry = (ml: number): HydrationEntryView => ({
  id: crypto.randomUUID(),
  localDate: "2026-08-01",
  occurredAt: new Date().toISOString(),
  amountMl: ml,
  vesselLabel: null,
  source: "manual",
  note: null,
});

describe("sumHydrationMl", () => {
  it("sums entry amounts", () => {
    expect(sumHydrationMl([entry(250), entry(500)])).toBe(750);
  });

  it("returns 0 for empty list", () => {
    expect(sumHydrationMl([])).toBe(0);
  });
});

describe("hydrationProgressLabel", () => {
  it("shows not started when no entries", () => {
    const summary: HydrationDaySummary = {
      totalMl: 0,
      entryCount: 0,
      target: null,
      recentEntries: [],
    };
    expect(hydrationProgressLabel(summary)).toBe("Hydration · not started");
  });

  it("shows total without target when unconfirmed", () => {
    const summary: HydrationDaySummary = {
      totalMl: 1500,
      entryCount: 2,
      target: { targetMl: 2000, confirmedByUser: false, effectiveFrom: "2026-08-01" },
      recentEntries: [],
    };
    expect(hydrationProgressLabel(summary)).toContain("1.5 L logged");
    expect(hydrationProgressLabel(summary)).toContain("target not set");
  });

  it("shows progress against confirmed target", () => {
    const summary: HydrationDaySummary = {
      totalMl: 1000,
      entryCount: 1,
      target: { targetMl: 2000, confirmedByUser: true, effectiveFrom: "2026-08-01" },
      recentEntries: [],
    };
    expect(hydrationProgressLabel(summary)).toBe("1.0 / 2.0 L");
  });
});

describe("hydrationProgress", () => {
  it("computes percent when target confirmed", () => {
    const summary: HydrationDaySummary = {
      totalMl: 500,
      entryCount: 1,
      target: { targetMl: 1000, confirmedByUser: true, effectiveFrom: "2026-08-01" },
      recentEntries: [],
    };
    expect(hydrationProgress(summary).percent).toBe(50);
  });

  it("returns null percent when target unconfirmed", () => {
    const summary: HydrationDaySummary = {
      totalMl: 500,
      entryCount: 1,
      target: { targetMl: 1000, confirmedByUser: false, effectiveFrom: "2026-08-01" },
      recentEntries: [],
    };
    expect(hydrationProgress(summary).percent).toBeNull();
  });
});

describe("formatHydrationAmount", () => {
  it("formats liters for large amounts", () => {
    expect(formatHydrationAmount(1500)).toBe("1.5 L");
  });

  it("formats ml for small amounts", () => {
    expect(formatHydrationAmount(250)).toBe("250 ml");
  });
});
