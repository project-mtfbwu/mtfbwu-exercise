# AGENTS.md — MTFBWU

Guidance for coding agents working in this repository.

## What this product is

**MTFBWU** is a personal body-and-training tracker. It is **not** a journal, feed, or social app.

**Odiina is a separate application.** Do not import Odiina concepts (feeds, general journaling, social) into this codebase.

### In scope (core domains)

- Nutrition
- Workouts
- Rehab
- Hydration
- Meditation
- Measurements
- Progress photos
- Calendar
- Profile
- Configurable custom trackers

### Out of scope

- Feeds, timelines, or social graphs
- General journaling / freeform diary as a primary feature
- Copying AGPL or GPL application source into this repo
- Treating GitHub stars as proof of quality

## Current phase

**Increment 8 — Progress tracking** is implemented locally (uncommitted until you ask).

Follow `docs/architecture/BUILD_INCREMENTS.md`. Do **not** start Increment 9
(hydration/meditation/calendar) without authorization.

### Still deferred (Increment 9+)

- Hydration/meditation/calendar engines
- AI meal-photo estimation / natural-language food logging / AI workout or rehab generation
- Wearables, pose detection, social/trainer features, clinician portal

## Source of truth (read these first)

| Document                                           | Purpose                                     |
| -------------------------------------------------- | ------------------------------------------- |
| `docs/architecture/PRODUCT.md`                     | Product boundaries and principles           |
| `docs/architecture/SYSTEM_ARCHITECTURE.md`         | System shape                                |
| `docs/architecture/DOMAIN_MODEL.md`                | Domain language                             |
| `docs/architecture/DATA_MODEL.md`                  | Persistence sketch                          |
| `docs/architecture/UI_ARCHITECTURE.md`             | Flat-lay + focus UI                         |
| `docs/architecture/OFFLINE_SYNC.md`                | Dexie / sync                                |
| `docs/architecture/AI_IMPORT_PIPELINE.md`          | AI import + provenance                      |
| `docs/architecture/SECURITY_AND_PRIVACY.md`        | Auth, RLS, private media                    |
| `docs/architecture/REFERENCE_PROJECTS_RESEARCH.md` | External research                           |
| `docs/architecture/BUILD_INCREMENTS.md`            | Delivery sequence                           |
| `docs/architecture/ADR/`                           | Architecture decisions                      |
| `docs/design-references/README.md`                 | Approved visual references                  |
| `docs/design-system/`                              | Extracted design system + compliance        |
| `docs/development/`                                | Local setup, env, testing, increment guides |
| `.cursor/rules/`                                   | Always-on agent constraints                 |

## Stack decisions (locked by ADR)

1. **Modular monolith** — one Next.js app, domain modules, shared kernel (`ADR/0001`).
2. **Supabase + Dexie** — Postgres/Auth/Storage/RLS server-side; IndexedDB offline (`ADR/0002`).
3. **Flat-lay focus UI** — all enabled modules visible; selected module lifts into focus (`ADR/0003`).
4. **Nutrition source priority** — normalize sources; prefer authoritative nutrients; cache OFF; USDA server-side only (`ADR/0004`).

## Visual direction (non-negotiable)

GeoCities-inspired: dark grid background, glitter typography, torn-paper cards, pixel stickers, retro desktop-window chrome, flat-lay board. Animation modes: **full**, **reduced**, **off** (docs historically said `disabled` — production code uses `off`).

See `docs/design-references/README.md`, `docs/design-system/`, and `.cursor/rules/visual-direction.mdc`.

## Open-source reuse policy

- **Study** AGPL/GPL apps (e.g. wger, openfoodfacts-server). Do **not** copy their application code.
- Prefer **MIT / Apache-2.0 / Unlicense / CC0** libraries and datasets with clear attribution.
- Record license, commit hash, and reuse boundary in research notes before adopting anything new.
- See `.cursor/rules/open-source-research.mdc`.

## Quality bar

- Prefer clear domain language over clever abstractions.
- Separate **templates/plans** from **performed sessions/logs**.
- Offline logging for workouts and meals is a first-class requirement.
- Private progress photos require strict RLS and path conventions.
- AI imports need human review and provenance fields before they become trusted data.

## When stuck

1. Re-read the relevant ADR and domain doc.
2. Check `REFERENCE_PROJECTS_RESEARCH.md` for study-only vs safe-reuse guidance.
3. Ask the user before expanding scope (especially social/journal features or new dependencies).
