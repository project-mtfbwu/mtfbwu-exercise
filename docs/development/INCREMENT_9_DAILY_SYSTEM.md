# Increment 9 — Daily system

Master overview for hydration, meditation, sleep, supplements, configurable custom trackers, calendar read-model, history list, profile preferences, reminder preferences (persistence only), and Dexie v9/v10 offline replay.

**Status:** Implemented locally (uncommitted until user requests commit). Do **not** start Increment 10 without authorization.

## Domain docs

| Topic              | Document                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| Hydration          | [HYDRATION_TRACKING.md](./HYDRATION_TRACKING.md)                              |
| Meditation         | [MEDITATION_TRACKING.md](./MEDITATION_TRACKING.md)                            |
| Sleep              | [SLEEP_TRACKING.md](./SLEEP_TRACKING.md)                                      |
| Supplements        | [SUPPLEMENT_TRACKING.md](./SUPPLEMENT_TRACKING.md)                            |
| Custom trackers    | [CUSTOM_TRACKERS.md](./CUSTOM_TRACKERS.md)                                    |
| Calendar + history | [CALENDAR_AND_HISTORY.md](./CALENDAR_AND_HISTORY.md)                          |
| Daily overview     | [DAILY_OVERVIEW.md](./DAILY_OVERVIEW.md)                                      |
| Offline sync       | [INCREMENT_9_OFFLINE_SYNC.md](./INCREMENT_9_OFFLINE_SYNC.md)                  |
| Manual QA          | [INCREMENT_9_MANUAL_QA.md](./INCREMENT_9_MANUAL_QA.md)                        |
| Test plan          | [INCREMENT_9_TEST_PLAN.md](./INCREMENT_9_TEST_PLAN.md)                        |
| Visual review      | [INCREMENT_9_VISUAL_REVIEW.md](../design-system/INCREMENT_9_VISUAL_REVIEW.md) |

## Architecture

- ADRs [0013](../architecture/ADR/0013-specialized-trackers-plus-generic-events.md), [0014](../architecture/ADR/0014-local-date-calendar-aggregation.md)
- [DATA_MODEL.md](../architecture/DATA_MODEL.md) — Increment 9 tables
- [OFFLINE_SYNC.md](../architecture/OFFLINE_SYNC.md) — Dexie v9 + v10 summary
- [BUILD_INCREMENTS.md](../architecture/BUILD_INCREMENTS.md) — delivery status

## Migrations

| File                                                 | Contents                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `20260801130000_increment9_daily_system.sql`         | Tracker catalog, user trackers, targets, events, hydration, meditation, sleep, supplements, reminders, streaks, RLS |
| `20260801130100_increment9_tracker_catalog_seed.sql` | Curated `tracker_definitions` + `supplement_definitions` seed                                                       |

## Modules

| Module        | Path                       |
| ------------- | -------------------------- |
| Hydration     | `src/modules/hydration/`   |
| Meditation    | `src/modules/meditation/`  |
| Sleep         | `src/modules/sleep/`       |
| Supplements   | `src/modules/supplements/` |
| Trackers      | `src/modules/trackers/`    |
| Daily         | `src/modules/daily/`       |
| Calendar      | `src/modules/calendar/`    |
| Profile prefs | `src/modules/profile/`     |

## UI surfaces

- Today board focus panels: Hydration, Meditation, Sleep, Supplements, CustomTracker
- Routes: `/calendar`, `/history`, profile totals + **reminder preference UI** (persistence only; deferred-delivery copy)
- Board status labels from real domain loaders (not demo `daily_module_statuses` alone)

## Dexie

**v9 + v10** — see [INCREMENT_9_OFFLINE_SYNC.md](./INCREMENT_9_OFFLINE_SYNC.md). v10 adds `userSupplementDrafts` and `trackerReminderDrafts`.

## Module management (Increment 3 + 9)

- **Board enable/disable** — Increment 3 customize (`set_module_enabled`); see Inc 3 docs
- **Tracker catalog** — enable catalog trackers or create custom trackers via `/customize` and focus panels
- **Targets** — per-tracker targets with optional `days_of_week`; confirm checkbox before counting toward completion
- **Archive** — custom/catalog trackers can be archived; excluded from daily overview when archived

## Timezone change

When a user changes profile timezone:

- **Existing rows keep** their stored `local_date`, `sleep_date`, and session `timezone` (written at log time)
- **Future logs** use the new profile timezone for display helpers and new session rows
- **Calendar/history** do not retroactively regroup past rows — aggregation uses stored dates only
- **Reminder preferences** store `timezone` at save time; edit reminders after a move if schedules should follow the new zone

## Reminder preferences vs delivery

- **`tracker_reminders`** rows persist locally and sync offline via `buildTrackerReminderWrites`
- Profile **Reminder preferences** section: list, add, edit, disable, remove — association to tracker or supplement, `local_time`, `days_of_week`, `enabled`
- Copy: _"Saved reminder preference — notification delivery arrives in a later release."_
- **No Notification API**, push, or email in Increment 9

## Deferred (Increment 10+)

- Reminder push/email delivery (rows persist; UI labels delivery as later)
- AI meal/workout/rehab generation, wearables, social

## Increment 9 recovery + cleanup (shipped)

- Meditation timer recovery UI + Dexie persistence (`meditationTimerState`)
  - Active / paused restore; expired confirm / adjust / discard; one-active-timer; local-date bind
- Post-sync draft cleanup (`draft-cleanup.ts`) wired into sync-coordinator
  - Newer-draft protection; definition sync does not delete child drafts; startup `reconcileStaleDrafts`
  - Recoverable cleanup warnings (server write stays synced)
- Offline status: `OfflineRecordStatusBadge` + `SyncStatusBanner` + `DailyOverviewSyncHealth`
- Reminder delivery remains deferred; human browser/device QA remains pending

## Verify locally

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
# With Docker: supabase db reset + increment3–9 SQL suites
```
