# DATA_MODEL.md

Logical persistence sketch. Names match Increment 3 migrations where shipped.

## Systems of record

| Store | Holds |
| --- | --- |
| Supabase Postgres | Canonical user data, catalogs mirrored as needed, sync metadata |
| Supabase Storage | Private progress photos (and optional meal receipt images later) |
| Dexie / IndexedDB | Offline mirrors, outbox, food cache, exercise catalog subset |

## Identity & board (Increment 3 — shipped)

See `docs/development/INCREMENT_3_DATA_MODEL.md` for full column/RLS/conflict detail.

```
profiles
  id (uuid = auth.users.id)
  display_name, avatar_path, timezone, locale
  units_system, animation_mode
  onboarding_completed, onboarding_step
  created_at, updated_at

module_definitions          -- system catalog (seeded)
user_modules                -- per-user enable/label/targets
dashboard_layouts           -- versioned; one active layout
dashboard_cards             -- position + visual_variant
daily_records               -- unique (user_id, local_date)
daily_module_statuses       -- summary status only + revision
```

RLS: owner-scoped; `module_definitions` authenticated read of active rows.

## Exercise catalog (Increment 6 — shipped)

```
muscle_groups, equipment_types, movement_patterns   -- taxonomy (seeded)
exercise_definitions
  stable_key, name, normalized_name, description
  exercise_type, movement_pattern_id, primary_equipment_id
  unilateral, bodyweight, timed, distance_based
  source exercise_source   -- mtfbwu_curated | free_exercise_db | other
  source_id, verified, active
exercise_aliases, exercise_muscle_groups
user_exercises          -- catalog wrapper OR custom_name (exactly one)
```

Catalog rows are **authenticated read-only** (no client writes). Seed descriptions
are original `mtfbwu_curated` text; `free_exercise_db` is reference-only for naming
— do not claim copied descriptions.

## Workouts — plans vs sessions (Increment 6 — shipped)

```
workout_plans (+ version, soft deleted_at)
workout_plan_days       -- day_of_week + sort_order (no day_index)
workout_blocks          -- block_type enum; transition_seconds (align migration)
workout_block_exercises
workout_set_prescriptions   -- target_weight_kg, completion_rule, set_role, target_rir, tempo_* columns

scheduled_workouts      -- local_date, title, timezone, status

workout_sessions        -- status in_progress|paused|completed|discarded; version; snapshot_json; source_plan_version
workout_session_exercises   -- display_name_snapshot, block_type_snapshot, block_order, exercise_order
workout_sets            -- weight_kg + load_unit; status includes partial
workout_session_notes, personal_records   -- status pending|confirmed|dismissed (align migration)
```

Detail: `docs/development/WORKOUT_PLAN_MODEL.md`, `WORKOUT_SESSION_MODEL.md`.
Editing a plan never rewrites completed session snapshots (`ADR/0007`).

Plan editor UI at `/plans` and `/plans/[planId]` mutates the template hierarchy
only; copy/repeat session actions materialize new performed rows from prior
sessions without rewriting history.

## Nutrition (Increment 4–5)

```
nutrient_definitions              -- stable nutrient keys and display units
foods                             -- normalized catalog/user food identity + provenance
food_aliases, food_portions       -- searchable names and gram conversions
food_nutrients                    -- amount per 100 g, one row per nutrient
branded_products, barcodes        -- server-managed provider/cache metadata
user_custom_foods                 -- owner mapping + private visibility

recipes, recipe_ingredients       -- reusable user-owned composition; snapshots
meal_templates, meal_template_items -- planned/reusable meal structures
meal_logs, meal_log_items          -- performed meals; macros and source/nutrient snapshots
nutrition_goals                   -- user-owned targets effective from a date

nutrition_label_captures          -- OCR drafts; private_image_path; reviewed JSON
product_review_events             -- append-only review audit (no image payloads)
```

`foods.source` records `user_custom`, `mtfbwu_curated`, Open Food Facts, USDA
dataset tier, branded cache, or other provenance. Performed `meal_log_items`
freeze display name, macros, detailed nutrient JSON, and source JSON; edits to
catalog rows never rewrite history. Recipes/templates remain separate from
performed logs. Provider lookup/cache writes are server-only; user custom-food
writes are RLS owner-scoped.

Label images live in private Storage bucket `nutrition-labels` under
`{user_id}/nutrition-labels/{capture_id}.jpg`. Default retention deletes the
object after a successful reviewed save unless the user opts to keep it.
OCR suggestions are never trusted without human confirmation (`ADR/0006`).

## Rehab (Increment 7 — shipped)

