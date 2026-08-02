import { describe, expect, it } from "vitest";
import {
  countCustomEventsByDate,
  filterCustomTrackerEventRows,
} from "@/modules/calendar/month-indicator-helpers";

describe("custom tracker month indicators", () => {
  const events = [
    { local_date: "2026-08-01", user_tracker_id: "custom-1" },
    { local_date: "2026-08-01", user_tracker_id: "catalog-1" },
    { local_date: "2026-08-02", user_tracker_id: "custom-2" },
  ];
  const customIds = new Set(["custom-1", "custom-2"]);

  it("filters to custom tracker ids only", () => {
    expect(filterCustomTrackerEventRows(events, customIds)).toHaveLength(2);
  });

  it("counts custom events once per day", () => {
    const counts = countCustomEventsByDate(events, customIds);
    expect(counts.get("2026-08-01")).toBe(1);
    expect(counts.get("2026-08-02")).toBe(1);
    expect(counts.has("2026-08-03")).toBe(false);
  });
});
