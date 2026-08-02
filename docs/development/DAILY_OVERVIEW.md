# Daily overview

Single aggregation boundary for board-adjacent day rollups.

## Loader

`loadDailyOverview(localDate, timezone)` in `src/modules/daily/load-daily-overview.ts`

Pulls in parallel:

- Nutrition (meals + macro sum)
- Workout / rehab day summaries + completed session counts
- Progress (weight/measurements/photos day summary)
- Hydration, meditation, sleep, supplements day summaries
- Custom tracker event counts

Returns `DailyOverview` with `calculateDailyCompletion()` percent across enabled modules.

## Consumers

- `/history` pagination
- Calendar day detail (partial fields)
- Future profile/dashboard surfaces

## Rules

- Requires authenticated user + optional `daily_records` row for the `local_date`
- Does **not** replace focus-panel detail loaders — use domain modules for edit surfaces
- Timezone passed for sleep date helpers and display formatting
- **Custom tracker counts** include only `user_trackers` where `tracker_definition_id IS NULL`, `enabled`, and not archived — same filter in calendar month indicators (see ADR 0013)

## Specialized vs generic counting

Hydration, meditation, sleep, and supplements use **specialized tables** in month indicators. `tracker_events` in calendar/daily overview count **custom trackers only** — catalog-backed modules must not double-count via generic events.

## Timezone change

`loadDailyOverview` receives profile timezone for display helpers. Existing logged rows keep their stored `local_date`; completion percent does not retroactively shift when timezone changes.

## Offline

Overview/history reflect server state after tracker outbox sync; no separate offline cache for overview rows.

## Related

- [CALENDAR_AND_HISTORY.md](./CALENDAR_AND_HISTORY.md)
- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
