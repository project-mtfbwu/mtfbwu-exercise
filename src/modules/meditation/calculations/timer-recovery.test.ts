import { describe, expect, it } from "vitest";
import {
  attachLocalDateGuard,
  cannotReopenCompleted,
  classifyTimerRecovery,
  computeTargetEndAt,
  oneActiveTimerGuard,
  remainingSeconds,
} from "@/modules/meditation/calculations/timer-recovery";
import type { MeditationTimerDraft } from "@/modules/meditation/types";

const NOW = "2026-08-01T10:10:00.000Z";

function baseDraft(overrides: Partial<MeditationTimerDraft> = {}): MeditationTimerDraft {
  return {
    sessionId: "sess-1",
    userId: "user-1",
    localDate: "2026-08-01",
    timezone: "America/New_York",
    meditationType: "mindfulness",
    targetSeconds: 600,
    note: null,
    startedAt: "2026-08-01T10:00:00.000Z",
    targetEndAt: "2026-08-01T10:10:00.000Z",
    phase: "active",
    pauseStartedAt: [],
    pauseEndedAt: [],
    pausedRemainingSeconds: null,
    accumulatedElapsedSeconds: 0,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("computeTargetEndAt", () => {
  it("adds target seconds to start when no pauses", () => {
    const end = computeTargetEndAt("2026-08-01T10:00:00.000Z", 600, []);
    expect(end).toBe("2026-08-01T10:10:00.000Z");
  });

  it("extends end by completed pause duration", () => {
    const end = computeTargetEndAt("2026-08-01T10:00:00.000Z", 600, [
      { pauseStart: "2026-08-01T10:03:00.000Z", pauseEnd: "2026-08-01T10:05:00.000Z" },
    ]);
    expect(end).toBe("2026-08-01T10:12:00.000Z");
  });

  it("extends end by open pause up to nowIso", () => {
    const end = computeTargetEndAt(
      "2026-08-01T10:00:00.000Z",
      600,
      [{ pauseStart: "2026-08-01T10:08:00.000Z", pauseEnd: null }],
      "2026-08-01T10:09:00.000Z",
    );
    expect(end).toBe("2026-08-01T10:11:00.000Z");
  });
});

describe("remainingSeconds", () => {
  it("returns paused remaining when paused", () => {
    expect(
      remainingSeconds({
        targetSeconds: 600,
        startedAt: "2026-08-01T10:00:00.000Z",
        pauseIntervals: [],
        now: NOW,
        paused: true,
        pausedRemaining: 240,
      }),
    ).toBe(240);
  });

  it("counts down toward target while active", () => {
    expect(
      remainingSeconds({
        targetSeconds: 600,
        startedAt: "2026-08-01T10:00:00.000Z",
        pauseIntervals: [],
        now: "2026-08-01T10:05:00.000Z",
        paused: false,
        pausedRemaining: null,
      }),
    ).toBe(300);
  });

  it("subtracts pause intervals from elapsed", () => {
    expect(
      remainingSeconds({
        targetSeconds: 600,
        startedAt: "2026-08-01T10:00:00.000Z",
        pauseIntervals: [
          {
            pauseStart: "2026-08-01T10:02:00.000Z",
            pauseEnd: "2026-08-01T10:04:00.000Z",
          },
        ],
        now: "2026-08-01T10:08:00.000Z",
        paused: false,
        pausedRemaining: null,
      }),
    ).toBe(240);
  });

  it("returns elapsed when no target", () => {
    expect(
      remainingSeconds({
        targetSeconds: null,
        startedAt: "2026-08-01T10:00:00.000Z",
        pauseIntervals: [],
        now: "2026-08-01T10:03:00.000Z",
        paused: false,
        pausedRemaining: null,
      }),
    ).toBe(180);
  });

  it("never returns negative remaining", () => {
    expect(
      remainingSeconds({
        targetSeconds: 60,
        startedAt: "2026-08-01T10:00:00.000Z",
        pauseIntervals: [],
        now: "2026-08-01T10:05:00.000Z",
        paused: false,
        pausedRemaining: null,
      }),
    ).toBe(0);
  });
});

describe("classifyTimerRecovery", () => {
  it("returns none for completed_synced", () => {
    expect(classifyTimerRecovery(baseDraft({ phase: "completed_synced" }), NOW)).toBe(
      "none",
    );
  });

  it("returns completed_queued", () => {
    expect(classifyTimerRecovery(baseDraft({ phase: "completed_queued" }), NOW)).toBe(
      "completed_queued",
    );
  });

  it("returns paused for phase paused", () => {
    expect(classifyTimerRecovery(baseDraft({ phase: "paused" }), NOW)).toBe("paused");
  });

  it("returns paused when open pause interval exists", () => {
    expect(
      classifyTimerRecovery(
        baseDraft({
          pauseStartedAt: ["2026-08-01T10:05:00.000Z"],
          pauseEndedAt: [],
        }),
        NOW,
      ),
    ).toBe("paused");
  });

  it("returns expired_pending when target elapsed", () => {
    expect(
      classifyTimerRecovery(
        baseDraft({
          startedAt: "2026-08-01T09:50:00.000Z",
          targetSeconds: 300,
        }),
        NOW,
      ),
    ).toBe("expired_pending");
  });

  it("returns active when time remains", () => {
    expect(
      classifyTimerRecovery(
        baseDraft({
          startedAt: "2026-08-01T10:05:00.000Z",
          targetSeconds: 600,
        }),
        NOW,
      ),
    ).toBe("active");
  });

  it("returns active without target even after long elapsed", () => {
    expect(
      classifyTimerRecovery(
        baseDraft({
          targetSeconds: null,
          startedAt: "2026-08-01T08:00:00.000Z",
        }),
        NOW,
      ),
    ).toBe("active");
  });

  it("respects stored expired_pending phase", () => {
    expect(classifyTimerRecovery(baseDraft({ phase: "expired_pending" }), NOW)).toBe(
      "expired_pending",
    );
  });
});

describe("oneActiveTimerGuard", () => {
  it("allows first timer", () => {
    expect(oneActiveTimerGuard(null, baseDraft(), NOW).ok).toBe(true);
  });

  it("allows same session id", () => {
    const existing = baseDraft({ sessionId: "sess-1" });
    const incoming = baseDraft({ sessionId: "sess-1" });
    expect(oneActiveTimerGuard(existing, incoming, NOW).ok).toBe(true);
  });

  it("rejects second active timer", () => {
    const existing = baseDraft({ sessionId: "sess-1", phase: "active" });
    const incoming = baseDraft({ sessionId: "sess-2" });
    const result = oneActiveTimerGuard(existing, incoming, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("already active");
    }
  });

  it("allows new timer when existing is completed_queued", () => {
    const existing = baseDraft({ sessionId: "sess-1", phase: "completed_queued" });
    const incoming = baseDraft({ sessionId: "sess-2" });
    expect(oneActiveTimerGuard(existing, incoming, NOW).ok).toBe(true);
  });
});

describe("cannotReopenCompleted", () => {
  it("blocks completed phases", () => {
    expect(cannotReopenCompleted(baseDraft({ phase: "completed_queued" }))).toBe(true);
    expect(cannotReopenCompleted(baseDraft({ phase: "completed_synced" }))).toBe(true);
  });

  it("allows active phases", () => {
    expect(cannotReopenCompleted(baseDraft({ phase: "active" }))).toBe(false);
    expect(cannotReopenCompleted(baseDraft({ phase: "paused" }))).toBe(false);
  });
});

describe("attachLocalDateGuard", () => {
  it("matches same local date", () => {
    expect(attachLocalDateGuard("2026-08-01", "2026-08-01")).toBe(true);
  });

  it("rejects different local date", () => {
    expect(attachLocalDateGuard("2026-08-01", "2026-08-02")).toBe(false);
  });
});
