import type { OutboxOperationType, OutboxRecord, SyncStatus } from "./db";

export type QueueOutboxInput = {
  idempotencyKey: string;
  userId: string;
  entityType: string;
  entityId: string;
  operationType: OutboxOperationType;
  payload: unknown;
};

export interface OutboxRepository {
  queue(input: QueueOutboxInput): Promise<OutboxRecord>;
  listPending(): Promise<OutboxRecord[]>;
  markInProgress(id: number): Promise<OutboxRecord>;
  markSynced(id: number): Promise<OutboxRecord>;
  markFailed(id: number, error: string): Promise<OutboxRecord>;
  retry(id: number): Promise<OutboxRecord>;
  clearCompleted(): Promise<number>;
}

export type TransitionResult =
  { ok: true; record: OutboxRecord } | { ok: false; error: string };

const PENDING: SyncStatus = "pending";
const IN_PROGRESS: SyncStatus = "in_progress";
const SYNCED: SyncStatus = "synced";
const FAILED: SyncStatus = "failed";

export function createPendingRecord(input: QueueOutboxInput): OutboxRecord {
  return {
    idempotencyKey: input.idempotencyKey,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: input.operationType,
    payload: input.payload,
    status: PENDING,
    retryCount: 0,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
    lastError: null,
  };
}

/** Pure state transitions for unit tests (no IndexedDB). */
export function transitionOutbox(
  record: OutboxRecord,
  action: "in_progress" | "synced" | "failed" | "retry",
  errorMessage?: string,
): TransitionResult {
  switch (action) {
    case "in_progress": {
      if (record.status !== PENDING && record.status !== FAILED) {
        return {
          ok: false,
          error: `Cannot mark in_progress from status ${record.status}`,
        };
      }
      return {
        ok: true,
        record: {
          ...record,
          status: IN_PROGRESS,
          lastAttemptAt: new Date().toISOString(),
          lastError: null,
        },
      };
    }
    case "synced": {
      if (record.status !== IN_PROGRESS) {
        return {
          ok: false,
          error: `Cannot mark synced from status ${record.status}`,
        };
      }
      return {
        ok: true,
        record: {
          ...record,
          status: SYNCED,
          lastError: null,
          lastAttemptAt: new Date().toISOString(),
        },
      };
    }
    case "failed": {
      if (record.status !== IN_PROGRESS) {
        return {
          ok: false,
          error: `Cannot mark failed from status ${record.status}`,
        };
      }
      return {
        ok: true,
        record: {
          ...record,
          status: FAILED,
          retryCount: record.retryCount + 1,
          lastError: errorMessage ?? "Unknown sync error",
          lastAttemptAt: new Date().toISOString(),
        },
      };
    }
    case "retry": {
      if (record.status !== FAILED) {
        return {
          ok: false,
          error: `Cannot retry from status ${record.status}`,
        };
      }
      return {
        ok: true,
        record: {
          ...record,
          status: PENDING,
          lastError: null,
        },
      };
    }
    default:
      return { ok: false, error: "Unknown action" };
  }
}

export function createDexieOutboxRepository(
  db: import("./db").MtfbwuDatabase,
): OutboxRepository {
  return {
    async queue(input) {
      const existing = await db.outbox
        .where("idempotencyKey")
        .equals(input.idempotencyKey)
        .first();
      if (existing) {
        return existing;
      }
      const record = createPendingRecord(input);
      const id = await db.outbox.add(record);
      return { ...record, id };
    },

    async listPending() {
      return db.outbox.where("status").equals(PENDING).sortBy("createdAt");
    },

    async markInProgress(id) {
      const current = await requireRecord(db, id);
      const next = transitionOutbox(current, "in_progress");
      if (!next.ok) throw new Error(next.error);
      await db.outbox.put({ ...next.record, id });
      return { ...next.record, id };
    },

    async markSynced(id) {
      const current = await requireRecord(db, id);
      const next = transitionOutbox(current, "synced");
      if (!next.ok) throw new Error(next.error);
      await db.outbox.put({ ...next.record, id });
      return { ...next.record, id };
    },

    async markFailed(id, error) {
      const current = await requireRecord(db, id);
      const next = transitionOutbox(current, "failed", error);
      if (!next.ok) throw new Error(next.error);
      await db.outbox.put({ ...next.record, id });
      return { ...next.record, id };
    },

    async retry(id) {
      const current = await requireRecord(db, id);
      const next = transitionOutbox(current, "retry");
      if (!next.ok) throw new Error(next.error);
      await db.outbox.put({ ...next.record, id });
      return { ...next.record, id };
    },

    async clearCompleted() {
      return db.outbox.where("status").equals(SYNCED).delete();
    },
  };
}

async function requireRecord(
  db: import("./db").MtfbwuDatabase,
  id: number,
): Promise<OutboxRecord> {
  const record = await db.outbox.get(id);
  if (!record) {
    throw new Error(`Outbox record ${id} not found`);
  }
  return record;
}
