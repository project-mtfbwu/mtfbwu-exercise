# Staging setup

Dedicated staging environment for private-beta operator QA. Not production.

Checkpoint this run targets: `d1c9104226a8316b6fa7168d6f87d1bfef75a626` (Increment 0–10 closed).

## Architecture (required separation)

| Resource         | Staging rule                                     |
| ---------------- | ------------------------------------------------ |
| Supabase project | Dedicated hosted project (not local, not prod)   |
| Database         | Separate Postgres                                |
| Auth users       | Staging-only synthetic / controlled testers      |
| Storage          | Private buckets only; no shared prod objects     |
| API keys         | Staging anon + staging service-role only         |
| Auth redirects   | Staging Site URL + redirect allowlist only       |
| App deployment   | Non-production hostname                          |
| Upstash          | Staging Redis DB or staging key namespace        |
| Monitoring       | Staging DSN only after provider approved         |
| Secrets          | Never reuse production credentials               |
| Health data      | No real user health data; no automatic prod seed |

## Locked env shape

```text
NEXT_PUBLIC_APP_ENV=preview
NEXT_PUBLIC_APP_URL=https://staging.<final-domain>
NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon>
NEXT_PUBLIC_RELEASE_VERSION=0.1.0-beta.1
NEXT_PUBLIC_BUILD_SHA=<deployed-commit-sha>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role>
USDA_FDC_API_KEY=<non-prod key or dedicated staging key>
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=<staging>
UPSTASH_REDIS_REST_TOKEN=<staging>
PRIVATE_BETA_MODE=true
PRIVATE_BETA_ALLOWLIST=<comma-separated tester emails>
SUPPORT_EMAIL=<approved staging inbox>
```

Fail-fast validation lives in `src/shared/config/env.ts` + `assertProductionEnv` (`env.server.ts`). Readiness must not echo secrets.

## Hosted Supabase project (this workspace)

| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| Name        | `mtfbwu-staging`                           |
| Project ref | `oliwxuhmlqefarazilss`                     |
| Region      | `us-east-1`                                |
| Org         | `project-mtfbwu` (`sxnjsfjqwcqnxralfauw`)  |
| API URL     | `https://oliwxuhmlqefarazilss.supabase.co` |
| Status      | `ACTIVE_HEALTHY` (created 2026-08-03)      |

Do **not** point this project at production app env vars. Do **not** use local Supabase (`127.0.0.1:54321`) for staging deploys.

### Migration apply (operator)

MCP applied **only** `increment3_auth_board_daily` during prep. Remaining Inc 4–10 migrations must be pushed with CLI auth:

```bash
# From repo root, Node 24.18.x + pnpm 11
supabase login
supabase link --project-ref oliwxuhmlqefarazilss
# Confirm target name is mtfbwu-staging before push
supabase db push
supabase migration list
```

Then generate types against staging and diff against `src/shared/database/database.types.ts`:

```bash
supabase gen types typescript --linked > tmp/staging-database.types.ts
# Compare required symbols (account_deletion_requests, cleanup_stage, file_count, …)
```

Optional: run SQL RLS suites against a temporary linked session only when a safe remote test harness exists. Prefer local Inc 3–10 RLS for regression; use hosted smoke queries + two-user isolation checks after push (see `STAGING_SMOKE_TEST.md`).

### Auth dashboard (manual)

In Supabase → Authentication → URL configuration for **mtfbwu-staging**:

| Setting                        | Staging value                                    |
| ------------------------------ | ------------------------------------------------ |
| Site URL                       | `https://staging.<final-domain>`                 |
| Redirect URLs                  | Same origin + `/auth/callback` (and reset paths) |
| External next / open redirects | Rejected by app (`safe next` checks)             |

Also verify:

- Email confirmation behavior matches beta expectation
- Password-reset redirect stays on staging host
- Public signup left enabled at Auth layer; **app** enforces `PRIVATE_BETA_MODE` allowlist (server-side in signup action)
- Create only intentional staging tester accounts
- Confirm no production users exist in this project

### Storage dashboard (verify after migrations)

Migrations create private buckets (no public read):

| Bucket             | Purpose              |
| ------------------ | -------------------- |
| `progress-photos`  | Progress photo sets  |
| `nutrition-labels` | Label capture images |

Confirm in dashboard / SQL:

- Buckets are **not** public
- Policies are owner-path based (`{user_id}/…`)
- Cross-user object access denied
- MIME / size limits present
- Signed URL access works from app; anonymous public URLs fail

Avatars / rehab media: follow schema if/when buckets exist in later migrations; do not invent public buckets.

### Keys

Retrieve from Project Settings → API:

- anon / publishable → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never `NEXT_PUBLIC_`)

Never commit real values. Never log them.

## App host (Next.js-compatible)

Documented target: **Vercel** (or equivalent) Preview/Staging environment.

| Setting      | Value                                        |
| ------------ | -------------------------------------------- |
| Repo         | `project-mtfbwu/mtfbwu-exercise`             |
| Branch / env | Staging env tied to `main` or staging branch |
| Node         | `24.18.x`                                    |
| Install      | `pnpm install --frozen-lockfile`             |
| Build        | `pnpm build` (production Next build)         |
| Hostname     | `staging.<final-domain>` or `beta.<…>`       |
| HTTPS        | Required                                     |
| Health       | `GET /api/health`                            |
| Readiness    | `GET /api/readiness`                         |
| Build SHA    | `NEXT_PUBLIC_BUILD_SHA` = deploy commit      |
| Release      | `NEXT_PUBLIC_RELEASE_VERSION=0.1.0-beta.1`   |

Do not attach the final production hostname yet.

## Upstash

Create a **staging** Redis REST database (or dedicated staging credentials). Set:

- `RATE_LIMIT_BACKEND=upstash`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Staging must not silently fall back to memory when Upstash is selected. Auth / account deletion fail closed on provider failure; see `RATE_LIMITING.md`.

## Private beta

`PRIVATE_BETA_MODE=true` + allowlist emails. Enforcement: `isPrivateBetaSignupAllowed` in signup server action (`src/shared/auth/actions.ts`). No admin dashboard in this phase.

## Monitoring

Keep no-op adapter until a provider is explicitly approved. Staging DSN + PII scrubbing checklist: `STAGING_SECURITY_REVIEW.md` / operator checklist. **Unset DSN = operator blocker for private beta**, not a code defect.

## Related docs

- `STAGING_ENV_CHECKLIST.md`
- `STAGING_DEPLOYMENT_LOG.md`
- `STAGING_SMOKE_TEST.md`
- `STAGING_MANUAL_QA.md`
- `STAGING_SECURITY_REVIEW.md`
- `STAGING_PERFORMANCE_REVIEW.md`
- `STAGING_RECOVERY_DRILL.md`
- `PRIVATE_BETA_OPERATOR_CHECKLIST.md`
- `LAUNCH_CHECKLIST.md`
- `PRODUCTION_DEPLOYMENT.md`
- `BACKUP_AND_RECOVERY.md`
