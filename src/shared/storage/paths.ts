/**
 * Storage helpers — private progress photo paths arrive with Increment 7.
 * Path convention: `{user_id}/{set_id}/{photo_id}.ext`
 */
export function buildPrivatePhotoPath(parts: {
  userId: string;
  setId: string;
  photoId: string;
  extension: string;
}): string {
  return `${parts.userId}/${parts.setId}/${parts.photoId}.${parts.extension}`;
}
