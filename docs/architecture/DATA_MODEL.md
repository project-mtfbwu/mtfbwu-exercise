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

## Exercise catalog

```
exercises
  id, slug, name
  force, level, mechanic, equipment
  primary_muscles text[]
  secondary_muscles text[]
  category
  instructions jsonb
  image_paths jsonb
  source  -- free_exercise_db | user | ...
  source_id
```

User may add private custom exercises (`owner_id` nullable for global catalog rows).

## Workouts — templates vs sessions

```
workout_templates
  id, user_id, name, notes, updated_at

workout_template_items
  id, template_id, exercise_id, sort_order
  group_id          -- superset/circuit grouping
  protocol          -- straight | superset | dropset | ...
  target_sets jsonb -- [{reps, weight, rir, rest_sec}]

workout_sessions
  id, user_id, template_id null
  started_at, ended_at, status
  notes, perceived_effort

workout_session_items
  id, session_id, exercise_id, sort_order
  group_id, protocol
  snapshot_name     -- denormalized at session start

performed_sets
  id, session_item_id, set_index
  reps, weight, weight_unit, duration_sec, rir
  completed, protocol_meta jsonb
```

## Nutrition (Increment 4)

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
```

`foods.source` records `user_custom`, `mtfbwu_curated`, Open Food Facts, USDA
dataset tier, branded cache, or other provenance. Performed `meal_log_items`
freeze display name, macros, detailed nutrient JSON, and source JSON; edits to
catalog rows never rewrite history. Recipes/templates remain separate from
performed logs. Provider lookup/cache writes are server-only; user custom-food
writes are RLS owner-scoped.

## Rehab / hydration / meditation

Mirror workout pattern at smaller scale: protocol/template optional + session/log tables. Exact columns deferred to increment design; keep template≠session invariant.

## Measurements

```
measurement_types  -- system + user custom
measurement_entries
  id, user_id, type_id, value, unit, recorded_at, notes
```

## Progress photos

```
progress_photo_sets
  id, user_id, taken_on, pose, notes

progress_photos
  id, set_id, storage_path, sort_order, width, height
```

Storage path convention: `{user_id}/{set_id}/{photo_id}.jpg` in a **private** bucket. RLS on `storage.objects` must match owner folder. See `SECURITY_AND_PRIVACY.md`.

## Calendar & custom trackers

```
calendar_pins (optional) -- user markers on days

custom_trackers
  id, user_id, name, value_type, unit, config jsonb

custom_tracker_entries
  id, tracker_id, value jsonb, recorded_at
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

Increment 4 adds `mealLogDrafts` (`id`, `userId`, `mealLogId`, payload, timestamps)
alongside `outbox`. Nutrition payloads contain primary-keyed writes for a meal
log, recipe, custom food, or meal template and can be safely replayed as
upserts. Food cache mirrors remain a future optimization.

## Indexes (early)

- `meal_logs (user_id, daily_record_id, meal_type)` and `(user_id, consumed_at desc)`
- `workout_sessions (user_id, started_at)`
- `foods (normalized_name)`, `(source, source_id)` unique, `barcodes (normalized_barcode)`
- `measurement_entries (user_id, recorded_at)`

## Non-goals in schema

No `posts`, `follows`, `reactions`, or feed tables.
