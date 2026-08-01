import {
  deleteProgressPhotoBlob,
  MAX_OFFLINE_PROGRESS_PHOTO_BYTES,
  storeProgressPhotoBlob,
} from "@/shared/offline/progress-outbox";

export type QuotaStoreResult =
  | { ok: true; blobId: string; byteLength: number }
  | { ok: false; code: "quota"; message: string };

/** Best-effort estimate of remaining storage quota (browser API). */
export async function estimateAvailableBytes(): Promise<number | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    if (estimate.quota == null || estimate.usage == null) return null;
    return Math.max(0, estimate.quota - estimate.usage);
  } catch {
    return null;
  }
}

export function assertCanStoreBlob(sizeBytes: number): void {
  if (sizeBytes > MAX_OFFLINE_PROGRESS_PHOTO_BYTES) {
    throw new RangeError(
      `Processed photo exceeds offline limit (${MAX_OFFLINE_PROGRESS_PHOTO_BYTES} bytes).`,
    );
  }
}

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === "QuotaExceededError";
}

/**
 * Wraps `storeProgressPhotoBlob` — on quota failure, removes any partial row
 * and returns `{ ok: false, code: 'quota' }` instead of throwing.
 */
export async function storeProgressPhotoBlobSafe(input: {
  userId: string;
  setId: string;
  photoId: string;
  storagePath: string;
  mimeType: string;
  blob: Blob;
}): Promise<QuotaStoreResult> {
  try {
    assertCanStoreBlob(input.blob.size);
    const stored = await storeProgressPhotoBlob(input);
    return { ok: true, ...stored };
  } catch (error) {
    const blobId = `${input.setId}:${input.photoId}`;
    try {
      await deleteProgressPhotoBlob(blobId);
    } catch {
      // best-effort cleanup of partial write
    }
    if (isQuotaExceededError(error)) {
      return {
        ok: false,
        code: "quota",
        message: "Device storage is full; free space or sync pending photos.",
      };
    }
    throw error;
  }
}
