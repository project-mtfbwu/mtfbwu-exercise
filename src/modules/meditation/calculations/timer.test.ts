import { describe, expect, it } from "vitest";
import {
  formatMeditationDuration,
  meditationDurationSeconds,
  meditationStatusLabel,
  pauseIntervalsFromDraft,
} from "@/modules/meditation/calculations/timer";

describe("meditationDurationSeconds", () => {
  it("computes simple elapsed duration", () => {
    const seconds = meditationDurationSeconds({
      startedAt: "2026-08-01T10:00:00.000Z",
      completedAt: "2026-08-01T10:05:00.000Z",
      pauseIntervals: [],
    });
    expect(seconds).toBe(300);
  });

  it("subtracts pause intervals", () => {
    const seconds = meditationDurationSeconds({
      startedAt: "2026-08-01T10:00:00.000Z",
      completedAt: "2026-08-01T10:10:00.000Z",
      pauseIntervals: [
        { pauseStart: "2026-08-01T10:03:00.000Z", pauseEnd: "2026-08-01T10:05:00.000Z" },
      ],
    });
    expect(seconds).toBe(480);
  });

  it("handles open pause with nowIso", () => {
    const seconds = meditationDurationSeconds({
      startedAt: "2026-08-01T10:00:00.000Z",
      completedAt: null,
      pauseIntervals: [],
      nowIso: "2026-08-01T10:02:00.000Z",
    });
    expect(seconds).toBe(120);
  });

  it("handles resume after pause via draft arrays", () => {
    const intervals = pauseIntervalsFromDraft(
      ["2026-08-01T10:01:00.000Z"],
      ["2026-08-01T10:02:00.000Z"],
    );
    const seconds = meditationDurationSeconds({
      startedAt: "2026-08-01T10:00:00.000Z",
      completedAt: "2026-08-01T10:04:00.000Z",
      pauseIntervals: intervals,
    });
    expect(seconds).toBe(180);
  });
});

describe("meditationStatusLabel", () => {
  it("shows not started when empty", () => {
    expect(meditationStatusLabel(0, 0)).toBe("Meditation · not started");
  });

  it("shows minutes and session count", () => {
    expect(meditationStatusLabel(600, 1)).toBe("10 min · 1 session");
    expect(meditationStatusLabel(1200, 2)).toBe("20 min · 2 sessions");
  });
});

describe("formatMeditationDuration", () => {
  it("formats mm:ss", () => {
    expect(formatMeditationDuration(125)).toBe("2:05");
    expect(formatMeditationDuration(60)).toBe("1:00");
  });
});
