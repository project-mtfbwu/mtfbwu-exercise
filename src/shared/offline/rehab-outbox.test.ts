import { describe, expect, it } from "vitest";
import {
  buildAlertAckWrites,
  buildObservationWrites,
  buildSessionFinishWrites,
  buildSetStopWrites,
  isAlertAckRemovalConflict,
  isSessionReopenConflict,
  isSessionVersionConflict,
  isStaleSetWrite,
  isStoppedToCompletedConflict,
} from "@/shared/offline/rehab-outbox";

describe("rehab outbox conflict predicates", () => {
  it("blocks reopening a completed session", () => {
    expect(isSessionReopenConflict("completed", "in_progress")).toBe(true);
    expect(isSessionReopenConflict("in_progress", "completed")).toBe(false);
  });

  it("detects stale session version on discard", () => {
    expect(isSessionVersionConflict(3, 2)).toBe(true);
    expect(isSessionVersionConflict(3, 3)).toBe(false);
  });

  it("blocks stale skip over completed set", () => {
    expect(isStaleSetWrite("completed", { status: "skipped" })).toBe(true);
    expect(isStaleSetWrite("pending", { status: "skipped" })).toBe(false);
  });

  it("blocks stopped to completed clobber", () => {
    expect(isStoppedToCompletedConflict("stopped", "completed")).toBe(true);
    expect(isStoppedToCompletedConflict("completed", "completed")).toBe(false);
  });

  it("blocks silent alert ack removal", () => {
    expect(isAlertAckRemovalConflict("2026-07-31T10:00:00Z", null)).toBe(true);
    expect(isAlertAckRemovalConflict(null, "2026-07-31T10:00:00Z")).toBe(false);
  });
});

describe("rehab outbox write builders", () => {
  it("builds stop set writes with stopped status", () => {
    const { writes } = buildSetStopWrites({
      setId: "set-1",
      sessionExerciseId: "ex-1",
      painAfter: 7,
    });
    expect(writes[0]?.table).toBe("rehab_sets");
    expect((writes[0]?.values as { status: string }).status).toBe("stopped");
    expect((writes[0]?.values as { pain_after: number }).pain_after).toBe(7);
  });

  it("builds observation writes with generated id", () => {
    const { observationId, writes } = buildObservationWrites({
      sessionId: "session-1",
      observationType: "pain",
      valueNumeric: 4,
    });
    expect(observationId).toBeTruthy();
    expect(writes[0]?.table).toBe("rehab_session_observations");
    expect((writes[0]?.values as { rehab_session_id: string }).rehab_session_id).toBe(
      "session-1",
    );
  });

  it("builds alert acknowledgment writes", () => {
    const { writes } = buildAlertAckWrites({
      alertId: "alert-1",
      sessionId: "session-1",
      now: "2026-07-31T10:00:00Z",
    });
    expect(writes[0]?.table).toBe("rehab_alert_events");
    expect((writes[0]?.values as { acknowledged_at: string }).acknowledged_at).toBe(
      "2026-07-31T10:00:00Z",
    );
  });

  it("folds pending writes before session finish", () => {
    const pending = [
      {
        table: "rehab_sets" as const,
        values: { id: "set-1", status: "completed" },
      },
      {
        table: "rehab_alert_events" as const,
        values: { id: "alert-1", acknowledged_at: "2026-07-31T10:00:00Z" },
      },
    ];
    const { writes } = buildSessionFinishWrites(
      {
        sessionId: "session-1",
        startedAt: "2026-07-31T09:00:00Z",
        now: "2026-07-31T10:00:00Z",
      },
      pending,
    );
    expect(writes).toHaveLength(3);
    expect(writes[0]).toEqual(pending[0]);
    expect(writes[1]).toEqual(pending[1]);
    expect((writes[2]?.values as { status: string }).status).toBe("completed");
    expect((writes[2]?.values as { duration_seconds: number }).duration_seconds).toBe(
      3600,
    );
  });
});
