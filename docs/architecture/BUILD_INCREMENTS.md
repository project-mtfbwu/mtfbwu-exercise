# BUILD_INCREMENTS.md

Phased delivery. **Stop before coding** until Increment 0 exit criteria are met and the user authorizes scaffolding.

## Increment 0 — Foundation (current)

**Goal:** Planning and reference foundation only.

### Deliverables

- [x] `AGENTS.md`
- [x] Architecture docs + ADRs (this folder)
- [x] Cursor rules
- [x] Design-references README (image inventory)
- [ ] Approved visual **images** placed under `docs/design-references/` (still missing as of 2026-07-26)
- [ ] User confirmation of open questions (see end of this file / research report)

### Explicitly out of increment

- No Next.js init
- No dependency installs
- No migrations
- No production code

### Exit criteria

1. Docs and ADRs merged/available in repo
2. License boundaries understood (AGPL study-only)
3. Open questions acknowledged
4. User says proceed to Increment 1

**Ready for Increment 0 completion?** Docs/rules yes; **image assets + user ack** still open — see final report.

---

## Increment 1 — App skeleton + design tokens

- Initialize Next.js App Router (TypeScript) **when authorized**
- PWA manifest stub
- CSS variables + dark grid board shell (no real data)
- Animation mode switch plumbing
- Supabase project wiring (env only); no feature CRUD yet

## Increment 2 — Auth + profile + RLS skeleton

- Supabase Auth
- `profiles` table + RLS
- Enabled modules + animation_mode preferences
- Logout clears Dexie

## Increment 3 — Flat-lay + focus chrome

- All enabled module cards visible
- Focus lift with board behind
- Empty states per module
- Wire visual references once images exist

## Increment 4 — Offline kernel

- Dexie schema v1 + outbox
- Sync worker stub against Supabase
- Idempotent mutation IDs

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

1. Where are the approved design images, and who will add them?
2. Preferred package manager / Node version pin?
3. Supabase hosted vs local CLI for Increment 1?
4. First-ship protocol set: supersets only, or drop sets too?
5. App license for MTFBWU itself (proprietary vs permissive OSS)?
6. Any must-have rehab fields from a clinician workflow?

Update this list as decisions land.
