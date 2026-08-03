# Database performance review (Increment 10)

Local `EXPLAIN (ANALYZE, BUFFERS)` review using synthetic recovery-drill scale data.
**These timings are not production guarantees.**

## Method

1. Start local Supabase and apply migrations.
2. Seed representative rows via `pnpm seed:recovery-drill --target=local --confirm=local-seed` (and additional inserts as needed).
3. Run `EXPLAIN (ANALYZE, BUFFERS)` for each query below against `postgres`.
4. Prefer existing owner-scoped indexes from Increments 3–9; add only justified net-new indexes.

## Queries

| Query                                                                 | Representative scale (local) | Plan summary                                                 | Index used                                           | Local time        | Action                                                        |
| --------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ----------------- | ------------------------------------------------------------- |
| Calendar month: `daily_records` for user + month                      | ~30–90 days / user           | Index scan on `(user_id, local_date desc)`                   | `daily_records_user_date_idx`                        | < 5 ms typical    | No new index                                                  |
| Daily overview join via `daily_records` + module statuses             | 1 day + N modules            | Nested loop on owned daily record                            | `daily_records_user_date_idx`                        | < 10 ms           | No new index                                                  |
| History pagination: meals by `consumed_at`                            | hundreds of meals            | Backward index scan                                          | `meal_logs_user_consumed_at_idx`                     | < 15 ms           | No new index                                                  |
| Food search: curated `foods` ilike                                    | catalog seed                 | Seq/bitmap depending on pattern; catalog is shared read-only | source filters + name                                | pattern-dependent | No new index (catalog size still modest)                      |
| Workout recent history                                                | tens–hundreds sessions       | Index scan                                                   | `workout_sessions_user_started_idx`                  | < 10 ms           | No new index                                                  |
| Rehab recent history                                                  | tens–hundreds sessions       | Index scan                                                   | `rehab_sessions_user_started_idx`                    | < 10 ms           | No new index                                                  |
| Progress timeline weights                                             | tens–hundreds entries        | Index scan                                                   | `body_weight_entries_user_recorded_idx` / date idx   | < 10 ms           | No new index                                                  |
| Tracker daily summaries                                               | tens–hundreds                | Index scan                                                   | `tracker_daily_summaries_user_date_idx`              | < 10 ms           | No new index                                                  |
| Account deletion ownership enumeration: active progress photos by set | nested sets/photos           | Partial index on active photos                               | **added** `progress_photos_set_active_idx`           | < 10 ms           | Added in `20260802120100_increment10_lifecycle_hardening.sql` |
| Export retained label images                                          | sparse retained captures     | Partial index                                                | **added** `nutrition_label_captures_user_retain_idx` | < 5 ms            | Added same migration                                          |

## Indexes added in Increment 10 completion

```sql
create index if not exists progress_photos_set_active_idx
  on public.progress_photos (progress_photo_set_id)
  where deleted_at is null;

create index if not exists nutrition_label_captures_user_retain_idx
  on public.nutrition_label_captures (user_id)
  where deleted_at is null and retain_image = true and private_image_path is not null;
```

## Script helper

See `scripts/explain-critical-queries.mjs` for a reproducible local EXPLAIN runner (requires running Supabase).
