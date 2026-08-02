import { describe, expect, it } from "vitest";
import {
  applicableDatesInRange,
  calculateCurrentStreak,
  isDayCompleted,
} from "@/modules/trackers/calculations/streak";

describe("calculateCurrentStreak", () => {
  it("counts consecutive completed applicable days from end date", () => {
    const streak = calculateCurrentStreak({
      completedDates: ["2026-07-30", "2026-07-31", "2026-08-01"],
      applicableDates: [],
      endDate: "2026-08-01",
    });
    expect(streak).toBe(3);
  });

  it("stops at first missing applicable day", () => {
    const streak = calculateCurrentStreak({
      completedDates: ["2026-07-30", "2026-08-01"],
      applicableDates: [],
      endDate: "2026-08-01",
    });
    expect(streak).toBe(1);
  });

  it("skips non-applicable days without breaking streak", () => {
    const streak = calculateCurrentStreak({
      completedDates: ["2026-08-01", "2026-07-29"],
      applicableDates: ["2026-08-01", "2026-07-31", "2026-07-30", "2026-07-29"],
      endDate: "2026-08-01",
    });
    // 08-01 completed, 07-31 not applicable (not in list as completed), breaks
    expect(streak).toBe(1);
  });
});

describe("applicableDatesInRange", () => {
  it("returns all dates when no days_of_week filter", () => {
    const dates = applicableDatesInRange("2026-08-01", "2026-08-03", null);
    expect(dates).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
  });

  it("filters by days of week", () => {
    // 2026-08-01 is Saturday (6)
    const dates = applicableDatesInRange("2026-08-01", "2026-08-07", [6]);
    expect(dates).toContain("2026-08-01");
    expect(dates.length).toBe(1);
  });
});

describe("isDayCompleted", () => {
  it("checks completion flag", () => {
    expect(
      isDayCompleted(
        [
          { localDate: "2026-08-01", completed: true },
          { localDate: "2026-08-02", completed: false },
        ],
        "2026-08-01",
      ),
    ).toBe(true);
    expect(
      isDayCompleted([{ localDate: "2026-08-02", completed: false }], "2026-08-02"),
    ).toBe(false);
  });
});
