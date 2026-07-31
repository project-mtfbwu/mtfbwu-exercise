import { describe, expect, it } from "vitest";
import { rehabStatusLabel, workoutStatusLabel } from "@/shared/board/board-model";
import type { ModuleDefinition, DailyModuleStatus } from "@/shared/database/types";

const workoutDefinition = {
  id: "def-workout",
  key: "workout",
  display_name: "Workout",
} as ModuleDefinition;

const rehabDefinition = {
  id: "def-rehab",
  key: "rehab",
  display_name: "Rehab",
} as ModuleDefinition;

describe("workoutStatusLabel", () => {
  it("shows active session progress", () => {
    expect(
      workoutStatusLabel(
        {
          scheduled: null,
          activeSession: {
            id: "s1",
            title: "Push day",
            startedAt: "2026-07-30T10:00:00Z",
            totalSets: 12,
            completedSets: 4,
          },
        },
        workoutDefinition,
        null,
        null,
      ),
    ).toBe("Push day · 4/12 sets");
  });

  it("shows scheduled workout when no active session", () => {
    expect(
      workoutStatusLabel(
        {
          scheduled: { id: "sch-1", title: "Leg day", status: "planned" },
          activeSession: null,
        },
        workoutDefinition,
        null,
        null,
      ),
    ).toBe("Leg day scheduled");
  });

  it("falls back to daily status label", () => {
    const status = { status: "not_started", summary_text: null } as DailyModuleStatus;
    expect(
      workoutStatusLabel(
        { scheduled: null, activeSession: null },
        workoutDefinition,
        status,
        null,
      ),
    ).toBe("Workout · not started");
  });
});

describe("rehabStatusLabel", () => {
  it("shows active session progress with alerts", () => {
    expect(
      rehabStatusLabel(
        {
          scheduled: null,
          hasActiveRestrictions: false,
          activeSession: {
            id: "s1",
            title: "Knee day",
            startedAt: "2026-07-31T10:00:00Z",
            totalSets: 8,
            completedSets: 3,
            unacknowledgedAlerts: 1,
            averageConfidence: 6,
            maxPain: 4,
          },
        },
        rehabDefinition,
        null,
        null,
      ),
    ).toBe("Knee day · 3/8 sets · 1 alert");
  });

  it("shows scheduled rehab when no active session", () => {
    expect(
      rehabStatusLabel(
        {
          scheduled: { id: "sch-1", title: "Mobility", status: "planned" },
          activeSession: null,
          hasActiveRestrictions: false,
        },
        rehabDefinition,
        null,
        null,
      ),
    ).toBe("Mobility scheduled");
  });

  it("falls back to daily status label", () => {
    const status = { status: "not_started", summary_text: null } as DailyModuleStatus;
    expect(
      rehabStatusLabel(
        { scheduled: null, activeSession: null, hasActiveRestrictions: false },
        rehabDefinition,
        status,
        null,
      ),
    ).toBe("Rehab · not started");
  });
});
