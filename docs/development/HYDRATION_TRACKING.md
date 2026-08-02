# Hydration tracking

Increment 9 hydration logs individual water intakes and optional daily targets.

## Data model

- **`hydration_entries`** — `local_date`, `occurred_at`, `amount_ml` (1–10000), optional `vessel_label`, soft delete via `deleted_at`
- Targets live on **`tracker_targets`** linked to the user's hydration `user_tracker` (`tracker_definitions.stable_key = 'hydration'`)
- Target requires **`confirmed_by_user = true`** before board progress uses it

## Module

`src/modules/hydration/` — schemas, actions, `load-hydration-day.ts`, calculations.

## UI

- **Hydration focus** (`hydration-focus.tsx`) — preset vessels **250 / 500 / 750 / 1000 ml**, custom amount, progress meter
- Board label from `hydrationProgress().label` (totals + optional target)

## Offline

Dexie `hydrationDrafts` + tracker outbox `buildHydrationEntryWrites`. See [INCREMENT_9_OFFLINE_SYNC.md](./INCREMENT_9_OFFLINE_SYNC.md).

## Related

- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
- Design reference: `docs/design-references/08-water-focus.png.png`
