# Production deployment

Intended: Next.js-compatible host (e.g. Vercel) + hosted Supabase.

**Do not deploy production until private beta on staging is healthy and explicitly approved.**

## Staging first

Follow `STAGING_SETUP.md` and `STAGING_ENV_CHECKLIST.md`. Staging project ref for this org: `oliwxuhmlqefarazilss` (`mtfbwu-staging`). Production must use a **different** Supabase project and secrets.

## Production sequence (later)

1. Create dedicated **production** Supabase project (never reuse staging)
2. Set env from `.env.example` with `NEXT_PUBLIC_APP_ENV=production` (no localhost `APP_URL`)
3. Set `RATE_LIMIT_BACKEND=upstash` + production Upstash REST credentials
4. Configure Auth redirect allowlists for the production domain only
5. Run migrations via CI/CLI against production after backup
6. Smoke `/api/health` and `/api/readiness` (rate-limit `configured: true`)
7. Verify camera Permissions-Policy and signed storage
8. Confirm hosted backup/PITR policy
9. Keep `PRIVATE_BETA_MODE` policy explicit (usually off only when public launch approved)

## Host settings (both staging and production)

| Setting   | Value                |
| --------- | -------------------- |
| Node      | 24.18.x              |
| pnpm      | 11 (frozen lockfile) |
| Build     | `pnpm build`         |
| Health    | `/api/health`        |
| Readiness | `/api/readiness`     |

## Non-negotiables

- Do not deploy production without explicit approval and green CI
- Local automated gates alone do **not** make the app publicly launch-ready
- Do not tag a release or open public signup from staging prep
- Do not start Increment 11 as part of deployment work

## Related

`ENVIRONMENTS.md`, `ROLLBACK.md`, `BACKUP_AND_RECOVERY.md`, `LAUNCH_CHECKLIST.md`, `STAGING_DEPLOYMENT_LOG.md`
