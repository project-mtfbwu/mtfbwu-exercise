import { describe, expect, it } from "vitest";
import {
  PHOTO_SEQUENCE,
  PROGRESS_ENTITY,
  buildPhotoMetadataWrites,
  buildPhotoSetWrites,
  buildWeightUpsertWrites,
  isProgressConflict,
  isProgressOutboxPayload,
  progressPhotoBlobId,
  sortProgressRecordsForReplay,
} from "./progress-outbox";
import type { OutboxRecord } from "./db";

describe("isProgressOutboxPayload", () => {
  it("recognizes progress kind", () => {
    expect(
      isProgressOutboxPayload({
        kind: "progress",
        entity: "body_weight_entry",
        writes: [],
      }),
    ).toBe(true);
    expect(isProgressOutboxPayload({ kind: "rehab", writes: [] })).toBe(false);
  });
});

describe("isProgressConflict", () => {
  it("detects when server row is newer", () => {
    expect(isProgressConflict("2026-01-02T12:00:00Z", "2026-01-01T12:00:00Z")).toBe(true);
    expect(isProgressConflict("2026-01-01T12:00:00Z", "2026-01-02T12:00:00Z")).toBe(
      false,
    );
  });

  it("returns false when timestamps missing", () => {
    expect(isProgressConflict(null, "2026-01-01T12:00:00Z")).toBe(false);
  });
});

describe("buildWeightUpsertWrites", () => {
  it("includes conflict predicate timestamp", () => {
    const writes = buildWeightUpsertWrites({
      entryId: "e1",
      userId: "u1",
      localDate: "2026-01-01",
      timezone: "UTC",
      weightValue: 75,
      weightUnit: "kg",
      normalizedKg: 75,
      clientUpdatedAt: "2026-01-01T08:00:00Z",
    });
    expect(writes[0]!.table).toBe("body_weight_entries");
    expect(writes[0]!.conflictIfServerUpdatedAfter).toBe("2026-01-01T08:00:00Z");
  });
});

describe("photo replay order", () => {
  it("assigns sequence constants in order", () => {
    expect(PHOTO_SEQUENCE.set).toBeLessThan(PHOTO_SEQUENCE.upload);
    expect(PHOTO_SEQUENCE.upload).toBeLessThan(PHOTO_SEQUENCE.note);
    expect(PHOTO_SEQUENCE.note).toBeLessThan(PHOTO_SEQUENCE.complete);
  });

  it("builds set then metadata writes", () => {
    const setWrites = buildPhotoSetWrites({
      setId: "s1",
      userId: "u1",
      localDate: "2026-01-01",
      timezone: "UTC",
    });
    const metaWrites = buildPhotoMetadataWrites({
      photoId: "p1",
      setId: "s1",
      slot: "front",
      storagePath: "u1/progress/s1/front-p1.jpg",
      mimeType: "image/jpeg",
    });
    expect(setWrites[0]!.table).toBe("progress_photo_sets");
    expect(metaWrites[0]!.table).toBe("progress_photos");
  });
});

describe("progressPhotoBlobId", () => {
  it("combines set and photo ids", () => {
    expect(progressPhotoBlobId("set-1", "photo-1")).toBe("set-1:photo-1");
  });
});

describe("storageUpload payload", () => {
  it("includes blob reference for coordinator upload", () => {
    const payload = {
      kind: "progress" as const,
      entity: PROGRESS_ENTITY.photoUpload,
      setId: "s1",
      sequence: PHOTO_SEQUENCE.upload,
      storageUpload: {
        blobId: "s1:p1",
        bucket: "progress-photos",
        storagePath: "u/progress/s1/front-p1.jpg",
        mimeType: "image/jpeg",
      },
      writes: buildPhotoMetadataWrites({
        photoId: "p1",
        setId: "s1",
        slot: "front",
        storagePath: "u/progress/s1/front-p1.jpg",
        mimeType: "image/jpeg",
      }),
    };
    expect(isProgressOutboxPayload(payload)).toBe(true);
    expect(payload.storageUpload?.blobId).toBe("s1:p1");
  });
});

describe("sortProgressRecordsForReplay", () => {
  it("orders by sequence then createdAt", () => {
    const records: OutboxRecord[] = [
      {
        idempotencyKey: "b",
        userId: "u",
        entityType: "progress_photo",
        entityId: "p1",
        operationType: "upsert",
        payload: { kind: "progress", entity: "progress_photo", sequence: 2, writes: [] },
        status: "pending",
        retryCount: 0,
        createdAt: "2026-01-02T00:00:00Z",
        lastAttemptAt: null,
        lastError: null,
      },
      {
        idempotencyKey: "a",
        userId: "u",
        entityType: "progress_photo_set",
        entityId: "s1",
        operationType: "upsert",
        payload: {
          kind: "progress",
          entity: "progress_photo_set",
          sequence: 1,
          writes: [],
        },
        status: "pending",
        retryCount: 0,
        createdAt: "2026-01-03T00:00:00Z",
        lastAttemptAt: null,
        lastError: null,
      },
    ];
    const sorted = sortProgressRecordsForReplay(records);
    expect(sorted[0]!.idempotencyKey).toBe("a");
  });
});
