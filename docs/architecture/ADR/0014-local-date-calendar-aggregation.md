# ADR 0014: Local-date calendar aggregation

## Status

Accepted (Increment 9)

## Context

Daily trackers span midnight, user timezones differ, and calendar/history views must group logs on the day the user experienced them—not always UTC calendar boundaries.

## Decision

- **`local_date`** on hydration, meditation, supplement intakes, and tracker events is the user's calendar day for that log (from profile timezone at write time).
- **`sleep_date`** on `sleep_sessions` is the **local date of `bedtime_at`** in the session's stored timezone. A session crossing midnight still belongs to the bedtime day.
- **`daily_records`** remain the anchor `(user_id, local_date)` for board status and cross-module day summaries.
- Calendar month indicators and `/history` paginate by these local dates, not raw UTC instants alone.
- `loadDailyOverview` in `src/modules/daily/` is the aggregation boundary for cross-module day rollups.

## Consequences

- Sleep logged 22:00→06:00 appears on the bedtime date in calendar and weekly averages.
- Offline replay must preserve client-supplied `local_date` / computed `sleep_date`; server does not re-derive from UTC-only timestamps without timezone.
- Tests cover cross-midnight sleep and timezone-aware `sleepDateFromBedtime`.

## Related

- ADR [0013](./0013-specialized-trackers-plus-generic-events.md)
- `docs/development/SLEEP_TRACKING.md`, `CALENDAR_AND_HISTORY.md`, `DAILY_OVERVIEW.md`
