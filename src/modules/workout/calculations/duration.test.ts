import { describe, expect, it } from "vitest";
import { sessionDurationSeconds, sumSetDurations } from "./index";

describe("sessionDurationSeconds", () => {
  it("calculates whole seconds between start and completion", () => {
    expect(
      sessionDurationSeconds("2026-01-01T10:00:00.000Z", "2026-01-01T10:45:30.000Z"),
    ).toBe(45 * 60 + 30);
  });

  it("accepts Date instances", () => {
    const start = new Date("2026-01-01T10:00:00.000Z");
    const end = new Date("2026-01-01T10:01:00.000Z");
    expect(sessionDurationSeconds(start, end)).toBe(60);
  });

  it("returns null while the session is still in progress", () => {
    expect(sessionDurationSeconds("2026-01-01T10:00:00.000Z", null)).toBeNull();
    expect(sessionDurationSeconds("2026-01-01T10:00:00.000Z", undefined)).toBeNull();
  });

  it("returns null for unparsable timestamps", () => {
    expect(sessionDurationSeconds("not-a-date", "2026-01-01T10:00:00.000Z")).toBeNull();
  });

  it("returns null when completion precedes the start", () => {
    expect(
      sessionDurationSeconds("2026-01-01T10:00:00.000Z", "2026-01-01T09:00:00.000Z"),
    ).toBeNull();
  });
});

describe("sumSetDurations", () => {
  it("sums durations across timed sets", () => {
    expect(
      sumSetDurations([
        { durationSeconds: 30 },
        { durationSeconds: 45 },
        { durationSeconds: 60 },
      ]),
    ).toBe(135);
  });

  it("ignores sets without a usable duration", () => {
    expect(
      sumSetDurations([
        { durationSeconds: 30 },
        { durationSeconds: null },
        { durationSeconds: undefined },
        { durationSeconds: -10 },
        { durationSeconds: Number.NaN },
      ]),
    ).toBe(30);
  });

  it("returns zero for no sets", () => {
    expect(sumSetDurations([])).toBe(0);
  });
});
