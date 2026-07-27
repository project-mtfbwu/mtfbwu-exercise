# BUILD_INCREMENTS.md

Phased delivery. **Stop before coding** until Increment 0 exit criteria are met and the user authorizes scaffolding.

## Increment 0 — Planning foundation

**Goal:** Planning and reference foundation only.

### Deliverables

- [x] `AGENTS.md`
- [x] Architecture docs + ADRs (this folder)
- [x] Cursor rules
- [x] Design-references README + approved images
- [x] Design system docs

### Exit criteria

1. Docs and ADRs available in repo
2. License boundaries understood (AGPL study-only)
3. User authorized Increment 1

---

## Increment 1 — App skeleton + design tokens

- [x] Initialize Next.js App Router (TypeScript) + pnpm + Node 24
- [x] PWA manifest stub
- [x] CSS variables + dark grid shell (no domain UI)
- [x] Motion preference plumbing (`full` | `reduced` | `off`)
- [x] Supabase client/proxy shells; no domain tables
- [x] Dexie outbox shell + tests
- [x] Route placeholders, CI, docs

---

## Increment 2 — Live GeoCities flat-lay board shell

**Goal:** Prove the core visual interaction system only (no backend / domain logic).

### Deliverables

- [x] Live GeoCities flat-lay Today board (`/today`)
- [x] Reusable visual primitives (`PaperCard`, `RetroWindow`, `StickerBadge`, `PixelButton`, `NumericStepper`, `ProgressMeter`, `FlatLayCard`, …)
- [x] Board shell (`FlatLayBoard`, `BoardBackdrop`, `DailyStatusStrip`, `TargetFooter`)
- [x] Focus-mode interaction (`FocusLayer`, `FocusPanel`, focus trap; board stays visible/dimmed behind)
- [x] Responsive board layouts (mobile / tablet / desktop rules)
- [x] Motion preferences (`full` | `reduced` | `off`) with local override + `prefers-reduced-motion`
- [x] Accessibility foundation (dialog semantics, Escape, focus restore, inert board, keyboard cards)
- [x] Demo-only local component state for six module shells (Breakfast, Workout, Water, Meditation, Measurements, Profile)
- [x] Visual review checklist: `docs/design-system/INCREMENT_2_VISUAL_REVIEW.md`

### Explicitly out of scope for Increment 2

- No Supabase domain tables or migrations
- No authentication UI
- No food / USDA / Open Food Facts APIs
- No barcode scanner
- No workout data model or real session persistence
- No AI import
- No real health data

### Exit criteria

1. Board + focus demos pass typecheck, lint, format, tests, build
2. Production audit remains clean
3. User accepts visual/a11y review against approved references

---

## Increment 3 — Auth + customizable board + daily status

**Goal:** Replace development-only board ownership with authenticated, user-owned configuration and date-based module status. No full domain engines yet.

### Deliverables

- [x] Supabase Auth UI (sign-up / sign-in / sign-out / forgot / reset) + SSR session proxy
- [x] Protected routes (no client-only flash of private UI when env configured)
- [x] Migrations: profiles, module_definitions, user_modules, dashboard_layouts/cards, daily_records, daily_module_statuses
- [x] RLS ownership policies + idempotent `ensure_user_board_defaults`
- [x] Onboarding (name, timezone, units, modules, motion)
- [x] Customize board (enable/disable, keyboard reorder, variant, reset)
- [x] Today date switching + daily status Save (summary only)
- [x] Dexie outbox for board/status/profile prefs; logout clears local DB
- [x] Docs: AUTHENTICATION, INCREMENT_3_*, visual review

### Explicitly out of scope for Increment 3

- Full nutrition / workout / rehab / barcode / AI / measurements / photo upload / calendar engines
- Social providers / magic-link as primary auth
- Storing domain log rows in `daily_module_statuses`

### Exit criteria

1. Typecheck, lint, format, tests, build, audit green
2. Migrations apply on local Supabase when Docker is available
3. User accepts Increment 3 completion report

---

## Increment 4 — Offline kernel (domain)

- Expand Dexie schema beyond board outbox
- Sync worker hardening against Supabase domain tables
- Idempotent mutation IDs for workouts/meals

## Increment 5 — Exercise catalog + workouts MVP

- Import permissive exercise dataset (Unlicense)
- Templates vs sessions MVP
- Straight sets + basic superset group id
- Offline session logging

## Increment 6 — Nutrition MVP

- FoodItem normalization
- Server USDA proxy + cache
- OFF barcode path + zxing camera
- Meal logs offline
- Source priority per ADR 0004

## Increment 7 — Measurements + private photos

- Measurement entries
- Private Storage bucket + RLS
- Progress photo upload/view

## Increment 8 — Rehab, hydration, meditation, calendar

- Thin modules on same patterns
- Calendar read-model

## Increment 9 — Custom trackers + AI import review

- Configurable trackers
- AI proposal review UI + provenance

## Increment 10 — Hardening

- Conflict UX, export/delete, performance, security pass
- Drop-set and richer protocols if not already done
- Animation polish within mode constraints

---

## Open questions blocking crisp later increments

1. Preferred Supabase hosted vs local CLI for auth/RLS (Increment 3)?
2. First-ship protocol set: supersets only, or drop sets too?
3. App license for MTFBWU itself (proprietary vs permissive OSS)?
4. Any must-have rehab fields from a clinician workflow?

Resolved earlier: design references are in `docs/design-references/`; package manager is pnpm 11; Node is 24 Active LTS.

Update this list as decisions land.
