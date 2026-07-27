# Supabase local

See also `supabase/README.md` and `docs/development/AUTHENTICATION.md`.

```bash
# Docker Desktop must be running
npx supabase start
npx supabase status
npx supabase db reset   # applies migrations including Increment 3
```

Map keys into `.env.local` from `supabase status` (`API URL`, `anon key`, `service_role` for server-only tools only).

```bash
# Optional: regenerate TS types after reset
npx supabase gen types typescript --local > src/shared/database/types.gen.ts
# Merge carefully into hand-maintained `types.ts` or replace once CI supports it
```

Stop with `npx supabase stop`.

## Migrations

| File                                             | Contents                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `20260726120000_increment3_auth_board_daily.sql` | profiles, modules, layouts, daily status, RLS, onboarding trigger |

Without Docker, the migration remains in-repo; app CI uses placeholder env and does not require a live stack for unit tests.
