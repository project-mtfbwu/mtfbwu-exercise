import { describe, expect, it } from "vitest";
import {
  clampToLoggableLocalDate,
  compareLocalDates,
  formatLocalDate,
  isFutureLocalDate,
  shiftLocalDate,
  todayLocalDate,
} from "@/shared/utils/local-date";

describe("local-date helpers", () => {
  it("formats America/Los_Angeles without UTC day slip near midnight UTC", () => {
    // 2026-07-27 05:30 UTC = still July 26 evening in LA
    const instant = new Date("2026-07-27T05:30:00.000Z");
    expect(formatLocalDate(instant, "America/Los_Angeles")).toBe("2026-07-26");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-07-27");
  });

  it("shifts calendar days without timezone math", () => {
    expect(shiftLocalDate("2026-07-26", -1)).toBe("2026-07-25");
    expect(shiftLocalDate("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("clamps future dates to today in the user timezone", () => {
    const now = new Date("2026-07-26T18:00:00.000Z");
    const today = todayLocalDate("UTC", now);
    expect(clampToLoggableLocalDate("2099-01-01", "UTC", now)).toBe(today);
    expect(isFutureLocalDate("2099-01-01", "UTC", now)).toBe(true);
    expect(compareLocalDates("2026-07-25", today)).toBe(-1);
  });
});
