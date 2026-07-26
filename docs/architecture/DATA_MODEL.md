# DATA_MODEL.md

Logical persistence sketch. **No migrations in this phase.** Names are indicative.

## Systems of record

| Store | Holds |
| --- | --- |
| Supabase Postgres | Canonical user data, catalogs mirrored as needed, sync metadata |
| Supabase Storage | Private progress photos (and optional meal receipt images later) |
| Dexie / IndexedDB | Offline mirrors, outbox, food cache, exercise catalog subset |

## Identity

```
profiles
  id (uuid = auth.users.id)
  display_name
  units_preference
  animation_mode  -- full | reduced | disabled
  enabled_modules jsonb
  created_at, updated_at
```

RLS: `id = auth.uid()`.

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

## Nutrition

```
food_items
  id
  source            -- usda | open_food_facts | user | ai_proposed
  external_id       -- fdcId / barcode / local
  barcode
  name, brand
  nutrients_per_100g jsonb
  serving jsonb
  raw_payload jsonb -- optional bounded cache of provider response
  cached_at
  review_status     -- trusted | needs_review | rejected

meal_logs
  id, user_id, logged_at, label

meal_entries
  id, meal_log_id, food_item_id
  quantity, unit
  nutrients_snapshot jsonb  -- freeze macros at log time
```

Server-side USDA lookups populate `food_items`; OFF barcode hits populate/cache similarly.

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

Tables roughly: `profiles`, `exercises`, `workout_*`, `food_items`, `meal_*`, `outbox`, `meta`. Versioned via Dexie `db.version(n).stores(...)`.

## Indexes (early)

- `meal_logs (user_id, logged_at)`
- `workout_sessions (user_id, started_at)`
- `food_items (barcode)`, `food_items (source, external_id)` unique
- `measurement_entries (user_id, recorded_at)`

## Non-goals in schema

No `posts`, `follows`, `reactions`, or feed tables.
