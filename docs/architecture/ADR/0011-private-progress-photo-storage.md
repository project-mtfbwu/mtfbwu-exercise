# ADR 0011 — Private progress photo storage

## Status

Accepted (Increment 8)

## Context

Progress photos are sensitive. They must stay private per-user with enforceable Storage and database RLS.

## Decision

- Dedicated private bucket: `progress-photos`
- Path: `{user_id}/progress/{photo_set_id}/{slot}-{photo_id}.jpg`
- Client preprocess downscales to **2048px** max longest side; upload processed JPEG only
- Display uses short-lived **signed URLs** via server actions (`getPhotoSignedUrlByIdAction`) — list views do not expose raw paths to the client
- Storage policies: `(storage.foldername(name))[1] = auth.uid()::text`

## Consequences

- Offline queue stores processed blob in Dexie `progressPhotoBlobs`; coordinator uploads then writes metadata
- Replacing a slot soft-deletes prior photo row; comparison viewer handles missing/deleted sources neutrally

See `docs/development/PROGRESS_PHOTOS.md`, `PROGRESS_OFFLINE_SYNC.md`.
