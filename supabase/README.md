# Supabase local setup (MTFBWU)

## Prerequisites

- Docker Desktop (or compatible engine)
- Supabase CLI (`npx supabase` or global install)
- Node 24 + pnpm (see `docs/development/NODE_VERSION.md`; pin **24.18.0**)

## Start local stack

```bash
npx supabase start
```

Copy API URL and anon/service keys into `.env.local` (from `.env.example`).

## Migrations

- SQL migrations live in `supabase/migrations/`
- Increment 1: **no domain tables**
- From Increment 2: create tables with **RLS enabled** on every exposed table
- Apply: `npx supabase db reset` (local) or `npx supabase db push` (linked)

## Type generation

```bash
npx supabase gen types typescript --local > src/shared/database/types.ts
```

Replace the placeholder `Database` type when real tables exist.

## RLS-first policy

- Default deny
- `auth.uid()` scoped policies for user rows
- Private progress photos: Storage policies on `{user_id}/...` paths
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser

## Hosted staging

1. Create a Supabase project
2. Set GitHub Actions / Vercel env vars from `.env.example` names
3. Link CLI: `npx supabase link --project-ref <ref>`
4. Push migrations after review

## Secrets handling

| Variable                        | Client?         |
| ------------------------------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes             |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Server only** |
| `USDA_FDC_API_KEY`              | **Server only** |

See `docs/development/ENVIRONMENT.md`.
