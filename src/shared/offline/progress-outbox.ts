import {
  getDatabase,
  type MtfbwuDatabase,
  type OutboxRecord,
  type WeightDraft,
  type MeasurementDraft,
  type ProgressPhotoDraft,
  type ProgressNoteDraft,
} from "@/shared/offline/db";
import { createPendingRecord } from "@/shared/offline/outbox";
import { storeProgressPhotoBlobSafe } from "@/modules/progress-photos/offline/progress-quota";
import { PROGRESS_PHOTOS_BUCKET } from "@/shared/storage/paths";

export const PROGRESS_ENTITY = {
  weight: "body_weight_entry",
  measurement: "body_measurement_entry",
  photoSet: "progress_photo_set",
  photo: "progress_photo",
  photoUpload: "progress_photo_upload",
  note: "progress_note",
  complete: "progress_photo_set_complete",
} as const;

export type ProgressEntityType = (typeof PROGRESS_ENTITY)[keyof typeof PROGRESS_ENTITY];

export type ProgressTable =
  | "body_weight_entries"
  | "body_measurement_entries"
  | "body_measurement_values"
  | "progress_photo_sets"
  | "progress_photos"
  | "progress_notes";

export type ProgressWriteOperation = "upsert" | "delete";

export type ProgressWrite = {
  table: ProgressTable;
  values: Record<string, unknown> | Record<string, unknown>[];
  operation?: ProgressWriteOperation;
  /** Conflict predicate: skip upsert when server row updated_at is newer. */
  conflictIfServerUpdatedAfter?: string;
};

/**
 * Replay order for photo sets: set → upload marker/metadata → notes → complete.
 * Weight/measurement upserts include optional conflict predicates.
 */
export type ProgressOutboxPayload = {
  kind: "progress";
  entity: ProgressEntityType;
  setId?: string;
  sequence?: number;
  writes: ProgressWrite[];
  operation?: ProgressWriteOperation;
  /** When set, coordinator uploads blob from `progressPhotoBlobs` before DB writes. */
  storageUpload?: {
    blobId: string;
    bucket: string;
    storagePath: string;
    mimeType: string;
  };
};

/** Max processed JPEG bytes retained offline (~8 MB bucket limit). */
export const MAX_OFFLINE_PROGRESS_PHOTO_BYTES = 8 * 1024 * 1024;

export function isProgressOutboxPayload(
  payload: unknown,
): payload is ProgressOutboxPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as ProgressOutboxPayload).kind === "progress"
  );
}

/** Photo replay sequence numbers */
export const PHOTO_SEQUENCE = {
  set: 1,
  upload: 2,
  note: 3,
  complete: 4,
} as const;

export function isProgressConflict(
  serverUpdatedAt: string | null | undefined,
  clientUpdatedAt: string | null | undefined,
): boolean {
  if (!serverUpdatedAt || !clientUpdatedAt) return false;
  return new Date(serverUpdatedAt).getTime() > new Date(clientUpdatedAt).getTime();
}

