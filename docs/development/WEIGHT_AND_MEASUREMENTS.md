# Weight and measurements (Increment 8)

## Catalog

`measurement_definitions` — seeded read-only catalog (waist, chest, upper arm with L/R, etc.).

## User config

`user_measurement_definitions` — enable catalog entries or create `custom_name` rows.

## Entries

- **Weight:** `body_weight_entries` with `normalized_kg`
- **Measurements:** `body_measurement_entries` + `body_measurement_values` (one row per definition + side)

Historical rows are dated snapshots — new records append; soft delete via `deleted_at`.

## Units (`src/modules/measurements/units.ts`)

| Unit    | Normalized to                      |
| ------- | ---------------------------------- |
| kg, lb  | kg                                 |
| cm, in  | cm                                 |
| percent | 0–100 (manual body fat entry only) |

## Side mode

When `side_mode === left_right`, UI collects **Left** and **Right** values separately (`measurement_value_side`).

## Calculations

`src/modules/measurements/calculations/` — delta, percent change, same-day chart modes (`latest` default), neutral trend text.

## Actions

`src/modules/measurements/actions.ts` — weight CRUD, enable/disable catalog measurements, custom measurement, entry CRUD, chart/summary helpers.
