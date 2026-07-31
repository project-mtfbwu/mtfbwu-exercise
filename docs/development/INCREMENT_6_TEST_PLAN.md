# Increment 6 test plan

## Automated (unit / integration)

- Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm test`.
- **Calculations:** volume (dumbbell semantics, unilateral), 1RM estimates
  (rep bounds), unit conversion kg/lb, session duration sums
  (`src/modules/workout/calculations/*.test.ts`).
- **Starter plan:** `arnold-starter.test.ts` — stable keys resolve, no invented
  loads in prescriptions.
- **Copy session:** `copy-session.test.ts` — independent pending sets, suggestion
  notes, no pre-completed values.
- **Personal records:** `personal-records.test.ts` — warmup ignored, only
  confirmed prior bests block new candidates.
- **Plan actions:** `plan-actions.test.ts` — prescription seed includes tempo/RIR
  fields.
- **Outbox builders:** `workout-outbox.test.ts` — completion/skip/add/update/delete,
  finish-with-pending-sets, stale-write predicates, payload shape.
- **Schemas:** session and plan action Zod schemas reject invalid version/status payloads.

## Local Supabase

1. Start Docker and run `npx supabase db reset`.
2. Run SQL RLS tests in order:
   - `supabase/tests/increment3_auth_board_rls.sql`
   - `supabase/tests/increment4_nutrition_rls.sql`
   - `supabase/tests/increment6_workout_rls.sql`
3. Confirm catalog tables are **select-only** for authenticated (write denied).
4. Confirm user A cannot read user B's plans, sessions, sets, or PRs.
5. Confirm soft-deleted plan (`deleted_at`) invisible to owner select policy.
6. Confirm `exercise_definitions` seed row `barbell_bench_press` exists.

CI (`.github/workflows/ci.yml`) runs increment 3–6 SQL tests on every push/PR.

## Session conflict (server actions)

- Start session → note `version`.
- Complete set with wrong version → expect conflict error.
- Finish session → second finish with stale version → rejected.
- Start while another `in_progress` → conflict + `activeSessionId`.
- Discard completed session attempt → rejected.
- Copy yesterday / repeat last while active session exists → conflict.

## Copy session semantics

- Copy yesterday and repeat last both produce new session ids.
- All copied sets are `pending`; suggestion text in `notes`, not reps/load columns.
- Source completed session rows unchanged.

## Personal records

- Finish with beating set → `pending` PR rows inserted.
- Confirm → `status = confirmed`; dismiss → `status = dismissed`.
- Warmup sets never produce candidates.
- Upsert on `(workout_set_id, record_type)` — no duplicate type per set.

## Plan editor (server actions)

- Create plan → add day → block → exercise → prescription → reorder via action payloads.
- Stale `expectedVersion` on update → `conflict: true`.
- Archive soft-deletes (`deleted_at`); performed sessions retained.

## Snapshot immutability

- Start session from plan day → capture `display_name_snapshot`.
- Rename catalog exercise or plan exercise notes → snapshot unchanged on
  existing session rows.

## Offline (coordinator wired)

- Airplane mode: queue set completion/skip/finish → reload → drafts present.
- Go online → coordinator applies upserts in order; duplicate primary keys idempotent.
- Finish payload includes pending set writes before session completion row.
- Stale skip against server-completed set → outbox failed, banner shown.
- Stale mutation against server-completed session → reopen rejected.

Offline tests cover Dexie persistence, payload shape, builder unit tests, and
coordinator apply rules in `sync-coordinator.ts` / `workout-outbox.test.ts`.

## Explicitly not Increment 6 test targets

- Rehab merge, AI workout generation, wearables, pose detection
- Progress photos, measurements engine
- Social/trainer multi-user flows
- Pointer drag-and-drop plan reorder (keyboard reorder only)

## Accessibility / visual

See `INCREMENT_6_MANUAL_QA.md` and `docs/design-system/INCREMENT_6_VISUAL_REVIEW.md`.
