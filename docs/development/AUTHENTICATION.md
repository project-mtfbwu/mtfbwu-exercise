# Authentication (Increment 3)

Email/password Auth via Supabase SSR (`@supabase/ssr`) with cookie sessions.

## Routes

| Route              | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| `/login`           | Sign in; `?next=` redirect after success              |
| `/signup`          | Create account → onboarding when session present      |
| `/forgot-password` | Request reset email                                   |
| `/reset-password`  | Complete password update (session from recovery link) |

## Protection

`src/proxy.ts` → `updateSession`:

- Unauthenticated users hitting protected routes → `/login?next=…`
- Authenticated users on login/signup/forgot → `/today`
- `/reset-password` stays reachable while signed in (recovery flow)
- If `NEXT_PUBLIC_SUPABASE_*` env is missing (CI shell), protection is skipped so static checks still run

Protected: `/today`, `/calendar`, `/plans`, `/progress`, `/profile`, `/import`, `/settings`, `/onboarding`, `/customize`.

## Rules

- No social providers yet
- No service-role in the browser
- Auth actions are **not** offline-capable
- Passwords/secrets never stored in Dexie
- Logout clears IndexedDB outbox via `clearLocalOfflineData`

## UX

Forms use GeoCities `RetroWindow` + paper surfaces, labeled fields, `aria-live` errors, disabled/loading submit.

See also: `docs/development/INCREMENT_3_DATA_MODEL.md`, `SECURITY_AND_PRIVACY.md`.
