import { describe, expect, it } from "vitest";
import {
  clampToLoggableLocalDate,
  compareLocalDates,
  formatLocalDate,
  isFutureLocalDate,
  localDateFromInstant,
  localDateTimeToUtcIso,
  localTimeFromInstant,
  shiftLocalDate,
  todayLocalDate,
} from "@/shared/utils/local-date";
import { sleepDateFromBedtime } from "@/modules/sleep/calculations";

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

  it("localDateFromInstant uses timezone for sleep date assignment", () => {
    expect(localDateFromInstant("2026-08-02T03:00:00.000Z", "America/New_York")).toBe(
      "2026-08-01",
    );
  });

  it("localDateTimeToUtcIso respects America/New_York offset", () => {
    const iso = localDateTimeToUtcIso("2026-07-15", "22:00", "America/New_York");
    expect(localTimeFromInstant(iso, "America/New_York")).toBe("22:00");
    expect(localDateFromInstant(iso, "America/New_York")).toBe("2026-07-15");
  });

  it("localDateTimeToUtcIso handles DST spring forward gap pragmatically", () => {
    // 2026-03-08 02:30 does not exist in America/New_York — iteration lands on valid instant
    const iso = localDateTimeToUtcIso("2026-03-08", "02:30", "America/New_York");
    expect(typeof iso).toBe("string");
    expect(iso.endsWith("Z")).toBe(true);
  });

  it("localDateTimeToUtcIso handles DST fall back", () => {
    const iso = localDateTimeToUtcIso("2026-11-01", "01:30", "America/New_York");
    expect(localTimeFromInstant(iso, "America/New_York")).toBe("01:30");
  });

  it("historical sleep_date stays tied to session timezone", () => {
    const bedtimeAt = "2026-07-02T06:00:00.000Z";
    const sessionTimezone = "America/New_York";
    const storedSleepDate = "2026-07-02";
    expect(sleepDateFromBedtime(bedtimeAt, sessionTimezone)).toBe(storedSleepDate);
    // Recomputing the same instant with a different profile TZ would yield a different date —
    // edits must use session.timezone, not the current profile timezone.
    expect(sleepDateFromBedtime(bedtimeAt, "America/Los_Angeles")).toBe("2026-07-01");
    expect(sleepDateFromBedtime(bedtimeAt, "America/Los_Angeles")).not.toBe(
      storedSleepDate,
    );
  });
});
