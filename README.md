# MTFBWU

Personal **body-and-training tracker** — nutrition, workouts, rehab, hydration, meditation, measurements, private progress photos, calendar, profile, and custom trackers.

Not a journal. Not a social app. **Odiina is a separate product.**  
This software does **not** provide medical diagnosis or treatment advice.

## Current increment

**Increment 4 — Nutrition engine**

- Nutrition schema, RLS, curated starter foods, recipes, meal templates, meal logs, and goals
- Server-only USDA/Open Food Facts clients with normalized source priority
- Nutrition calculations and snapshot-based performed meal records
- Dexie meal-log drafts plus retry-safe nutrition outbox payloads
- Camera barcode scanning, OCR, AI meal parsing, and workout logging remain deferred

Planning sequence: `docs/architecture/BUILD_INCREMENTS.md`.
Nutrition notes: `docs/development/INCREMENT_4_NUTRITION.md`.
Data model: `docs/architecture/DATA_MODEL.md`.

## Stack

- Node **24.18.0** (Active LTS; see `docs/development/NODE_VERSION.md`)
- pnpm **11.17.0** (see `docs/development/PACKAGE_MANAGER.md`)
- Next.js App Router
- Supabase (Auth/Postgres/Storage/RLS)
- Dexie offline outbox

## Quick start

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm install
cp .env.example .env.local
# Map keys from `npx supabase start` (Docker required for local Auth/DB)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → `/today` (login if unauthenticated).

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

Do not replace the GeoCities flat-lay / focus UI with a generic SaaS dashboard. Inspect references before UI work.

## License

**Proprietary** — all rights reserved unless a later LICENSE file states otherwise.
