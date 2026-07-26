# SYSTEM_ARCHITECTURE.md

## Shape

**Modular monolith** on **Next.js App Router**, with **Supabase** (Auth, PostgreSQL, Storage, RLS) as the cloud system of record and **Dexie (IndexedDB)** as the offline-first client store.

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App (App Router + PWA shell)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Flat-lay UI │  │ Domain mods  │  │ Sync / queue   │ │
│  │ + focus     │──│ nutrition,   │──│ Dexie + outbox │ │
│  │             │  │ workouts…    │  │                │ │
│  └─────────────┘  └──────────────┘  └────────┬───────┘ │
└──────────────────────────────────────────────┼─────────┘
                                               │ HTTPS
                    ┌──────────────────────────▼──────────┐
                    │ Supabase                            │
                    │ Auth │ Postgres+RLS │ Storage       │
                    │ Edge/server routes for USDA keys    │
                    └─────────────────────────────────────┘
                               │
               ┌───────────────┼────────────────┐
               ▼               ▼                ▼
        Open Food Facts   USDA FDC API    External libs
        (cached reads)    (server-only)   (zxing, etc.)
```

## Layers

| Layer | Responsibility |
| --- | --- |
| UI | Flat-lay board, focus windows, animation modes |
| Application | Use-cases per domain (log meal, start session, sync) |
| Domain | Entities, invariants (template ≠ session) |
| Infrastructure | Supabase clients, Dexie schema, barcode, food APIs |

## Module boundaries

Each domain module owns:

- Types / entities
- Local Dexie tables (where offline matters)
- Server mutations / queries (RLS-scoped)
- UI card + focus panel for the flat-lay

Shared kernel owns: auth session, sync outbox, design tokens, calendar aggregation, profile/settings.

## Why not microservices

Single product, single team, shared user and calendar. Modules stay separable in code without network splits. See `ADR/0001-modular-monolith.md`.

## Runtime modes

| Mode | Behavior |
| --- | --- |
| Online | Reads prefer local cache; writes go local + outbox → Supabase |
| Offline | Writes stay in Dexie; UI shows sync pending |
| Focus | One module elevated; board remains visible behind |
| Animation | `full` / `reduced` / `off` |

## PWA

Next.js App Router supports web app manifests (`app/manifest`). Offline app shell and caching should follow official PWA guidance; Next docs recommend Serwist (or equivalent) for service workers. Dexie holds structured user data; the SW caches static assets and optionally read-only catalogs.

Official refs:

- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://nextjs.org/docs/app/getting-started/installation

## Server-only secrets

- USDA `api_key` never ships to the browser (see USDA API Guide key responsibility).
- Supabase service role never ships to the browser.
- Client uses publishable/anon key + user JWT; RLS enforces row access.

## Related ADRs

- `ADR/0001-modular-monolith.md`
- `ADR/0002-supabase-dexie.md`
- `ADR/0003-flat-lay-focus-ui.md`
- `ADR/0004-nutrition-source-priority.md`
