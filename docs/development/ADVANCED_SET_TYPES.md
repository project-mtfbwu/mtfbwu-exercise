# Advanced set types and block protocols

Schema enums from `20260730120000_increment6_workout_engine.sql`. UI may
implement subsets in Increment 6; the database accepts the full enum for
forward compatibility (`ADR/0008`).

## Block types (`workout_block_type`)

| Type            | Intent                          | Completion guidance                                                            |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `warmup`        | Ramp-up sets                    | Lower load; optional time-based warmups                                        |
| `straight_sets` | Default strength                | Independent sets with prescribed rest                                          |
| `superset`      | Paired exercises                | Alternate exercises with minimal rest between                                  |
| `circuit`       | Round robin                     | `rounds` on block; cycle exercises before rest                                 |
| `amrap`         | As many reps/rounds as possible | `completion_rule = amrap_to_failure` or time cap via `target_duration_seconds` |
| `emom`          | Every minute on the minute      | Timed start each minute; track reps completed                                  |
| `for_time`      | Complete work ASAP              | Distance/rep target + elapsed time                                             |
| `drop_set`      | Load drops within exercise      | `set_role = drop_set` sequence; descending load                                |
| `cooldown`      | Down-regulation                 | Light reps or time-based                                                       |

Block-level `rounds` and `rest_seconds` apply to circuit/amrap/emom/for_time
interpretation in UI; prescriptions still live on `workout_set_prescriptions`.

## Set roles (`workout_set_role`)

| Role       | Typical use                       |
| ---------- | --------------------------------- |
| `warmup`   | Ramp sets                         |
| `working`  | Primary work sets                 |
| `top_set`  | Heaviest single/rpe target set    |
| `backoff`  | Reduced load after top set        |
| `drop_set` | Intra-exercise load drop          |
| `amrap`    | Max-effort set to failure or time |

## Completion rules (`workout_set_completion_rule`)

| Rule               | Required targets                              | Done when                      |
| ------------------ | --------------------------------------------- | ------------------------------ |
| `fixed_reps`       | `target_reps_min` (= max) or single rep count | User logs target reps (± skip) |
| `rep_range`        | `target_reps_min`, `target_reps_max`          | Reps within range logged       |
| `time_based`       | `target_duration_seconds`                     | Duration met or partial logged |
| `distance_based`   | `target_distance_meters`                      | Distance met                   |
| `amrap_to_failure` | Optional cap in notes/duration                | User logs achieved reps/time   |

DB checks: `time_based` requires `target_duration_seconds`; `distance_based`
requires `target_distance_meters`.

## Performed set statuses (`workout_set_status`)

`pending` → `completed` | `skipped` | `failed` | `partial`

`partial` added in align migration for incomplete timed work or user-marked
incomplete sets; volume calculations count `completed` and `partial` strength
sets (`src/modules/workout/calculations/volume.ts`).

## Supersets and circuits

- **Superset:** multiple `workout_block_exercises` rows in one block with
  `block_type = superset`. Perform A → B → rest.
- **Circuit:** `block_type = circuit` with `rounds` > 1; iterate exercises
  `sort_order` within each round.

No separate `group_id` column — grouping is implied by block membership and
`sort_order`.

## Drop sets

Use `block_type = drop_set` or consecutive prescriptions with
`set_role = drop_set` on one block exercise. Each drop is its own
prescription row with descending `target_weight_kg` (or user-chosen load at
performance time).

## AMRAP / EMOM / for-time

- **AMRAP:** block type `amrap`; prescriptions may use `amrap_to_failure` or
  rep range with open max.
- **EMOM:** block type `emom`; lean on `target_duration_seconds` per set or
  block-level timing in UI.
- **For time:** block type `for_time`; session stores elapsed time on finish
  (`duration_seconds` at session level; per-set duration optional).

Increment 6 UI may render these as structured straight sets first; enum values
exist so plans do not need migration when timers land.

## Load and units

Prescriptions store **`target_weight_kg`** (canonical). Performed sets store
**`weight_kg` + `load_unit`**. Conversions live in
`src/modules/workout/calculations/units.ts`. Bodyweight loads require the
caller to resolve the user's bodyweight before persisting kg.

## RPE / RIR

Prescription: `target_rpe` (0–10). Performance: `rpe` and `rir` on
`workout_sets`. These are user-entered effort markers — not automated
prescriptions or medical scores.

## 1–10 scales

RPE and RIR use 0–10 numeric checks in SQL. UI should clamp input; server
actions validate via Zod schemas.

## Out of scope (Increment 6)

- Auto-progression engines (next session load suggestions)
- Tempo prescription editor (column `tempo_snapshot` exists for capture only)
- Complex cluster/rest-pause beyond drop_set role
- Rehab-specific protocol enums (deferred)
