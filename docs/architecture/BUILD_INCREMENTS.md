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

**Status:** Complete.

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

## Increment 4 — Nutrition engine

**Goal:** Ship source-normalized nutrition persistence, calculations, and offline meal drafts with replayable nutrition writes.

### Deliverables

- [x] Nutrition schema + RLS: foods, portions, nutrients, barcodes, custom foods, recipes, meal templates, performed meal logs/items, and goals
- [x] Curated starter-food migration with explicit provisional/verified status
- [x] Server-only USDA and Open Food Facts resolution clients; source normalization and calculations
- [x] Dexie v2 `mealLogDrafts` plus nutrition outbox payloads for meal logs, recipes, custom foods, and meal templates
- [x] Nutrition source, calculation, local-Supabase, and test documentation

### Deferred from Increment 4

- Camera barcode scanning, nutrition-label OCR, and AI meal parsing
- Workout / rehab / progress-photo persistence
- Live USDA/OFF integration verification against production APIs in CI

## Increment 5 — Camera barcode + nutrition-label OCR

**Goal:** Fast packaged-food entry with reviewable barcode scans and human-confirmed label OCR.

### Deliverables

- [x] Native `BarcodeDetector` + `@zxing/browser` fallback behind one adapter
- [x] Meal-focus scanner UI (camera, manual entry, image upload)
- [x] Product resolution via barcode cache → Open Food Facts
- [x] Product-not-found → label capture → OCR → mandatory human review
- [x] Private `nutrition-labels` Storage bucket + capture/review tables + RLS
- [x] Offline draft for uncached barcodes; Dexie v3 `labelCaptureDrafts`
- [x] Docs + ADRs 0005/0006 + visual review

### Explicitly out of scope for Increment 5

- AI plate/meal recognition or portion estimation from photos
- Natural-language food logging
- Workout / rehab / progress photos / body measurements
- Cloud OCR or automatic Open Food Facts contributions
- Silent OCR saves without human confirmation

## Increment 6 — Exercise catalog + workout engine

**Goal:** Curated catalog, plan/template model, performed sessions with snapshots, scheduling, plan editor, copy/repeat session, PR review, and offline session/set logging.

**Status:** Complete (local; uncommitted until user requests commit).

### Deliverables

- [x] Migrations: exercise taxonomy + catalog seed + expansion, plans/days/blocks/prescriptions, scheduling, sessions/sets/notes/PRs, align columns, plan-editor align (`transition_seconds`, tempo/RIR, `personal_records.status`)
- [x] RLS: catalog authenticated read-only; user plans/sessions owner-scoped (`increment6_workout_rls.sql`)
- [x] Plan editor UI at `/plans` and `/plans/[planId]` — meta, days, blocks, exercises, prescriptions, archive, copy, new version; keyboard reorder; version conflict refresh
- [x] Session actions: start/finish/discard, set complete/skip/add/update/delete, schedule, copy yesterday, repeat last
- [x] Personal records: pending candidate detection on finish; confirm/dismiss UI; unique per `(workout_set_id, record_type)`; warmup excluded
- [x] Calculations: volume, 1RM estimates, units, duration
- [x] Dexie v4 `activeWorkoutSessions` + `workoutSetDrafts` + `workoutNoteDrafts` + workout outbox payload builders
- [x] Workout outbox apply in `sync-coordinator.ts` (finish atomic with pending set writes; stale skip / completed-session guards)
- [x] Live workout focus UI replacing demo `WorkoutFocus`
- [x] Arnold Phase One optional starter install
- [x] Real board workout status from scheduled + active session summaries
- [x] Docs + ADRs 0007/0008 + visual review checklist

### Explicitly out of scope for Increment 6

- Rehab engine merge, AI workout generation, wearables/pose detection
- Progress photos, measurements engine (later increments)
- Social feeds, trainer/coach multi-user admin
- Pointer drag-and-drop plan reorder (keyboard reorder ships)
- Medical diagnosis or clinical protocol modeling

## Increment 7 — Rehab engine

**Goal:** Clinician-guided rehab tracking — catalog, plans, restrictions,
performed sessions with symptom scales, alerts, board status, offline logging.

**Status:** Complete locally (uncommitted until user requests commit).

### Deliverables

- [x] Migrations: rehab catalog taxonomy + seed, plans/phases/days/prescriptions,
  restrictions, clinician sources, scheduling, sessions/sets/observations/alerts,
  `archive_rehab_plan` RPC
- [x] RLS: catalog authenticated read-only; owner chains; `increment7_rehab_rls.sql`
- [x] Plan builder at `/rehab/plans` (phases, days, exercises, prescriptions,
  restrictions, archive/copy/version)
- [x] Session runner replacing Rehab demo focus; scales + stop/alert UX
- [x] Dexie v6 rehab drafts + ordered outbox; sync-coordinator apply
- [x] Board `rehabStatusLabel` + day summary; workout neutral restriction notice
- [x] Session summary foundation (exportable view, not a medical report)
- [x] Docs + ADRs 0009/0010 + visual review checklist

### Explicitly out of scope for Increment 7

- Diagnosis, AI rehab plans, pose analysis, wearables
- Automatic progression / return-to-sport clearance
- Auto-modifying workouts from rehab data
- Clinician portal, appointment booking, emergency triage
- Measurements / progress photos (later)

## Increment 8 — Measurements + private photos

**Status:** Implemented locally (uncommitted until user asks).

- [x] Migrations: weight, measurements, photo sets, comparisons, notes, summary prefs, catalog seed
- [x] RLS + `increment8_progress_rls.sql`
- [x] Modules: measurements, progress-photos, progress timeline/compare/prefs
- [x] Dexie v8 + `progressPhotoBlobs` + progress outbox; sync-coordinator apply
- [x] UI: Measurements focus, Progress photos focus, `/progress` page, comparison viewer, SVG charts
- [x] Board `progressStatusLabel`; profile summary counts
- [x] Docs under `docs/development/` + ADRs 0011/0012 + `INCREMENT_8_VISUAL_REVIEW.md`

### Explicitly out of scope for Increment 8

- Hydration, meditation, calendar (Increment 9)
- Chart libraries, AI body analysis, body scoring

## Increment 9 — Hydration, meditation, calendar polish

- Thin modules on same patterns
- Calendar read-model

## Increment 10 — Custom trackers + AI import review

- Configurable trackers
- AI proposal review UI + provenance

## Increment 11 — Hardening

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
