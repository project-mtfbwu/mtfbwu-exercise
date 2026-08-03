# Staging environment-variable checklist

Fill values in the **hosting provider secret store** and local operator vault only. Do not commit real values. Do not paste secrets into chat logs, CI output, or these docs.

Target app env: `NEXT_PUBLIC_APP_ENV=preview`  
Release: `NEXT_PUBLIC_RELEASE_VERSION=0.1.0-beta.1`  
Commit for this prep: `d1c9104226a8316b6fa7168d6f87d1bfef75a626`

## Public (safe for browser bundle)

| Variable                        | Required | Staging value / notes                                  | Set? |
| ------------------------------- | -------- | ------------------------------------------------------ | ---- |
| `NEXT_PUBLIC_APP_URL`           | yes      | `https://staging.<final-domain>` (HTTPS, no localhost) | [ ]  |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes      | `https://oliwxuhmlqefarazilss.supabase.co`             | [ ]  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | Staging anon/publishable from dashboard                | [ ]  |
| `NEXT_PUBLIC_APP_ENV`           | yes      | `preview`                                              | [ ]  |
| `NEXT_PUBLIC_BUILD_SHA`         | yes      | Exact deployed git SHA                                 | [ ]  |
| `NEXT_PUBLIC_RELEASE_VERSION`   | yes      | `0.1.0-beta.1`                                         | [ ]  |

## Server-only (never `NEXT_PUBLIC_`)

| Variable                                | Required | Staging value / notes                                   | Set? |
| --------------------------------------- | -------- | ------------------------------------------------------- | ---- |
| `SUPABASE_SERVICE_ROLE_KEY`             | yes      | Staging service-role only; never in client              | [ ]  |
| `USDA_FDC_API_KEY`                      | yes      | Non-prod / dedicated key                                | [ ]  |
| `OPEN_FOOD_FACTS_USER_AGENT`            | yes      | e.g. `MTFBWU/0.1.0-beta.1 (staging-support@…)`          | [ ]  |
| `RATE_LIMIT_BACKEND`                    | yes      | `upstash`                                               | [ ]  |
| `UPSTASH_REDIS_REST_URL`                | yes      | Staging Upstash REST URL                                | [ ]  |
| `UPSTASH_REDIS_REST_TOKEN`              | yes      | Staging Upstash REST token                              | [ ]  |
| `PRIVATE_BETA_MODE`                     | yes      | `true`                                                  | [ ]  |
| `PRIVATE_BETA_ALLOWLIST`                | yes      | Comma-separated lowercased emails of controlled testers | [ ]  |
| `SUPPORT_EMAIL`                         | yes      | Approved staging support inbox                          | [ ]  |
| `ERROR_MONITORING_DSN`                  | no       | Leave unset until provider approved                     | [ ]  |
| `RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION` | no       | Must stay unset/false on staging when using Upstash     | [ ]  |

## Feature flags (optional overrides)

Defaults are on for barcode/OCR/camera/export/deletion. Override only intentionally:

- `FEATURE_BARCODE`
- `FEATURE_OCR`
- `FEATURE_PROGRESS_CAMERA`
- `FEATURE_ACCOUNT_EXPORT`
- `FEATURE_ACCOUNT_DELETION`

## Requirements gate

| Check                                              | Pass? |
| -------------------------------------------------- | ----- |
| No secrets in git                                  | [ ]   |
| No secrets in app logs / readiness JSON            | [ ]   |
| No production credentials in staging               | [ ]   |
| Service-role absent from client bundles            | [ ]   |
| No localhost fallbacks for APP_URL on hosted env   | [ ]   |
| Fail-fast env validation on boot                   | [ ]   |
| `/api/readiness` reports rate-limit without tokens | [ ]   |

## Still required from operator (secrets)

1. Staging service-role key (dashboard)
2. Staging Upstash URL + token
3. Staging `SUPPORT_EMAIL` (and privacy/data-request routing if distinct)
4. USDA key for staging
5. Final staging hostname + TLS cert on host
6. Optional monitoring DSN after approval
