import { describe, expect, it } from "vitest";
import {
  assertReplacementNotStale,
  interpretSoftDeleteResult,
  orphanCleanupAfterConflict,
  replacementExecutionOrder,
  REPLACEMENT_STEP_ORDER,
  shouldRestorePreviousAfterFailedInsert,
  slotIdentitiesToEditorState,
} from "./replacement";

describe("replacementExecutionOrder", () => {
  it("uploads new storage before soft-deleting old metadata; deletes old storage last", () => {
    const order = replacementExecutionOrder();
    expect(order).toEqual(REPLACEMENT_STEP_ORDER);
    expect(order.indexOf("upload-new-storage")).toBeLessThan(
      order.indexOf("soft-delete-old-metadata"),
    );
    expect(order.indexOf("soft-delete-old-metadata")).toBeLessThan(
      order.indexOf("insert-new-metadata"),
    );
    expect(order.indexOf("insert-new-metadata")).toBeLessThan(
      order.indexOf("delete-old-storage"),
    );
  });
});

describe("assertReplacementNotStale", () => {
  it("allows insert when slot is empty", () => {
    expect(
      assertReplacementNotStale({
        currentActivePhotoId: null,
        previousPhotoId: null,
      }),
    ).toEqual({ ok: true, mode: "insert" });
  });

  it("allows replace when previous id matches current active", () => {
    expect(
      assertReplacementNotStale({
        previousPhotoId: "photo-a",
        currentActivePhotoId: "photo-a",
      }),
    ).toEqual({ ok: true, mode: "replace" });
  });

  it("refuses blind replace when previous id omitted for occupied slot", () => {
    const result = assertReplacementNotStale({
      currentActivePhotoId: "photo-a",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_previous");
  });

  it("refuses stale replace when slot changed", () => {
    const result = assertReplacementNotStale({
      previousPhotoId: "photo-a",
      currentActivePhotoId: "photo-b",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
  });

  it("refuses when expected photo was removed", () => {
    const result = assertReplacementNotStale({
      previousPhotoId: "photo-a",
      currentActivePhotoId: null,
    });
    // Empty slot with a previous id is still "stale" from the client's view
    // of replacing photo-a — soft-delete will also fail. Treat as stale.
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
  });
});

describe("interpretSoftDeleteResult", () => {
  it("accepts soft-delete of the expected previous photo", () => {
    expect(
      interpretSoftDeleteResult({
        expectedPreviousPhotoId: "photo-a",
        softDeletedRowId: "photo-a",
        rowsAffected: 1,
      }),
    ).toEqual({ ok: true, mode: "replace" });
  });

  it("rejects zero-row soft-delete as stale (newer server replacement intact)", () => {
    const result = interpretSoftDeleteResult({
      expectedPreviousPhotoId: "photo-a",
      softDeletedRowId: null,
      rowsAffected: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
  });
});

describe("shouldRestorePreviousAfterFailedInsert", () => {
  it("restores only when soft-delete marker matches and slot still empty", () => {
    expect(
      shouldRestorePreviousAfterFailedInsert({
        previousPhotoId: "photo-a",
        softDeletedAt: "t1",
        activePhotoIdAfterFailure: null,
        previousRowDeletedAt: "t1",
      }),
    ).toBe(true);
  });

  it("does not restore obsolete row over a newer active replacement", () => {
    expect(
      shouldRestorePreviousAfterFailedInsert({
        previousPhotoId: "photo-a",
        softDeletedAt: "t1",
        activePhotoIdAfterFailure: "photo-b",
        previousRowDeletedAt: "t1",
      }),
    ).toBe(false);
  });

  it("does not restore when deleted_at was changed by another writer", () => {
    expect(
      shouldRestorePreviousAfterFailedInsert({
        previousPhotoId: "photo-a",
        softDeletedAt: "t1",
        activePhotoIdAfterFailure: null,
        previousRowDeletedAt: "t2",
      }),
    ).toBe(false);
  });
});

describe("orphanCleanupAfterConflict", () => {
  it("deletes newly uploaded orphan after conflict; keeps old object", () => {
    expect(
      orphanCleanupAfterConflict({
        metadataSucceeded: false,
        hadStaleConflict: true,
      }),
    ).toEqual({
      shouldDeleteNewStorageObject: true,
      shouldDeleteOldStorageObject: false,
    });
  });

  it("deletes old object only after metadata succeeds", () => {
    expect(
      orphanCleanupAfterConflict({
        metadataSucceeded: true,
        hadStaleConflict: false,
      }),
    ).toEqual({
      shouldDeleteNewStorageObject: false,
      shouldDeleteOldStorageObject: true,
    });
  });
});

describe("slotIdentitiesToEditorState", () => {
  it("maps server-loaded photo ids into editor slot state for refresh/replace", () => {
    const state = slotIdentitiesToEditorState([
      {
        id: "photo-front",
        slot: "front",
        privateStoragePath: "user/progress/set/front-photo-front.jpg",
        checksum: "abc",
        updatedAt: "2026-08-01T10:00:00.000Z",
        signedUrl: "https://example.test/front",
      },
      {
        id: "photo-back",
        slot: "back",
        privateStoragePath: "user/progress/set/back-photo-back.jpg",
        checksum: null,
        updatedAt: "2026-08-01T11:00:00.000Z",
      },
    ]);
    expect(state.front?.photoId).toBe("photo-front");
    expect(state.front?.checksum).toBe("abc");
    expect(state.front?.signedUrl).toBe("https://example.test/front");
    expect(state.back?.photoId).toBe("photo-back");
    expect(state.back?.signedUrl).toBeNull();
  });

  it("supports replacement after page refresh using server photo id as previousPhotoId", () => {
    const state = slotIdentitiesToEditorState([
      {
        id: "server-photo-id",
        slot: "side_left",
        privateStoragePath: "u/progress/s/side_left-server-photo-id.jpg",
        checksum: "x",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
    ]);
    const previousPhotoId = state.side_left?.photoId;
    expect(previousPhotoId).toBe("server-photo-id");
    const check = assertReplacementNotStale({
      previousPhotoId,
      currentActivePhotoId: "server-photo-id",
    });
    expect(check).toEqual({ ok: true, mode: "replace" });
  });

  it("supports replacing a photo on an older set via loaded identities", () => {
    const olderSet = slotIdentitiesToEditorState([
      {
        id: "old-set-front",
        slot: "front",
        privateStoragePath: "u/progress/old/front-old-set-front.jpg",
        checksum: "old",
        updatedAt: "2026-01-15T00:00:00.000Z",
      },
    ]);
    expect(olderSet.front?.photoId).toBe("old-set-front");
    expect(
      assertReplacementNotStale({
        previousPhotoId: olderSet.front?.photoId,
        currentActivePhotoId: "old-set-front",
      }).ok,
    ).toBe(true);
  });
});
