# Backup and recovery

## Local drill (Increment 10)

Scripts (explicit `--target=local` required):

- `scripts/seed-recovery-drill.mjs`
- `scripts/backup-local.mjs` (`pg_dump` from `supabase_db_*`)
- `scripts/restore-local.mjs` (isolated DB only; refuses `postgres`)
- `scripts/verify-restore.mjs`

See `INCREMENT_10_RECOVERY_DRILL.md` for the full procedure and result template.

Artifacts under `tmp/backups/` are gitignored. Never commit dumps.

## Hosted Supabase (operator)

Local drill does **not** replace hosted PITR / project restore. Configure backups on staging and production before private beta.

### Staging

- Project: `mtfbwu-staging` (`oliwxuhmlqefarazilss`)
- Record plan backup frequency, retention, and PITR availability in `STAGING_RECOVERY_DRILL.md`
- Prefer restore into an **isolated** target; do not overwrite active staging unless explicitly safe
- Hosted recovery success must not be claimed until the drill is actually executed

### Production (later)

- Separate project and backup policy
- Same isolation rules; never restore production into staging or vice versa without a written procedure
