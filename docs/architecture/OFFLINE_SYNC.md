# OFFLINE_SYNC.md

## Goal

Users can **log workouts and meals without network**, then sync safely when online. Catalog reads (exercises, cached foods) degrade gracefully.

## Client store: Dexie

Dexie wraps IndexedDB with versioned schemas, transactions, and upgrade hooks ([Dexie Design tutorial](https://dexie.org/docs/Tutorial/Design)).

Patterns to use:

- `db.version(n).stores({...})` for indexes needed by queries
- `db.transaction('rw', ...)` for multi-table writes (session + sets + outbox)
- Explicit upgrade functions when reshaping data
- Do not treat star counts as quality proof; validate against our sync tests

License: Apache-2.0 — safe dependency reuse with attribution.

## Outbox pattern

1. User action writes domain rows **and** an `outbox` mutation locally in one transaction.
2. Sync worker drains outbox when online (and on `online` event / interval).
3. Each mutation carries `client_mutation_id` (UUID) for idempotent apply on server.
4. On success, mark outbox row `acked` (or delete) and update local `server_updated_at`.
5. On conflict, prefer structured merge rules (below), not silent overwrite.

```
outbox
  id, client_mutation_id
  domain, op, payload
  created_at, attempts, last_error, status
```

## Sync scope (MVP)

| Domain | Offline write | Notes |
| --- | --- | --- |
| User modules enable/disable | Increment 3 | Outbox `set_module_enabled` |
| Dashboard reorder / variant | Increment 3 | Version conflict on layout |
| Daily module status | Increment 3 | Revision + completed protection |
| Profile prefs (safe fields) | Increment 3 | Not passwords |
| Meal logs / entries | Increment 4 | `mealLogDrafts` + primary-keyed upsert payload |
| Recipes / custom foods / meal templates | Increment 4 | Replayable nutrition payloads; RLS remains authoritative |
| Label-capture drafts (uncached barcode / OCR) | Increment 5 | Dexie `labelCaptureDrafts`; OCR assets local after cache |
| Workout sessions / sets | Increment 6 | Dexie v4 `activeWorkoutSessions`, `workoutSetDrafts`, `workoutNoteDrafts`; outbox `kind: workout`; coordinator apply wired |
| Rehab sessions / sets / alerts | Increment 7 | Dexie v6 `activeRehabSessions`, `rehabSetDrafts`, `rehabObservationDrafts`, `rehabAlertDrafts`; outbox `kind: rehab`; ordered finish fold |
| Weight / measurements / progress photos | Increment 8 | Dexie v8 drafts + `progressPhotoBlobs`; outbox `kind: progress`; see `docs/development/PROGRESS_OFFLINE_SYNC.md` |
| Hydration / meditation domain rows | Later | Status summary already exists |

## Conflict rules (Increment 3 board)

| Case | Rule |
| --- | --- |
| Dashboard layout reorder | Optimistic `version`; stale → `layout_version_conflict`; refresh + message; no silent overwrite |
| Daily module status | `revision` must match; completed cannot revert to `not_started` from stale offline write |
| Same row edited on two devices (future domain) | Last-write-wins on `updated_at` **plus** keep outbox audit; surface conflict banner for sessions if both completed differently |
| FoodItem cache | Server/normalized row wins; preserve user’s meal `nutrients_snapshot` |
| Deletes | Tombstones with timestamp |
| Photos | Server object path is source of truth after upload |

Auth actions are never queued. Logout clears Dexie (`clearLocalOfflineData`).

## Nutrition writes (Increment 4)

- Dexie v2 stores `mealLogDrafts` by draft ID, user ID, and meal-log ID.
- Queue a nutrition edit in one Dexie transaction: persist its meal draft (when
  applicable) and append its outbox record.
- A payload is restricted to `meal_log`, `recipe`, `custom_food`, or
  `meal_template`; its rows are ordered by foreign-key dependency and upserted
  by client-generated primary key. Retrying therefore does not duplicate rows.
- The online coordinator applies nutrition and existing board payloads. It does
  not queue authentication, passwords, sessions, provider credentials, or
  service-role actions.

## Label-capture drafts (Increment 5)

- Dexie v3 adds `labelCaptureDrafts` for offline uncached barcodes and in-progress
  OCR review (barcode, processed blob reference, fields, pending meal add).
- Do not keep giant original photos in IndexedDB; handle quota errors in UI.
- Camera decode works offline; remote OFF lookup requires connectivity or a
  cached barcode hit. Remote lookup is queued only with user confirmation.

## Workout writes (Increment 6)

- Dexie v4 adds `activeWorkoutSessions` (in-progress session JSON),
  `workoutSetDrafts` (optimistic set mutations), and `workoutNoteDrafts`
  (queued session notes).
- Queue session or set mutations in one Dexie transaction with the outbox row
  (`queueWorkoutMutation`, `queueSetCompletion`, `queueSetSkip`, `queueSetAdd`,
  `queueSetUpdate`, `queueSetDelete`, `queueSessionNote`, `queueSessionFinish`,
  `queueSessionDiscard` in `workout-outbox.ts`).
- Payload shape: `{ kind: "workout", entity, writes[] }` with tables
  `workout_sessions`, `workout_session_exercises`, `workout_sets`,
  `workout_session_notes`, `scheduled_workouts` — client UUIDs, upsert replay
  idempotent. Finish prepends all pending set writes for the session before the
  completion row.
- **Conflict rules (exact):**
  - Plan update: stale `workout_plans.version` → rejected
  - Session completion wins over stale offline `in_progress` mutations
  - No silent dual active `in_progress` sessions per user
  - Completed session not reopened by stale offline mutation
  - Stale skip cannot overwrite a completed set
  - Destructive discard/delete requires current session `version` when supplied
  - Plan edits never rewrite historical snapshots on replay
- Session mutations use `workout_sessions.version` optimistic concurrency (sets
  have no row version). Mismatch → failed outbox + user-visible conflict.
- Coordinator apply: `isWorkoutOutboxPayload` upserts writes in order and
  rejects stale `in_progress` updates against completed/discarded sessions and
  stale skips against completed sets. See `docs/development/WORKOUT_OFFLINE_SYNC.md`.

## Rehab writes (Increment 7)

- Dexie v6 adds `activeRehabSessions`, `rehabSetDrafts`,
  `rehabObservationDrafts`, and `rehabAlertDrafts`.
- Replay order: session → exercises → sets → observations/alerts → notes →
  finish. Finish folds pending drafts before the completion write.
- Conflict rules: completed/discarded cannot reopen; stopped set cannot become
  completed from stale mutation; alert acknowledgment cannot be silently
  removed; plan version and restriction freshness checks apply.
- See `docs/development/REHAB_OFFLINE_SYNC.md`.

## Progress writes (Increment 8)

- Dexie v8 adds `weightDrafts`, `measurementDrafts`, `progressPhotoDrafts`, `progressPhotoBlobs`, `progressNoteDrafts`.
- Photo replay: set row → **Storage upload** from `progressPhotoBlobs` → metadata upsert → notes → complete.
- `storeProgressPhotoBlobSafe` catches `QuotaExceededError`, cleans partial blob rows, and skips outbox enqueue when storage fails.
- Only **crop+preprocessed** JPEGs are stored offline (never raw camera originals); adaptive smaller preprocess on quota retry.
- Slot replacement online: upload new Storage object before soft-deleting prior metadata; see `docs/development/PROGRESS_PHOTOS.md`.
- See `docs/development/PROGRESS_OFFLINE_SYNC.md`.

## Catalogs offline

- Ship or download a **subset** of exercise DB into Dexie.
- Cache Open Food Facts products by barcode after first successful fetch (TTL + stale-while-revalidate).
- USDA: never call from client with API key; if offline, only previously cached foods work.

## PWA layering

- Service worker: app shell + static assets (per Next.js PWA guide / Serwist).
- Dexie: authoritative offline **data**.
- Do not duplicate mutable user data only in Cache API.

## Security notes

- IndexedDB is device-local; protect with OS user account assumptions; clear on logout.
- Do not store Supabase service keys in Dexie.
- Encrypted-at-rest for photos is Storage-side; local photo drafts should be cleared after upload when possible.

## Testing checklist (later increments)

- Airplane mode: create meal draft → kill app → relaunch → still present → go online → appears in Supabase once.
- Duplicate delivery of same `client_mutation_id` does not duplicate sets.
- Partial failure mid-session sync retries without corrupting order.

## Related

- `ADR/0002-supabase-dexie.md`
- Dexie.js research in `REFERENCE_PROJECTS_RESEARCH.md`
