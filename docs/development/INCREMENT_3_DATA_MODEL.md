# Increment 3 data model

Migration: `supabase/migrations/20260726120000_increment3_auth_board_daily.sql`

## Tables

| Table                   | Role                                                                |
| ----------------------- | ------------------------------------------------------------------- |
| `profiles`              | 1:1 with `auth.users`; timezone, units, animation, onboarding flags |
| `module_definitions`    | System catalog (seeded); users read active rows only                |
| `user_modules`          | Per-user enable/label/targets                                       |
| `dashboard_layouts`     | Named layouts; one active per user (app-enforced + version)         |
| `dashboard_cards`       | Card positions + visual variant on a layout                         |
| `daily_records`         | One row per `(user_id, local_date)`                                 |
| `daily_module_statuses` | Summary status only (`not_started`…`skipped`); **not** domain logs  |

No smoking-free default module. Optional trackers use `custom_tracker` / later custom rows.

## RLS

Enable RLS on every exposed table. Authenticated clients receive table-level
`GRANT`s appropriate to ownership policies; `module_definitions` is **select-only**
(no insert/update/delete grant for authenticated). Owner policies use `auth.uid()`.

## Onboarding bootstrap

`handle_new_user` trigger on `auth.users` calls `ensure_user_board_defaults(user_id)`:

1. Insert profile (idempotent)
2. Insert user_modules for active definitions (idempotent unique)
3. Ensure one active layout
4. Insert missing dashboard cards for enabled modules

Safe to retry. Sign-up also calls the RPC after profile upsert.

## RPCs

- `ensure_user_board_defaults(uuid)` — security definer, authenticated execute
- `bump_dashboard_layout_version(layout_id, expected_version)` — rejects stale layout writes
- `apply_daily_module_status(...)` — revision check; blocks completed → not_started wipe

## Conflict rules

**Layout:** client sends `expectedVersion`; mismatch → `layout_version_conflict`; UI refreshes and shows message (no silent overwrite).

**Daily status:** client sends `expectedRevision`; mismatch → `status_revision_conflict`. Completed cannot be reverted to `not_started` by a stale offline write (`status_completed_protected`). Revision always increments on success.

## Local dates

`local_date` is YYYY-MM-DD in the profile timezone (`src/shared/utils/local-date.ts`). Never use UTC `toISOString().slice(0,10)` alone. Logging limited to today and past.

## Types

Hand-maintained `src/shared/database/types.ts` mirrors the migration. Prefer regenerating with `npx supabase gen types typescript --local` after `db reset` when Docker is available. Zod validates app boundaries in `src/shared/validation/increment3.ts`.

## Demo vs real

| Persisted (real)                                      | Preview only (not persisted as domain data)     |
| ----------------------------------------------------- | ----------------------------------------------- |
| Module enable/disable, card order, visual variant     | Breakfast item lines / fake calories            |
| Profile prefs used by board (timezone, units, motion) | Workout exercise rows / fake sets               |
| `daily_records` + `daily_module_statuses` (summary)   | Water ml stepper values as hydration logs       |
| Status enum + optional `summary_text` on Save         | Meditation timer internals, measurement numbers |

Focus-panel **inner** domain values remain development preview until later increments. Saving may update only generic module status (e.g. `completed` + summary like “Demo session completed”). Fake exercise sets, fake calories, fake measurements, and other domain payloads must **not** be written to production tables.
