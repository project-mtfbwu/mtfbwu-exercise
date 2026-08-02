import { describe, expect, it } from "vitest";
import { calculateDailyCompletion, moduleActivityMap } from "@/modules/daily/completion";
import type { DailyOverview } from "@/modules/daily/types";

function emptyOverview(overrides: Partial<DailyOverview> = {}): DailyOverview {
  return {
    localDate: "2026-08-01",
    timezone: "UTC",
    nutrition: {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      hasMissing: false,
      missingNutrients: [],
      mealCount: 0,
      itemCount: 0,
    },
    workout: { scheduled: null, activeSession: null },
    rehab: {
      scheduled: null,
      activeSession: null,
      hasActiveRestrictions: false,
    },
    progress: {
      weightEntry: null,
      measurementCount: 0,
      photoSetCount: 0,
      noteCount: 0,
      latestPhotoSetDate: null,
    },
    hydration: { totalMl: 0, entryCount: 0, target: null, recentEntries: [] },
    meditation: {
      totalDurationSeconds: 0,
      sessionCount: 0,
      completedCount: 0,
      recentSessions: [],
    },
    sleep: { sessions: [], primarySession: null, totalDurationSeconds: 0 },
    supplements: {
      activeSupplements: [],
      intakes: [],
      takenCount: 0,
      skippedCount: 0,
      totalActive: 0,
    },
    customTrackers: [],
    workoutHasCompletedSession: false,
    rehabHasCompletedSession: false,
    completion: { activeCount: 0, trackedModules: 10, percent: 0 },
    ...overrides,
  };
}

describe("calculateDailyCompletion", () => {
  it("returns 0% when nothing logged", () => {
    const c = calculateDailyCompletion(emptyOverview());
    expect(c.activeCount).toBe(0);
    expect(c.percent).toBe(0);
  });

  it("counts modules with activity", () => {
    const c = calculateDailyCompletion(
      emptyOverview({
        hydration: { totalMl: 500, entryCount: 1, target: null, recentEntries: [] },
        meditation: {
          totalDurationSeconds: 300,
          sessionCount: 1,
          completedCount: 1,
          recentSessions: [],
        },
      }),
    );
    expect(c.activeCount).toBe(2);
    expect(c.percent).toBe(20);
  });
});

describe("moduleActivityMap", () => {
  it("marks hydration active when entries exist", () => {
    const map = moduleActivityMap(
      emptyOverview({
        hydration: { totalMl: 250, entryCount: 1, target: null, recentEntries: [] },
      }),
    );
    expect(map.hydration).toBe(true);
    expect(map.sleep).toBe(false);
  });
});
