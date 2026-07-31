# Workout plan model

Migrations: `supabase/migrations/20260730120000_increment6_workout_engine.sql`,
`20260730120400_increment6_plan_editor_align.sql`

Plans are **templates** — reusable structure a user edits over time. They are
intentionally separate from performed history (`ADR/0007`).

## Hierarchy

```
workout_plans
  └── workout_plan_days          (day_of_week + sort_order)
        └── workout_blocks       (block_type, rounds, rest_seconds)
              └── workout_block_exercises   (catalog or user exercise)
                    └── workout_set_prescriptions   (targets per set)
```

## `workout_plans`

| Column                             | Notes                                                        |
| ---------------------------------- | ------------------------------------------------------------ |
| `id`, `user_id`                    | Owner-scoped RLS                                             |
| `name`, `description`, `objective` | Display + intent                                             |
| `version`                          | Optimistic concurrency; starts at 1; bump on structural edit |
| `active`                           | User-visible flag                                            |
| `source`                           | e.g. `user_created`, `starter_arnold`                        |
| `deleted_at`                       | Soft delete; hidden from select policy when set              |

**Conflict:** updates must send expected `version`; stale writes are rejected.

## `workout_plan_days`

| Column        | Notes                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `name`        | e.g. "Chest & Back"                                                            |
| `day_of_week` | `0`–`6` (Sunday–Saturday) or `null` for unanchored days                        |
| `sort_order`  | **`sort_order` + optional `day_of_week`** — there is **no** `day_index` column |
| `rest_day`    | When true, day is rest-only (no blocks required)                               |
| `notes`       | Free text                                                                      |

Unique: `(workout_plan_id, sort_order)`.

Days order within a plan by `sort_order`, not by weekday alone. A six-day split
may repeat weekdays (see Arnold starter: Mon–Sat with `sort_order` 0–5).

## `workout_blocks`

| Column               | Notes                                                   |
| -------------------- | ------------------------------------------------------- |
| `block_type`         | `workout_block_type` enum — see `ADVANCED_SET_TYPES.md` |
| `title`              | Optional label ("Main lift", "Finisher")                |
| `sort_order`         | Order within the day                                    |
| `rounds`             | For circuits / timed blocks                             |
| `rest_seconds`       | Block-level rest default                                |
| `transition_seconds` | Rest between exercises within a block (align migration) |

Unique: `(workout_plan_day_id, sort_order)`.

## `workout_block_exercises`

Exactly one of:

- `exercise_definition_id` — catalog exercise
- `user_exercise_id` — private custom or catalog wrapper

`sort_order` orders exercises within the block (superset/circuit members share
the block, not a separate join table).

## `workout_set_prescriptions`

| Column                                                                                                         | Notes                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `set_index`                                                                                                    | 1-based within the block exercise                                             |
| `set_role`                                                                                                     | `warmup`, `working`, `top_set`, `backoff`, `drop_set`, `amrap`                |
| `completion_rule`                                                                                              | `fixed_reps`, `rep_range`, `time_based`, `distance_based`, `amrap_to_failure` |
| `target_reps_min`, `target_reps_max`                                                                           | Rep range when applicable                                                     |
| `target_weight_kg`                                                                                             | Prescription load in **kilograms** (canonical storage)                        |
| `target_duration_seconds`, `target_distance_meters`                                                            | Time/distance targets                                                         |
| `target_rpe`                                                                                                   | 0–10                                                                          |
| `target_rir`                                                                                                   | 0–10 (align migration)                                                        |
| `tempo_eccentric_seconds`, `tempo_pause_bottom_seconds`, `tempo_concentric_seconds`, `tempo_pause_top_seconds` | Four-phase tempo prescription (align migration)                               |
| `rest_seconds`                                                                                                 | Per-set rest override                                                         |

Check constraints enforce rep min ≤ max and required targets per completion
rule.

## Scheduling link

`scheduled_workouts` references optional `workout_plan_id` +
`workout_plan_day_id` plus `local_date`, `title`, `timezone`, and
`scheduled_workout_status` (`planned`, `completed`, `skipped`, `missed`,
`rescheduled`).

At most one scheduled row per `(user_id, local_date, workout_plan_day_id)` and
one ad-hoc title per date when `workout_plan_day_id` is null.

## Plan editor UI

Routes:

- `/plans` — list plans, create blank plan, install Arnold starter, schedule a
  day for today.
- `/plans/[planId]` — full editor (`PlanEditorClient`).

Shipped editor capabilities (server actions in `plans/actions.ts`):

| Area          | Actions                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan meta     | `createPlanAction`, `updatePlanMetaAction`, `archivePlanAction`, `copyPlanAction`, `versionPlanAction`                                            |
| Days          | `addPlanDayAction`, `updatePlanDayAction`, `deletePlanDayAction`, `duplicatePlanDayAction`, `reorderPlanDaysAction`                               |
| Blocks        | `addBlockAction`, `updateBlockAction`, `deleteBlockAction`, `duplicateBlockAction`, `reorderBlocksAction`                                         |
| Exercises     | `addBlockExerciseAction`, `substituteBlockExerciseAction`, `deleteBlockExerciseAction`, `reorderBlockExercisesAction`, `createUserExerciseAction` |
| Prescriptions | `addPrescriptionAction`, `updatePrescriptionAction`, `deletePrescriptionAction`, `duplicatePrescriptionAction`, `reorderPrescriptionsAction`      |

**Reorder:** keyboard ArrowUp/ArrowDown on focused day/block/exercise/prescription
rows (`moveIds` helper). Pointer drag-and-drop is **not** shipped.

**Version conflict:** every structural mutation sends `expectedVersion`. Stale
writes return `conflict: true`; the editor shows a refresh banner. **Refresh
plan** reloads server state; **Copy plan** or **New version** forks without
overwriting the remote edit.

## Starter install

`installArnoldStarterPlanAction` copies `ARNOLD_STARTER_PLAN` into user-owned
rows, resolving `exerciseStableKey` → `exercise_definitions.id`. Never runs
automatically.

## Invariants

1. Editing a plan increments `version` and affects **future** sessions only.
2. In-flight or completed sessions retain snapshots taken at start (`WORKOUT_SESSION_MODEL.md`).
3. Catalog exercise rows are never mutated by plan writes.
