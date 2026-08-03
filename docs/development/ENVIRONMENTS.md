# Environments

| Env        | Supabase                                                     | App URL           | Seed          | Secrets            |
| ---------- | ------------------------------------------------------------ | ----------------- | ------------- | ------------------ |
| local      | local CLI                                                    | localhost:3000    | yes (dev)     | `.env.local`       |
| preview    | separate project (`mtfbwu-staging` / `oliwxuhmlqefarazilss`) | staging hostname  | staging-only  | preview env        |
| production | dedicated project (not staging)                              | production domain | no test users | production secrets |

Rules: no shared DB between staging and production; service-role never in client bundles; fail closed if production APP_URL is localhost.

Staging operator docs: `STAGING_SETUP.md`, `STAGING_ENV_CHECKLIST.md`.