export async function queueProgressMutation(input: {
  userId: string;
  entityType: ProgressEntityType;
  entityId: string;
  payload: ProgressOutboxPayload;
  weightDraft?: Omit<WeightDraft, "id" | "userId" | "createdAt" | "updatedAt">;
  measurementDraft?: Omit<MeasurementDraft, "id" | "userId" | "createdAt" | "updatedAt">;
  photoDraft?: Omit<ProgressPhotoDraft, "id" | "userId" | "createdAt" | "updatedAt">;
  noteDraft?: Omit<ProgressNoteDraft, "id" | "userId" | "createdAt" | "updatedAt">;
  idempotencyKey?: string;
}): Promise<OutboxRecord> {
  const db = getDatabase();
  const idempotencyKey =
    input.idempotencyKey ??
    `progress:${input.entityType}:${input.entityId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: "upsert",
    payload: input.payload,
  });

  await db.transaction(
    "rw",
    [
      db.outbox,
      db.weightDrafts,
      db.measurementDrafts,
      db.progressPhotoDrafts,
      db.progressPhotoBlobs,
      db.progressNoteDrafts,
    ],
    async () => {
      const existing = await db.outbox
        .where("idempotencyKey")
        .equals(idempotencyKey)
        .first();
      if (existing) {
        Object.assign(record, existing);
        return;
      }
      const id = await db.outbox.add(record);
      record.id = id;
      const now = new Date().toISOString();

      if (input.weightDraft) {
        await db.weightDrafts.put({
          ...input.weightDraft,
          id: input.entityId,
          userId: input.userId,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.measurementDraft) {
        await db.measurementDrafts.put({
          ...input.measurementDraft,
          id: input.entityId,
          userId: input.userId,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.photoDraft) {
        await db.progressPhotoDrafts.put({
          ...input.photoDraft,
          id: `${input.photoDraft.setId}:${input.photoDraft.photoId}`,
          userId: input.userId,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.noteDraft) {
        await db.progressNoteDrafts.put({
          ...input.noteDraft,
          id: input.entityId,
          userId: input.userId,
          createdAt: now,
          updatedAt: now,
        });
      }
    },
  );

  return record;
}

export function buildWeightUpsertWrites(input: {
  entryId: string;
  userId: string;
  localDate: string;
  timezone: string;
  weightValue: number;
  weightUnit: string;
  normalizedKg: number;
  note?: string | null;
  clientUpdatedAt?: string;
}): ProgressWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "body_weight_entries",
      values: {
        id: input.entryId,
        user_id: input.userId,
        local_date: input.localDate,
        timezone: input.timezone,
        weight_value: input.weightValue,
        weight_unit: input.weightUnit,
        normalized_kg: input.normalizedKg,
        source: "manual",
        note: input.note ?? null,
        recorded_at: now,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: now,
    },
  ];
}

export function buildPhotoSetWrites(input: {
  setId: string;
  userId: string;
  localDate: string;
  timezone: string;
  title?: string | null;
  note?: string | null;
}): ProgressWrite[] {
  const now = new Date().toISOString();
  return [
    {
      table: "progress_photo_sets",
      values: {
        id: input.setId,
        user_id: input.userId,
        local_date: input.localDate,
        timezone: input.timezone,
        title: input.title ?? null,
        note: input.note ?? null,
        source: "manual",
        captured_at: now,
        updated_at: now,
      },
    },
  ];
}

export function buildPhotoMetadataWrites(input: {
  photoId: string;
  setId: string;
  slot: string;
  storagePath: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  checksum?: string | null;
}): ProgressWrite[] {
  const now = new Date().toISOString();
  return [
    {
      table: "progress_photos",
      values: {
        id: input.photoId,
        progress_photo_set_id: input.setId,
        slot: input.slot,
        private_storage_path: input.storagePath,
        mime_type: input.mimeType,
        width: input.width ?? null,
        height: input.height ?? null,
        checksum: input.checksum ?? null,
        processed: true,
        captured_at: now,
        updated_at: now,
      },
    },
  ];
}

export function sortProgressRecordsForReplay(records: OutboxRecord[]): OutboxRecord[] {
  return [...records].sort((a, b) => {
    const pa = isProgressOutboxPayload(a.payload) ? (a.payload.sequence ?? 99) : 99;
    const pb = isProgressOutboxPayload(b.payload) ? (b.payload.sequence ?? 99) : 99;
    if (pa !== pb) return pa - pb;
    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });
}

export async function listPendingProgressWritesForSet(
  db: MtfbwuDatabase,
  setId: string,
): Promise<ProgressWrite[]> {
  const pending = await db.outbox.where("status").equals("pending").sortBy("createdAt");
  const records = sortProgressRecordsForReplay(
    pending.filter(
      (r) => isProgressOutboxPayload(r.payload) && r.payload.setId === setId,
    ),
  );
  return records.flatMap((r) =>
    isProgressOutboxPayload(r.payload) ? r.payload.writes : [],
  );
}

export function progressPhotoBlobId(setId: string, photoId: string): string {
  return `${setId}:${photoId}`;
}

export async function storeProgressPhotoBlob(input: {
  userId: string;
  setId: string;
  photoId: string;
  storagePath: string;
  mimeType: string;
  blob: Blob;
}): Promise<{ blobId: string; byteLength: number }> {
  if (input.blob.size > MAX_OFFLINE_PROGRESS_PHOTO_BYTES) {
    throw new RangeError(
      `Processed photo exceeds offline limit (${MAX_OFFLINE_PROGRESS_PHOTO_BYTES} bytes).`,
    );
  }
  const arrayBuffer = await input.blob.arrayBuffer();
  const blobId = progressPhotoBlobId(input.setId, input.photoId);
  const db = getDatabase();
  await db.progressPhotoBlobs.put({
    id: blobId,
    userId: input.userId,
    setId: input.setId,
    photoId: input.photoId,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    blob: arrayBuffer,
    byteLength: arrayBuffer.byteLength,
    createdAt: new Date().toISOString(),
  });
  return { blobId, byteLength: arrayBuffer.byteLength };
}

export async function listProgressPhotoDrafts(userId: string) {
  const db = getDatabase();
  return db.progressPhotoDrafts.where("userId").equals(userId).sortBy("updatedAt");
}

export async function deleteProgressPhotoBlob(blobId: string): Promise<void> {
  await getDatabase().progressPhotoBlobs.delete(blobId);
}

export type QueueProgressPhotoUploadResult =
  OutboxRecord | { ok: false; code: "quota"; message: string };

/** Queue photo set + blob upload + metadata for offline replay. */
export async function queueProgressPhotoUpload(input: {
  userId: string;
  setId: string;
  photoId: string;
  localDate: string;
  timezone: string;
  slot: string;
  storagePath: string;
  mimeType: string;
  blob: Blob;
  width?: number | null;
  height?: number | null;
  checksum?: string | null;
  createSet?: boolean;
}): Promise<QueueProgressPhotoUploadResult> {
  const stored = await storeProgressPhotoBlobSafe({
    userId: input.userId,
    setId: input.setId,
    photoId: input.photoId,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    blob: input.blob,
  });
  if (!stored.ok) return stored;

  const { blobId, byteLength } = stored;

  const db = getDatabase();
  const idempotencyKey = `progress:photo-upload:${blobId}`;
  const metadataWrites = buildPhotoMetadataWrites({
    photoId: input.photoId,
    setId: input.setId,
    slot: input.slot,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    checksum: input.checksum,
  });

  const setWrites = input.createSet
    ? buildPhotoSetWrites({
        setId: input.setId,
        userId: input.userId,
        localDate: input.localDate,
        timezone: input.timezone,
      })
    : [];

  const payload: ProgressOutboxPayload = {
    kind: "progress",
    entity: PROGRESS_ENTITY.photoUpload,
    setId: input.setId,
    sequence: PHOTO_SEQUENCE.upload,
    storageUpload: {
      blobId,
      bucket: PROGRESS_PHOTOS_BUCKET,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
    },
    writes: [...setWrites, ...metadataWrites],
  };

  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: PROGRESS_ENTITY.photoUpload,
    entityId: input.photoId,
    operationType: "upsert",
    payload,
  });

  await db.transaction(
    "rw",
    [db.outbox, db.progressPhotoDrafts, db.progressPhotoBlobs],
    async () => {
      const existing = await db.outbox
        .where("idempotencyKey")
        .equals(idempotencyKey)
        .first();
      if (existing) {
        Object.assign(record, existing);
        return;
      }
      const id = await db.outbox.add(record);
      record.id = id;
      const now = new Date().toISOString();
      await db.progressPhotoDrafts.put({
        id: blobId,
        userId: input.userId,
        setId: input.setId,
        photoId: input.photoId,
        payload: { slot: input.slot, byteLength },
        createdAt: now,
        updatedAt: now,
      });
    },
  );

  return record;
}
