# Custom trackers

Increment 9 configurable trackers use the generic event model for user-defined habits.

## Module management

- **Enable catalog trackers** — `/customize` or onboarding flows create `user_trackers` rows linked to `tracker_definitions`
- **Custom trackers** — user-defined name/unit via customize or focus create flows
- **Targets** — set effective-dated goals; `confirmed_by_user` gates completion counting
- **Archive** — archived trackers excluded from board and daily overview
- **Reminders** — optional per-tracker schedules on Profile → Reminder preferences (delivery deferred)

## Data model

- **`tracker_definitions`** — system catalog (`stable_key`, `tracker_type`, `value_type`, feature flags)
- **`user_trackers`** — links to catalog **or** `custom_name` (exactly one required)
- **`tracker_targets`** — effective-dated goals; `confirmed_by_user` required for board targets
- **`tracker_events`** — performed logs: numeric, boolean, text, duration fields per `value_type`
- **`tracker_daily_summaries`** — cached per-day rollups (RPC `recalculate_tracker_daily_summary`)
- **`tracker_streaks`** — current/longest streak per enabled tracker

## Module

`src/modules/trackers/` — catalog helpers, CRUD, streak calculations, target management.

## UI

- **CustomTracker focus** — log events for enabled custom `user_trackers`
- Onboarding / profile may enable catalog trackers (hydration, meditation, etc.) via shared `user_trackers` rows

## Offline

Dexie `trackerEventDrafts`, `trackerTargetDrafts`, `trackerReminderDrafts` (v10) + tracker outbox. Replay order: `user_tracker` → `target` / `reminder` → `event`. See [INCREMENT_9_OFFLINE_SYNC.md](./INCREMENT_9_OFFLINE_SYNC.md).

## Specialized vs generic

Catalog modules (hydration, meditation, sleep, supplements) use dedicated tables — do not also log generic `tracker_events` for the same activity.

## Related

- ADR [0013](../architecture/ADR/0013-specialized-trackers-plus-generic-events.md)
- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
