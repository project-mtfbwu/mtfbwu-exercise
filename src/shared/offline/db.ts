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

/**
 * A device-local nutrition-label capture waiting on connectivity: either a
 * barcode scanned while offline (no lookup possible yet) or an in-progress
 * OCR review the user has not finished. Also a JSON payload for the same
 * forward-compatibility reason as `MealLogDraft`.
 */
export type LabelCaptureDraft = {
  id: string;
  userId: string;
  barcode: string | null;
  payload: unknown;
  updatedAt: string;
};

export class MtfbwuDatabase extends Dexie {
  outbox!: EntityTable<OutboxRecord, "id">;
  mealLogDrafts!: EntityTable<MealLogDraft, "id">;
  labelCaptureDrafts!: EntityTable<LabelCaptureDraft, "id">;

  constructor(name = "mtfbwu") {
    super(name);
    this.version(1).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
    });
    this.version(2).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
    });
    this.version(3).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
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
