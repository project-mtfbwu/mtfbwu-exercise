import { describe, expect, it } from "vitest";
import {
  formatSleepDuration,
  sleepDateFromBedtime,
  sleepDurationSeconds,
  sleepWeekDescriptiveText,
} from "@/modules/sleep/calculations/helpers";
import type { SleepSessionView } from "@/modules/sleep/types";

describe("sleepDateFromBedtime", () => {
  it("uses local date of bedtime in timezone", () => {
    // 11 PM ET on Aug 1 = Aug 1 sleep date even if UTC is Aug 2
    const date = sleepDateFromBedtime("2026-08-02T03:00:00.000Z", "America/New_York");
    expect(date).toBe("2026-08-01");
  });

  it("handles UTC timezone", () => {
    expect(sleepDateFromBedtime("2026-08-01T22:00:00.000Z", "UTC")).toBe("2026-08-01");
  });
});

describe("sleepDurationSeconds", () => {
  it("computes cross-midnight duration", () => {
    const seconds = sleepDurationSeconds(
      "2026-08-01T22:00:00.000Z",
      "2026-08-02T06:00:00.000Z",
    );
    expect(seconds).toBe(8 * 3600);
  });

  it("returns 0 for invalid order", () => {
    expect(
      sleepDurationSeconds("2026-08-02T06:00:00.000Z", "2026-08-01T22:00:00.000Z"),
    ).toBe(0);
  });
});

describe("formatSleepDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatSleepDuration(7 * 3600 + 30 * 60)).toBe("7 h 30 min");
    expect(formatSleepDuration(45 * 60)).toBe("45 min");
  });
});

describe("sleepWeekDescriptiveText", () => {
  const session = (date: string, hours: number): SleepSessionView => ({
    id: crypto.randomUUID(),
    sleepDate: date,
    timezone: "UTC",
    bedtimeAt: `${date}T22:00:00.000Z`,
    wakeAt: `${date}T06:00:00.000Z`,
    durationSeconds: hours * 3600,
    quality: null,
    interruptions: null,
    nap: false,
    source: "manual",
    note: null,
  });

  it("returns neutral text for empty week", () => {
    expect(sleepWeekDescriptiveText([], "2026-08-01", "2026-08-07").descriptiveText).toBe(
      "No sleep entries this week.",
    );
  });

  it("averages non-nap sessions", () => {
    const result = sleepWeekDescriptiveText(
      [session("2026-08-01", 7), session("2026-08-02", 8)],
      "2026-08-01",
      "2026-08-07",
    );
    expect(result.averageHours).toBe(7.5);
    expect(result.descriptiveText).toContain("7.5 hours");
  });
});
