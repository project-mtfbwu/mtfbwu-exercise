# Environment variables

Public validation: `src/shared/config/env.ts`  
Server-only validation: `src/shared/config/env.server.ts` (imports `server-only`)

## Public (browser-safe)

| Name                            | Purpose              |
| ------------------------------- | -------------------- |
| `NEXT_PUBLIC_APP_URL`           | Canonical app URL    |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key |

## Server-only (never `NEXT_PUBLIC_`)

| Name                         | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY`  | Admin/server tasks — bypasses RLS    |
| `USDA_FDC_API_KEY`           | FoodData Central — server proxy only |
| `OPEN_FOOD_FACTS_USER_AGENT` | OFF API identification string        |

## Rules

- Import `getServerEnv` / `assertProductionEnv` only from `env.server.ts`.
- Bundling `env.server.ts` into a client module fails the build (`server-only`).
- Production should fail closed when required vars are missing (`assertProductionEnv`).
- Vitest injects safe mocked values via `vitest.config.ts`.
- Copy `.env.example` → `.env.local`. **Never commit secrets.**

## Security headers

Configured in `next.config.ts`. Camera permission is denied until barcode scanning ships. CSP allows `'unsafe-eval'` only in development for Next HMR.
