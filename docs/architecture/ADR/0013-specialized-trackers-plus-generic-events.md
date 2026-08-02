# ADR 0013: Specialized trackers plus generic events

## Status

Accepted (Increment 9)

## Context

Hydration, meditation, sleep, and supplements need first-class persistence, calculations, and board status labels. Configurable user trackers also need a flexible event model without one table per habit.

## Decision

- **Specialized tables** for domain-heavy logs: `hydration_entries`, `meditation_sessions`, `sleep_sessions`, `supplement_definitions`, `user_supplements`, `supplement_intakes`.
- **Generic tracker model** for catalog + custom trackers: `tracker_definitions` (system catalog), `user_trackers`, `tracker_targets`, `tracker_events`, `tracker_daily_summaries`, `tracker_streaks`.
- Board targets require `confirmed_by_user = true` on `tracker_targets`.
- `tracker_reminders` rows persist preferences; push/email delivery is deferred.
- Dexie v9–v10 + `kind: "tracker"` outbox replay applies domain writes idempotently with dependency ordering (`user_tracker` → `target` → `event`).
- Calendar month indicators count `tracker_events` **only for custom** `user_trackers` (`tracker_definition_id IS NULL`) to avoid double-counting specialized modules.

## Consequences

- Board loaders query real domain tables instead of demo summaries in `daily_module_statuses`.
- Custom numeric/boolean/text trackers reuse `tracker_events` without new migrations per habit.
- CI runs `increment9_daily_rls.sql` and validates Increment 9 table aliases in TypeScript types.

## Related

- ADR [0014](./0014-local-date-calendar-aggregation.md) — local-date and sleep_date rules
- `docs/development/INCREMENT_9_DAILY_SYSTEM.md`
