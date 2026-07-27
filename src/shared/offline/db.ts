import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "pending" | "in_progress" | "synced" | "failed";

export type OutboxOperationType = "create" | "update" | "delete" | "upsert" | "custom";

export type OutboxRecord = {
  id?: number;
  idempotencyKey: string;
  userId: string;
  entityType: string;
  entityId: string;
  operationType: OutboxOperationType;
  payload: unknown;
  status: SyncStatus;
  retryCount: number;
  createdAt: string;
  lastAttemptAt: string | null;
  lastError: string | null;
};

/**
 * A complete, device-local nutrition edit waiting to be synchronized. It is
 * deliberately a JSON payload: server row shapes evolve with nutrition
 * migrations while an existing draft must remain recoverable offline.
 */
export type MealLogDraft = {
  id: string;
  userId: string;
  mealLogId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

export class MtfbwuDatabase extends Dexie {
  outbox!: EntityTable<OutboxRecord, "id">;
  mealLogDrafts!: EntityTable<MealLogDraft, "id">;

  constructor(name = "mtfbwu") {
    super(name);
    this.version(1).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
    });
    this.version(2).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
    });
  }
}

let dbSingleton: MtfbwuDatabase | null = null;

export function getDatabase(): MtfbwuDatabase {
  if (!dbSingleton) {
    dbSingleton = new MtfbwuDatabase();
  }
  return dbSingleton;
}

/** Test helper — reset singleton between suites. */
export function resetDatabaseSingleton(): void {
  dbSingleton = null;
}