```
rehab_body_areas / rehab_movements / rehab_exercise_definitions / rehab_exercise_aliases
user_rehab_exercises
rehab_clinician_sources
rehab_plans (+ version, soft deleted_at via archive_rehab_plan)
  rehab_plan_phases
    rehab_plan_days
      rehab_plan_exercises   -- catalog XOR user exercise
        rehab_set_prescriptions
  rehab_restrictions         -- value_text primary
scheduled_rehab_sessions
rehab_sessions               -- clinician/restriction/session snapshots; version
  rehab_session_exercises    -- name/instructions/stop snapshots
  rehab_sets                 -- pain/swelling/instability/confidence
  rehab_session_observations
  rehab_alert_events
```

Plan ≠ scheduled ≠ performed. See `docs/development/REHAB_PLAN_MODEL.md`,
`REHAB_SESSION_MODEL.md`, ADRs 0009–0010.

## Hydration / meditation

Mirror workout/rehab pattern at smaller scale when implemented: template optional
+ session/log tables; keep template≠session invariant.

## Measurements (Increment 8 — shipped)

```
measurement_definitions       -- system catalog (seed)
user_measurement_definitions  -- enabled catalog or custom_name
body_weight_entries           -- dated weight snapshots, normalized_kg
body_measurement_entries      -- dated measurement sets
body_measurement_values       -- per definition + side
```

See `docs/development/WEIGHT_AND_MEASUREMENTS.md`.

## Progress photos (Increment 8 — shipped)

```
progress_photo_sets
progress_photos               -- private_storage_path
progress_comparisons
progress_notes
progress_summary_preferences
```

Storage path: `{user_id}/progress/{set_id}/{slot}-{photo_id}.jpg` in bucket `progress-photos`. See `docs/development/PROGRESS_PHOTOS.md`, ADR 0011; comparisons ADR 0012.

## Calendar & custom trackers (Increment 9 — shipped)

```
tracker_definitions              -- system catalog (seeded)
user_trackers                    -- catalog wrapper OR custom_name
tracker_targets                  -- effective-dated; confirmed_by_user for board goals
tracker_events                   -- generic performed logs (numeric/boolean/text/duration)
tracker_daily_summaries          -- per-day cache; RPC recalculate_tracker_daily_summary
tracker_streaks

hydration_entries                -- local_date, amount_ml, vessel_label
meditation_sessions              -- local_date, duration_seconds, meditation_type
sleep_sessions                   -- sleep_date (= local date of bedtime_at), bedtime_at, wake_at
supplement_definitions           -- system catalog (seeded)
user_supplements, supplement_intakes

tracker_reminders                -- persist schedule; delivery deferred
profile_preferences              -- daily overview + reminder prefs
```

Sleep **`sleep_date`** rule: local date of **`bedtime_at`** in session timezone (ADR 0014).
Detail: `docs/development/INCREMENT_9_DAILY_SYSTEM.md`.

## Legacy sketch (superseded by Increment 9 generic model)

```
calendar_pins (optional) -- user markers on days

custom_trackers            -- replaced by user_trackers + tracker_events
custom_tracker_entries
```

## Sync / AI

```
sync_tombstones / client_mutation_ids  -- idempotency

ai_import_jobs
  id, user_id, status, source_filename, created_at

ai_import_proposals
  id, job_id, domain, payload jsonb
  provenance jsonb
  review_status  -- pending | accepted | edited | rejected
```

## Dexie mirror (indicative)

Increment 4 adds `mealLogDrafts` alongside `outbox`. Increment 5 adds
`labelCaptureDrafts`. Increment 6 (Dexie v4) adds `activeWorkoutSessions`,
`workoutSetDrafts`, and `workoutNoteDrafts`. Increment 7 (Dexie v6) adds
`activeRehabSessions`, `rehabSetDrafts`, `rehabObservationDrafts`, and
`rehabAlertDrafts`. Increment 8 (Dexie v8) adds `weightDrafts`,
`measurementDrafts`, `progressPhotoDrafts`, `progressPhotoBlobs`, and
`progressNoteDrafts`. Increment 9 (Dexie v9–v11) adds `hydrationDrafts`,
`meditationDrafts`, `meditationTimerState`, `sleepDrafts`,
`supplementIntakeDrafts`, `trackerEventDrafts`, `trackerTargetDrafts`,
`profilePreferenceDrafts`, `userSupplementDrafts`, `trackerReminderDrafts`, and
`dailyOverviewCache`. Sync
coordinator applies `kind: "workout"`, `kind: "rehab"`, `kind: "progress"`, and
`kind: "tracker"` payloads. See `docs/development/INCREMENT_9_OFFLINE_SYNC.md`.

## Indexes (early)

- `meal_logs (user_id, daily_record_id, meal_type)` and `(user_id, consumed_at desc)`
- `workout_sessions (user_id, started_at)`
- `rehab_sessions (user_id, started_at)`
- `foods (normalized_name)`, `(source, source_id)` unique, `barcodes (normalized_barcode)`
- `measurement_entries (user_id, recorded_at)`

## Non-goals in schema

No `posts`, `follows`, `reactions`, or feed tables.
