import { describe, expect, it } from "vitest";
import { progressStatusLabel } from "@/shared/board/board-model";
import type { DailyModuleStatus, ModuleDefinition } from "@/shared/database/types";
import type { ProgressDaySummary } from "@/modules/progress/load-progress-day";

const baseDefinition = {
  id: "d1",
  key: "measurements",
  display_name: "Measurements",
  category: "body",
  description: "",
  default_enabled: true,
  default_order: 60,
  visual_variant: "paper_yellow",
  icon_key: "tape",
  supports_calendar: false,
  supports_target: false,
  is_active: true,
  created_at: "",
  updated_at: "",
} satisfies ModuleDefinition;

const emptySummary: ProgressDaySummary = {
  weightEntry: null,
  measurementCount: 0,
  photoSetCount: 0,
  noteCount: 0,
  latestPhotoSetDate: null,
};

describe("progressStatusLabel", () => {
  it("shows weight when logged today", () => {
    const label = progressStatusLabel(
      { ...emptySummary, weightEntry: { normalizedKg: 75, display: "75 kg" } },
      baseDefinition,
      null,
      null,
      "measurements",
    );
    expect(label).toBe("75 kg logged");
  });

  it("shows measurement count", () => {
    const label = progressStatusLabel(
      { ...emptySummary, measurementCount: 2 },
      baseDefinition,
      null,
      null,
      "measurements",
    );
    expect(label).toBe("2 measurement entries today");
  });

  it("shows photo set count for progress_photos module", () => {
    const photosDef = {
      ...baseDefinition,
      key: "progress_photos",
      display_name: "Progress photos",
    };
    const label = progressStatusLabel(
      { ...emptySummary, photoSetCount: 1 },
      photosDef,
      null,
      null,
      "progress_photos",
    );
    expect(label).toBe("1 photo set today");
  });

  it("falls back to generic status", () => {
    const status = {
      id: "s1",
      daily_record_id: "dr1",
      user_module_id: "um1",
      status: "not_started",
      summary_text: null,
      revision: 0,
      created_at: "",
      updated_at: "",
    } as DailyModuleStatus;
    const label = progressStatusLabel(
      emptySummary,
      baseDefinition,
      status,
      null,
      "measurements",
    );
    expect(label).toContain("not started");
  });
});
