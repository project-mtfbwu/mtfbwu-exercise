# Environments

| Env        | Supabase          | App URL           | Seed          | Secrets            |
| ---------- | ----------------- | ----------------- | ------------- | ------------------ |
| local      | local CLI         | localhost:3000    | yes (dev)     | `.env.local`       |
| preview    | separate project  | preview URL       | staging-only  | preview env        |
| production | dedicated project | production domain | no test users | production secrets |

Rules: no shared DB between staging and production; service-role never in client bundles; fail closed if production APP_URL is localhost.
