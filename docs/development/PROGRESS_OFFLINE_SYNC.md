# Progress offline sync (Increment 8)

Dexie **v8** extends Increment 7 with progress drafts and resumable photo blobs.

## Tables

| Table                 | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `weightDrafts`        | Pending weight upserts                               |
| `measurementDrafts`   | Pending measurement entries                          |
| `progressPhotoDrafts` | Photo metadata queue markers                         |
| `progressPhotoBlobs`  | Processed JPEG `ArrayBuffer` awaiting Storage upload |
| `progressNoteDrafts`  | Progress notes (future notes in replay order)        |

## Outbox

`kind: "progress"` in `src/shared/offline/progress-outbox.ts`

### Photo replay order

1. Photo set row
2. **Storage upload** from `progressPhotoBlobs` (coordinator)
3. Photo metadata upsert
4. Notes (if any)
5. Complete marker

`queueProgressPhotoUpload` stores the processed blob via `storeProgressPhotoBlobSafe` (`src/modules/progress-photos/offline/progress-quota.ts`) and enqueues `storageUpload` metadata for the sync coordinator. If blob storage fails with `QuotaExceededError`, **no outbox row** is created.

### Weight / measurements

Upserts include `conflictIfServerUpdatedAfter` — stale offline writes fail with a visible conflict message.

## Quota / limitations

- Only **processed** JPEGs are stored (max **8 MB** each, same as bucket limit)
- Browser IndexedDB quota varies; `estimateAvailableBytes()` + `storeProgressPhotoBlobSafe` return `{ code: 'quota' }` instead of partial writes
- UI shows pending `progressPhotoDrafts` and quota retry (smaller `maxDimension` / JPEG quality)
- If the blob row is missing at sync time, user must re-capture the photo
- Full-resolution originals are never stored offline

See also `docs/architecture/OFFLINE_SYNC.md`.
