/**
 * Storage path helpers for private buckets.
 *
 * Progress photos (Increment 7): `{user_id}/{set_id}/{photo_id}.ext`
 * Nutrition labels (Increment 5): `{user_id}/nutrition-labels/{capture_id}.ext`
 */
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
