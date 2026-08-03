# Increment 10 recovery drill

## What this proves

A **local** backup → mutate → restore-into-isolated-DB → verify loop using:

- `scripts/seed-recovery-drill.mjs`
- `scripts/backup-local.mjs`
- `scripts/restore-local.mjs`
- `scripts/verify-restore.mjs`
- optional `scripts/explain-critical-queries.mjs`

## What it does **not** prove

- Hosted Supabase PITR / project restore
- Production Storage object restore across regions
- Multi-region failover

## Safe defaults

All scripts require `--target=local` and an explicit `--confirm=...`.
They refuse production URLs and refuse overwriting the primary `postgres` database on restore.

## Procedure (local)

```bash
# 1. Start Supabase + reset
npx supabase start
npx supabase db reset

# 2. Seed synthetic owner data
pnpm seed:recovery-drill -- --target=local --confirm=local-seed
# note userId from output

# 3. Backup
pnpm backup:local -- --target=local --confirm=local-backup

# 4. Mutate / delete a representative row in primary DB (manual or SQL)

# 5. Restore into isolated DB
pnpm restore:local -- --target=local --confirm=local-restore --dump=tmp/backups/<file>.sql --db=mtfbwu_restore_drill

# 6. Verify
pnpm verify:restore -- --target=local --confirm=local-verify --db=mtfbwu_restore_drill --user=<userId>
```

Backup artifacts land under `tmp/backups/` (gitignored).

## Results (local drill executed 2026-08-02)

| Step    | Result                                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| Seed    | PASS — synthetic user + meal/workout/weight/hydration rows                                                      |
| Backup  | PASS — `pg_dump --schema=public` under `tmp/backups/` (gitignored)                                              |
| Mutate  | PASS — deleted seed meal_logs in primary DB                                                                     |
| Restore | PASS — isolated DB `mtfbwu_restore_drill`; public schema restored (auth FK noise expected for public-only dump) |
| Verify  | PASS — row counts + RLS-enabled table count                                                                     |

Hosted Supabase PITR / project restore remains operator-owned and is **not** claimed here.

## Hosted follow-up (operator)

Configure Supabase project backups / PITR for staging and production before private beta.
