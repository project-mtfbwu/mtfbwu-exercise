# Sleep tracking

Increment 9 sleep logs bedtime, wake time, optional quality, nap flag, and notes.

## Sleep date rule

**`sleep_date` = local date of `bedtime_at`** in the session's stored timezone.

A session crossing midnight (e.g. 22:00 → 06:00) still belongs to the **bedtime calendar day**, not the wake day. Implemented in `sleepDateFromBedtime()` (`src/modules/sleep/calculations/helpers.ts`).

## Data model

- **`sleep_sessions`** — `sleep_date`, `timezone`, `bedtime_at`, `wake_at`, `duration_seconds`, optional `quality`, `nap`, soft delete
- Constraint: `wake_at > bedtime_at`

## Module

`src/modules/sleep/` — schemas, actions, `load-sleep-day.ts`, weekly descriptive averages (informational only, no medical interpretation).

## UI

- **Sleep focus** — bedtime/wake time pickers; session list with soft-delete; auto-advances wake date when wake ≤ bedtime on same calendar day
- Board label: formatted duration or "Sleep · not logged"

## Offline

Dexie `sleepDrafts` + tracker outbox sleep session writes. Soft-delete via `buildSleepSessionDeleteWrites` (online `deleteSleepSessionAction`).

Replay: tier 3 domain row after configuration parents — see [INCREMENT_9_OFFLINE_SYNC.md](./INCREMENT_9_OFFLINE_SYNC.md).

## Timezone

Each session stores its `timezone` at write time. Profile timezone changes affect new sessions only; historical `sleep_date` values are unchanged.

## Related

- ADR [0014](../architecture/ADR/0014-local-date-calendar-aggregation.md)
- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
