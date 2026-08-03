# Apply hosted migrations (operator)

Pushes repo migrations to a linked Supabase project. Requires interactive `supabase login` (or `SUPABASE_ACCESS_TOKEN`).

## Safety

1. Confirm project ref is **staging** (`oliwxuhmlqefarazilss` / name `mtfbwu-staging`).
2. Confirm you are **not** linked to production.
3. Prefer dashboard backup / PITR awareness before push.
4. Do not edit already-applied migration files.

## Commands

```bash
# Node 24.18.x, pnpm 11, repo root
npx supabase@2.111.0 login
npx supabase@2.111.0 link --project-ref oliwxuhmlqefarazilss
npx supabase@2.111.0 migration list
npx supabase@2.111.0 db push
npx supabase@2.111.0 migration list
npx supabase@2.111.0 gen types typescript --linked > tmp/staging-database.types.ts
```

Note: an early MCP apply may have recorded `increment3_auth_board_daily` under a MCP-generated version. If `db push` reports conflicts, resolve with Supabase migration history repair **only** after reading CLI guidance — do not rewrite historical SQL files.

## After push

1. Update `docs/development/STAGING_DEPLOYMENT_LOG.md`
2. Run hosted smoke queries + two-user RLS spot checks
3. Compare generated types to `src/shared/database/database.types.ts`
