import { describe, expect, it } from "vitest";
import {
  computeRemaining,
  formatRestTimer,
  readPersistedRestTimer,
  writePersistedRestTimer,
} from "@/modules/workout/sessions/rest-timer-utils";

describe("computeRemaining", () => {
  const now = 1_000_000;

  it("returns ceil seconds until endAt when running", () => {
    expect(computeRemaining(now + 5_500, now, null, false)).toBe(6);
    expect(computeRemaining(now + 500, now, null, false)).toBe(1);
    expect(computeRemaining(now - 100, now, null, false)).toBe(0);
  });

  it("uses pausedRemaining when paused", () => {
    expect(computeRemaining(null, now, 12_500, true)).toBe(13);
    expect(computeRemaining(now + 99_000, now, 4_000, true)).toBe(4);
  });

  it("returns 0 when idle", () => {
    expect(computeRemaining(null, now, null, false)).toBe(0);
  });
});

describe("formatRestTimer", () => {
  it("formats mm:ss", () => {
    expect(formatRestTimer(0)).toBe("0:00");
    expect(formatRestTimer(65)).toBe("1:05");
    expect(formatRestTimer(600)).toBe("10:00");
  });
});

describe("rest timer persistence helpers", () => {
  it("round-trips persisted state", () => {
    const key = "test-rest-timer";
    writePersistedRestTimer(key, {
      endAt: 123,
      pausedRemaining: null,
      isPaused: false,
    });
    expect(readPersistedRestTimer(key)).toEqual({
      endAt: 123,
      pausedRemaining: null,
      isPaused: false,
    });
    window.localStorage.removeItem(key);
  });
});
