/**
 * Slot replacement safety for progress photos.
 *
 * Partial unique index `(set_id, slot) WHERE deleted_at IS NULL` requires
 * soft-deleting the active row before inserting the replacement.
 *
 * Storage order:
 * 1. upload-new-storage
 * 2. soft-delete-old-metadata (only the expected previousPhotoId)
 * 3. insert-new-metadata
 * 4. delete-old-storage (only after metadata succeeds)
 *
 * Never blind-replace when an active slot exists without previousPhotoId.
 */

export const REPLACEMENT_STEP_ORDER = [
  "upload-new-storage",
  "soft-delete-old-metadata",
  "insert-new-metadata",
  "delete-old-storage",
] as const;

export type ReplacementStep = (typeof REPLACEMENT_STEP_ORDER)[number];

export type StaleReplacementCheck = {
  /** Required whenever an active photo already occupies the slot. */
  previousPhotoId?: string | null;
  currentActivePhotoId: string | null;
};

export type StaleReplacementResult =
  | { ok: true; mode: "insert" | "replace" }
  | { ok: false; code: "stale" | "missing_previous"; message: string };

/**
 * Decides whether a client may replace an active slot.
 * - Empty slot → insert (previousPhotoId optional).
 * - Occupied slot → previousPhotoId required and must match active id.
 */
export function assertReplacementNotStale(
  input: StaleReplacementCheck,
): StaleReplacementResult {
  const active = input.currentActivePhotoId;
  const previous = input.previousPhotoId ?? null;

  if (active == null) {
    if (previous != null) {
      return {
        ok: false,
        code: "stale",
        message: "Slot no longer has the expected photo; refresh and retry.",
      };
    }
    return { ok: true, mode: "insert" };
  }

  if (previous == null) {
    return {
      ok: false,
      code: "missing_previous",
      message:
        "This slot already has a saved photo. Refresh to load its id before replacing.",
    };
  }

  if (previous !== active) {
    return {
      ok: false,
      code: "stale",
      message: "Slot photo changed since you started editing; refresh and retry.",
    };
  }

  return { ok: true, mode: "replace" };
}

export type SoftDeleteExpectation = {
  expectedPreviousPhotoId: string;
  softDeletedRowId: string | null;
  rowsAffected: number;
};

/**
 * Soft-delete must target the expected previous photo only.
 * Zero rows affected ⇒ another client already replaced or deleted the slot.
 */
export function interpretSoftDeleteResult(
  input: SoftDeleteExpectation,
): StaleReplacementResult {
  if (
    input.rowsAffected < 1 ||
    input.softDeletedRowId !== input.expectedPreviousPhotoId
  ) {
    return {
      ok: false,
      code: "stale",
      message: "Slot photo changed since you started editing; refresh and retry.",
    };
  }
  return { ok: true, mode: "replace" };
}

export type RestoreDecisionInput = {
  /** Soft-deleted row we attempted to replace. */
  previousPhotoId: string;
  softDeletedAt: string;
  /** Active row for the slot after failed insert (if any). */
  activePhotoIdAfterFailure: string | null;
  /** Current deleted_at on the previous row. */
  previousRowDeletedAt: string | null;
};

/**
 * Restore the soft-deleted previous row only when it is still our soft-delete
 * marker and no newer active replacement occupies the slot.
 * Never restore an obsolete row over a newer replacement.
 */
export function shouldRestorePreviousAfterFailedInsert(
  input: RestoreDecisionInput,
): boolean {
  if (input.activePhotoIdAfterFailure != null) {
    // Newer (or other) active photo already present — leave previous deleted.
    return false;
  }
  return input.previousRowDeletedAt === input.softDeletedAt;
}

export type OrphanCleanupDecision = {
  shouldDeleteNewStorageObject: boolean;
  shouldDeleteOldStorageObject: boolean;
};

/**
 * After conflict or failed metadata, only the newly uploaded object is safe to
 * remove. Never delete the old object unless the new metadata row succeeded.
 */
export function orphanCleanupAfterConflict(input: {
  metadataSucceeded: boolean;
  hadStaleConflict: boolean;
}): OrphanCleanupDecision {
  if (input.metadataSucceeded) {
    return {
      shouldDeleteNewStorageObject: false,
      shouldDeleteOldStorageObject: true,
    };
  }
  return {
    shouldDeleteNewStorageObject: true,
    shouldDeleteOldStorageObject: false,
  };
}

/** Documents safe server/client ordering for slot replacement. */
export function replacementExecutionOrder(): readonly ReplacementStep[] {
  return REPLACEMENT_STEP_ORDER;
}

/**
 * Maps server photo rows into editor slot state keyed by slot.
 * Used after page refresh / set switch so previousPhotoId is server-backed.
 */
export function slotIdentitiesToEditorState(
  photos: Array<{
    id: string;
    slot: string;
    privateStoragePath: string;
    checksum: string | null;
    updatedAt: string;
    signedUrl?: string | null;
  }>,
): Record<
  string,
  {
    photoId: string;
    storagePath: string;
    checksum: string | null;
    updatedAt: string;
    signedUrl: string | null;
  }
> {
  const out: Record<
    string,
    {
      photoId: string;
      storagePath: string;
      checksum: string | null;
      updatedAt: string;
      signedUrl: string | null;
    }
  > = {};
  for (const photo of photos) {
    out[photo.slot] = {
      photoId: photo.id,
      storagePath: photo.privateStoragePath,
      checksum: photo.checksum,
      updatedAt: photo.updatedAt,
      signedUrl: photo.signedUrl ?? null,
    };
  }
  return out;
}
