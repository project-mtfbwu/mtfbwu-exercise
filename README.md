# MTFBWU

Personal **body-and-training tracker** — nutrition, workouts, rehab, hydration, meditation, measurements, private progress photos, calendar, profile, and custom trackers.

Not a journal. Not a social app. **Odiina is a separate product.**  
This software does **not** provide medical diagnosis or treatment advice.

## Current increment

**Increment 1 — Application foundation**

- Next.js App Router + TypeScript + Tailwind
- Design tokens from approved GeoCities flat-lay references
- Env validation, Supabase client shells, Dexie outbox shell
- Route placeholders, CI, tests
- **No** domain CRUD, FlatLayBoard UI, or auth screens yet

Planning checkpoint: see `docs/architecture/BUILD_INCREMENTS.md`.

## Stack

- Node **24.18.0** (Active LTS; see `docs/development/NODE_VERSION.md`)
- pnpm **11.17.0** (see `docs/development/PACKAGE_MANAGER.md`)
- Next.js App Router
- Supabase (Auth/Postgres/Storage/RLS) — wired, not fully featured
- Dexie offline outbox shell

## Quick start

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm install
cp .env.example .env.local
# fill placeholder values for local boot
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/today`.

## Scripts

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `pnpm dev`          | Dev server                                    |
| `pnpm build`        | Production build                              |
| `pnpm typecheck`    | `tsc --noEmit`                                |
| `pnpm lint`         | ESLint                                        |
| `pnpm format:check` | Prettier                                      |
| `pnpm test`         | Vitest                                        |
| `pnpm run audit`    | Production dependency audit (bulk advisories) |

## Architecture & design

- `AGENTS.md` — agent rules
- `docs/architecture/` — product & system docs / ADRs
- `docs/design-system/` — extracted visual system
- `docs/design-references/` — **approved images** (DNA only; never use as live clickable UI)
- `docs/development/` — local setup details

## Visual warning

Do not replace the GeoCities flat-lay / focus UI with a generic SaaS dashboard. Inspect references before UI work (Increment 2+).

## License

**Proprietary** — all rights reserved unless a later LICENSE file states otherwise.
