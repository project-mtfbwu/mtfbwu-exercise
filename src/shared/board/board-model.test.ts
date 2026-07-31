import { describe, expect, it } from "vitest";
import { workoutStatusLabel } from "@/shared/board/board-model";
import type { ModuleDefinition, DailyModuleStatus } from "@/shared/database/types";

const definition = {
  id: "def-1",
  key: "workout",
  display_name: "Workout",
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
        definition,
        null,
        null,
      ),
    ).toBe("Push day · 4/12 sets");
  });

  it("shows scheduled plan when no active session", () => {
    expect(
      workoutStatusLabel(
        {
          scheduled: { id: "sch-1", title: "Leg day", status: "planned" },
          activeSession: null,
        },
        definition,
        null,
        null,
      ),
    ).toBe("Leg day scheduled");
  });

  it("falls back to daily status label", () => {
    const status = {
      status: "not_started",
      summary_text: null,
    } as DailyModuleStatus;
    expect(
      workoutStatusLabel(
        { scheduled: null, activeSession: null },
        definition,
        status,
        null,
      ),
    ).toBe("Workout · not started");
  });
});
