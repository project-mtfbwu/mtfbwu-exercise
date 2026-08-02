# Increment 9 offline sync

Dexie **v10** extends v9 with `userSupplementDrafts` and `trackerReminderDrafts`. **v11** adds `dailyOverviewCache` (server-fetched daily overview snapshots invalidated on tracker sync). Daily-tracker drafts and `kind: "tracker"` outbox replay cover all Increment 9 domains.

## Dexie tables

| Table                     | Version | Purpose                                            |
| ------------------------- | ------- | -------------------------------------------------- |
| `hydrationDrafts`         | v9      | Pending hydration entry upserts                    |
| `meditationDrafts`        | v9      | Completed session drafts                           |
| `meditationTimerState`    | v9      | In-progress timer recovery                         |
| `sleepDrafts`             | v9      | Pending sleep session upserts                      |
| `supplementIntakeDrafts`  | v9      | Pending supplement intake rows                     |
| `trackerEventDrafts`      | v9      | Custom tracker events                              |
| `trackerTargetDrafts`     | v9      | Target changes                                     |
| `profilePreferenceDrafts` | v9      | Safe profile preference fields                     |
| `userSupplementDrafts`    | v10     | Offline supplement create                          |
| `trackerReminderDrafts`   | v10     | Reminder preference rows                           |
| `dailyOverviewCache`      | v11     | Cached daily overview payload; invalidated on sync |

Defined in `src/shared/offline/db.ts` (`version(9)` + `version(10).stores(...)` + `version(11).stores(...)`).

## Outbox

`src/shared/offline/tracker-outbox.ts` — payload discriminator **`kind: "tracker"`**.

### Replay order

`sortTrackerRecordsForReplay` enforces:

1. **`user_trackers` / `user_supplements`** (configuration)
2. **`tracker_targets` / `tracker_reminders` / `profile_preferences` / `profiles`**
3. Domain rows: **`hydration_entries`**, **`meditation_sessions`**, **`sleep_sessions`**, **`supplement_intakes`**, **`tracker_events`**

`dependsOnEntityIds` / `dependsOnIdempotencyKeys` defer child rows until parents sync (multi-pass flush).

### Conflict rules

- Client-generated UUIDs; retry does not duplicate rows
- Optional `conflictIfServerUpdatedAfter` on writes — coordinator throws stale conflict (same pattern as progress outbox)
- Deletes use soft `deleted_at` where applicable
- Auth actions never queued; logout clears Dexie

### Focus panels wired offline

Hydration (add + remove), meditation (timer + manual), sleep (add + remove), supplements (intake + create + clear), custom trackers (event + create), profile preferences, **reminder preferences**.

## Meditation timer recovery

- `src/modules/meditation/timer-persistence.ts` — single-row Dexie persistence per user
- `src/modules/meditation/calculations/timer-recovery.ts` — pure timestamp math + guards
- `meditation-focus.tsx` — restore UI on mount when board `localDate` matches; expired timers require user confirmation

## Post-sync draft cleanup

`src/shared/offline/draft-cleanup.ts`:

- `cleanupDraftsForOutboxRecord(db, record)` — runs after each successful `markSynced`
- `reconcileStaleDrafts(db, userId?)` — non-blocking on first coordinator flush
- Maps entity types → draft tables (hydration, meditation, sleep, supplement intake, user supplement, tracker event, target, reminder, profile preference)
- Invalidates `dailyOverviewCache` rows for affected `local_date` values (or all rows for the user when sync has no date, e.g. definition entities)
- Clears `meditationTimerState` when meditation session syncs or timer was `completed_queued`
- Skips cleanup when `draft.updatedAt > outbox.createdAt`; definition entities clean their own draft only (child drafts use other ids); failed outbox keeps drafts
- Cleanup errors surface via `sync-status-store.cleanupWarnings` (does not flip outbox back to failed)

Board outbox rows (`daily_status`, layout) have no Dexie drafts — cleanup is a no-op for those entity types.

## Offline status UX

`SyncStatusBanner` shows pending/failed counts and the latest cleanup warning (`N sync failed · cleanup warning: …`).

`DailyOverviewSyncHealth` on the today board surfaces queued/failed/cleanup state without double-counting module totals.

Increment 9 focus panels render `OfflineRecordStatusBadge` (`local_draft` | `queued` | `syncing` | `synced` | `failed`) for hydration, sleep, supplements, custom trackers, and meditation (timer recovery uses `local_draft`; completed offline sessions use `queued`).

## Deferred (not Increment 9)

- Reminder **delivery** (push/email) — preferences persist only

## Related

- [OFFLINE_SYNC.md](../architecture/OFFLINE_SYNC.md)
- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
- ADR [0013](../architecture/ADR/0013-specialized-trackers-plus-generic-events.md)
