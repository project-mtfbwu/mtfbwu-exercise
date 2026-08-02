# Daily tracker offline sync (Increment 9)

> Canonical doc: [INCREMENT_9_OFFLINE_SYNC.md](./INCREMENT_9_OFFLINE_SYNC.md)

Short summary retained for older links.

## Dexie v9

New draft tables mirror in-flight tracker mutations. See `src/shared/offline/db.ts`.

## Outbox

`tracker-outbox.ts` uses `kind: "tracker"`. Replay order:

1. `user_trackers` (enable/create)
2. `tracker_targets`
3. Domain rows: `hydration_entries`, `meditation_sessions`, `sleep_sessions`, `supplement_intakes`, `tracker_events`

## Coordinator

`applyTrackerPayload` upserts writes and calls `recalculate_tracker_daily_summary` after tracker events.

## Logout

Existing `clear-local.ts` deletes the whole Dexie database including v9 stores.
