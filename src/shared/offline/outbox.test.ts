import { describe, expect, it } from "vitest";
import { createPendingRecord, transitionOutbox } from "@/shared/offline/outbox";

describe("outbox state transitions", () => {
  const base = createPendingRecord({
    idempotencyKey: "idem-1",
    userId: "user-1",
    entityType: "meal_log",
    entityId: "meal-1",
    operationType: "create",
    payload: { note: "test" },
  });

  it("starts pending", () => {
    expect(base.status).toBe("pending");
    expect(base.retryCount).toBe(0);
  });

  it("pending -> in_progress -> synced", () => {
    const a = transitionOutbox(base, "in_progress");
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.record.status).toBe("in_progress");

    const b = transitionOutbox(a.record, "synced");
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.record.status).toBe("synced");
  });

  it("in_progress -> failed -> retry -> pending", () => {
    const a = transitionOutbox(base, "in_progress");
    expect(a.ok).toBe(true);
    if (!a.ok) return;

    const b = transitionOutbox(a.record, "failed", "network");
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.record.status).toBe("failed");
    expect(b.record.retryCount).toBe(1);
    expect(b.record.lastError).toBe("network");

    const c = transitionOutbox(b.record, "retry");
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.record.status).toBe("pending");
  });

  it("rejects illegal transitions", () => {
    const synced = transitionOutbox({ ...base, status: "synced" }, "in_progress");
    expect(synced.ok).toBe(false);
  });
});
