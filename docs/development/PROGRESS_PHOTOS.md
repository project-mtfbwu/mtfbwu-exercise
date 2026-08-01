# Progress photos (Increment 8)

Private photo sets in Supabase Storage — not a public gallery.

## Storage

- Bucket: `progress-photos` (private)
- Path: `{user_id}/progress/{set_id}/{slot}-{photo_id}.jpg`
- Helper: `buildProgressPhotoPath` in `src/shared/storage/paths.ts`

## Client preprocess

`src/modules/progress-photos/image/preprocess.ts`:

- Max dimension **2048px** longest side (processed JPEG only — originals not retained)
- Max 8 MB (matches bucket limit)
- EXIF orientation via `createImageBitmap({ imageOrientation: "from-image" })`

## Crop / rotate session

Reuse nutrition OCR crop primitives (`crop-rotate`, `crop-render`, `ObjectUrlRegistry`):

- `src/modules/progress-photos/image/progress-crop-session.ts` — `buildProcessedProgressPhotoFromCropSession`, `sha256Hex` checksum, `assertUploadIsProcessedProgressPhoto`
- `src/widgets/progress/progress-photo-crop-editor.tsx` — rotate/crop UI before upload
- `src/modules/progress-photos/camera/managed-camera.ts` + `src/widgets/progress/progress-camera-panel.tsx` — live preview frame capture (video never uploaded)

Today board flow (`progress-photos-focus.tsx`): camera or file → crop editor → processed JPEG + checksum → online upload or offline queue.

## Slot replacement safety

`src/modules/progress-photos/replacement.ts` + `replacePhotoSlotAction`:

PreviousPhotoId must come from **server-loaded** slot identities (`loadPhotoSetSlotIdentitiesAction` / `loadPhotoSetForLocalDateAction`), not only in-session uploads. Occupied slots refuse blind replace when `previousPhotoId` is missing. Soft-delete targets the expected id; zero rows ⇒ stale conflict (newer photo untouched). Failed insert restores the previous row only when its soft-delete marker still matches and no newer active row exists. On stale conflict the client deletes the newly uploaded orphan and offers Refresh / Retry.

Because of the partial unique index `(set_id, slot) WHERE deleted_at IS NULL`, metadata swap order is:

1. Upload **new** Storage object (new `{slot}-{photo_id}.jpg` path)
2. Soft-delete the previous active metadata row
3. Insert new metadata row (`processed: true`, checksum of processed bytes)
4. Best-effort delete the previous Storage object

If step 3 fails, the previous metadata row is **restored** (`deleted_at` cleared) so the prior photo remains available. Failed replacement never removes the old saved photo.

Optional `previousPhotoId` refuses stale clients when another device already replaced the slot. Blind replace without `previousPhotoId` is rejected when the slot is occupied.

### Orphan cleanup

Abandoned Storage objects (uploaded without a lasting metadata row) are not public. Periodic orphan cleanup may compare `storage.objects` under `{user_id}/progress/` to active `progress_photos.private_storage_path` values; soft-deleted paths may be retained briefly then purged. Soft-deleted photo/set rows never receive signed URLs.

## Slots

`front`, `side_left`, `side_right`, `back`, `custom` (requires label)

## Signed URLs

`getPhotoSignedUrlByIdAction` resolves path server-side; client never receives raw storage paths in list views.

## Comparison viewer

`src/widgets/progress/photo-comparison-viewer.tsx` — side-by-side same-slot comparison with date labels and missing-slot states. No overlay slider (accessibility).

See ADR [0011](../architecture/ADR/0011-private-progress-photo-storage.md).
