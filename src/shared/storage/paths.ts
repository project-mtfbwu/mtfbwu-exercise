/**
 * Storage path helpers for private buckets.
 *
 * Progress photos (Increment 8): `{user_id}/progress/{set_id}/{slot}-{photo_id}.jpg`
 * Nutrition labels (Increment 5): `{user_id}/nutrition-labels/{capture_id}.ext`
 */
export const PROGRESS_PHOTOS_BUCKET = "progress-photos";

export function buildProgressPhotoPath(parts: {
  userId: string;
  setId: string;
  slot: string;
  photoId: string;
  extension?: string;
}): string {
  const ext = (parts.extension ?? "jpg").replace(/^\./, "");
  return `${parts.userId}/progress/${parts.setId}/${parts.slot}-${parts.photoId}.${ext}`;
}

/** @deprecated Use buildProgressPhotoPath — kept for older call sites during migration. */
export function buildPrivatePhotoPath(parts: {
  userId: string;
  setId: string;
  photoId: string;
  extension: string;
}): string {
  return `${parts.userId}/${parts.setId}/${parts.photoId}.${parts.extension}`;
}

export const NUTRITION_LABELS_BUCKET = "nutrition-labels";

export function buildNutritionLabelPath(parts: {
  userId: string;
  captureId: string;
  extension?: string;
}): string {
  const ext = (parts.extension ?? "jpg").replace(/^\./, "");
  return `${parts.userId}/nutrition-labels/${parts.captureId}.${ext}`;
}
