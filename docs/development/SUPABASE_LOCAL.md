# Supabase local

See also `supabase/README.md` and `docs/development/AUTHENTICATION.md`.

```bash
# Docker Desktop must be running
npx supabase start
npx supabase status
npx supabase db reset   # applies Increment 3 and Increment 4 migrations
```

Map keys into `.env.local` from `supabase status` (`API URL`, `anon key`, `service_role` for server-only tools only).

```bash
# Optional: regenerate TS types after reset
npx supabase gen types typescript --local > src/shared/database/types.gen.ts
# Merge carefully into hand-maintained `types.ts` or replace once CI supports it
```

Stop with `npx supabase stop`.

## Migrations

| File                                               | Contents                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `20260726120000_increment3_auth_board_daily.sql`   | profiles, modules, layouts, daily status, RLS, onboarding trigger          |
| `20260727120000_increment4_nutrition.sql`          | nutrition catalog, custom foods, recipes, templates, meal logs/goals, RLS  |
| `20260727120100_increment4_curated_foods_seed.sql` | provisional curated starter foods, portions, aliases, and core nutrients   |
| `20260727130000_increment4_barcode_provenance.sql` | barcode → branded_product ownership, multi-brand foods, curated provenance |

Without Docker, the migration remains in-repo; unit-test CI (`pnpm test`) uses
placeholder env and does not require a live stack. The GitHub Actions `CI`
workflow (`.github/workflows/ci.yml`) does run a live local Supabase stack —
see below.

After a reset, run the Increment 3 and Increment 4 SQL test files against the
local database container (`mtfbwu-local` is the `project_id` in
`supabase/config.toml`, so the container is `supabase_db_mtfbwu-local`):

```bash
# PowerShell
Get-Content supabase/tests/increment3_auth_board_rls.sql -Raw |
  docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres

Get-Content supabase/tests/increment4_nutrition_rls.sql -Raw |
  docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
```

```bash
# bash / CI (container name discovered, not hardcoded)
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -n1)
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < supabase/tests/increment3_auth_board_rls.sql
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < supabase/tests/increment4_nutrition_rls.sql
```

Both files `begin;` a transaction, insert fixed-UUID fixtures, assert RLS
behavior under `set local role authenticated` with a spoofed
`request.jwt.claim.sub`, and `rollback;` — nothing they insert persists.
`increment3_auth_board_rls.sql` covers `profiles`, `module_definitions`,
`user_modules`, `dashboard_layouts`, `dashboard_cards`, `daily_records`, and
`daily_module_statuses`. `increment4_nutrition_rls.sql` covers the nutrition
catalog/meal tables plus the barcode → branded_product model (multiple brands
per food, unique barcodes, cache write denial, and meal-log nutrient snapshot
stability).

CI (`.github/workflows/ci.yml`) runs both files automatically on every push
and PR: it installs a pinned Supabase CLI (`supabase/setup-cli@v3`), runs
`supabase start` + `supabase db reset`, executes both SQL test files inside
the `supabase_db_*` container, and generates + sanity-checks TypeScript types
before the usual typecheck/lint/test/build/audit steps. It always stops the
local stack in a final `if: always()` step, even on failure.

Regenerate `src/shared/database/types.gen.ts` before replacing the
hand-maintained client types; Increment 4 offline sync intentionally uses a
narrow adapter until those generated types are checked in.
