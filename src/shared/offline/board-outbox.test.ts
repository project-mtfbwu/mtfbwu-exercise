import { describe, expect, it } from "vitest";
import { BOARD_ENTITY, isBoardOutboxPayload } from "@/shared/offline/board-outbox";
import { createPendingRecord, transitionOutbox } from "@/shared/offline/outbox";

describe("board outbox payloads", () => {
  it("recognizes daily status payloads", () => {
    expect(
      isBoardOutboxPayload({
        kind: "daily_status",
        statusId: "status-1",
        expectedRevision: 1,
        status: "completed",
        summaryText: "Demo session completed",
      }),
    ).toBe(true);
    expect(isBoardOutboxPayload({ kind: "unknown" })).toBe(false);
  });

  it("keeps failed sync errors visible through transition helpers", () => {
    const record = createPendingRecord({
      idempotencyKey: "daily:status-1:1",
      userId: "user-1",
      entityType: BOARD_ENTITY.dailyModuleStatus,
      entityId: "status-1",
      operationType: "update",
      payload: {
        kind: "daily_status",
        statusId: "status-1",
        expectedRevision: 1,
        status: "completed",
      },
    });

    const inProgress = transitionOutbox(record, "in_progress");
    expect(inProgress.ok).toBe(true);
    if (!inProgress.ok) return;

    const failed = transitionOutbox(
      inProgress.record,
      "failed",
      "status_revision_conflict",
    );
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.record.status).toBe("failed");
    expect(failed.record.lastError).toContain("conflict");
  });
});
