# Increment 6 — Exercise catalog + workout engine

Checkpoint baseline: Increment 5 (barcode + label OCR).

## Goal

Ship a **templates-vs-sessions** workout engine: curated exercise catalog,
user-owned plans with a full editor, performed sessions with immutable snapshots,
copy/repeat session, PR review, scheduling, and offline session/set logging via
Dexie v4.

This increment is **training tracking**, not medical advice. MTFBWU does not
diagnose injuries, prescribe rehab, or replace a clinician.

## Dependencies

No new npm packages for the workout domain in Increment 6. Calculations are
pure TypeScript in `src/modules/workout/calculations/`.

## Migrations

| File                                                  | Contents                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `20260730120000_increment6_workout_engine.sql`        | Enums, catalog taxonomy, plans/days/blocks/prescriptions, scheduling, sessions/sets/notes/PRs, RLS |
| `20260730120100_increment6_exercise_catalog_seed.sql` | Curated muscle groups, equipment, movement patterns, starter `exercise_definitions`                |
| `20260730120200_increment6_workout_align.sql`         | Session title/duration/RPE/volume, `load_unit`, align columns, `partial` set status                |
| `20260730120300_increment6_catalog_expansion.sql`     | Additional curated exercises and taxonomy rows for the expanded catalog                            |
| `20260730120400_increment6_plan_editor_align.sql`     | `workout_blocks.transition_seconds`; prescription tempo/RIR columns; `personal_records.status`     |

## Exercise catalog source note

- **`mtfbwu_curated`** — descriptions in the seed migration are **original
  one-sentence summaries written for this project** (`verified` flag on rows
  where appropriate).
- **`free_exercise_db`** — enum value reserved for reference-only provenance;
  the [free-exercise-db](https://github.com/yuhonas/free-exercise-db) dataset
  (Unlicense) may inform **exercise naming and movement facts** during curation.
  **Do not claim copied descriptions** from that dataset or any other source.
- Authenticated clients can **read** active catalog rows; they cannot insert or
  update system catalog tables (writes fail closed — no write grants + RLS).

## Tables (summary)

**Catalog (system read-only):** `muscle_groups`, `equipment_types`,
`movement_patterns`, `exercise_definitions`, `exercise_aliases`,
`exercise_muscle_groups`.

**User-owned:** `user_exercises`, `workout_plans`, `workout_plan_days`,
`workout_blocks`, `workout_block_exercises`, `workout_set_prescriptions`,
`scheduled_workouts`, `workout_sessions`, `workout_session_exercises`,
`workout_sets`, `workout_session_notes`, `personal_records`.

Detail: `WORKOUT_PLAN_MODEL.md`, `WORKOUT_SESSION_MODEL.md`, and
`docs/architecture/DATA_MODEL.md`.

## Key flows

1. **Browse catalog** → search `exercise_definitions` (+ aliases); optional
   private `user_exercises` wrapper or fully custom movement.
2. **Create / edit plan** → `/plans` lists plans; `/plans/[planId]` is the full
   plan editor (meta, days, blocks, exercises, prescriptions, archive, copy,
   new version). Keyboard reorder (ArrowUp/ArrowDown) is primary; stale
   `workout_plans.version` shows a refresh banner (or copy / new version to
   fork). See `WORKOUT_PLAN_MODEL.md`.
3. **Install starter** → `installArnoldStarterPlanAction` copies
   `ARNOLD_STARTER_PLAN` into user-owned rows (explicit action only).
4. **Schedule** → `scheduled_workouts` on a `local_date` (plan day or ad-hoc
   title); stores `timezone`.
5. **Start session** → from plan day, schedule, blank, **copy yesterday**
   (`copyYesterdaySessionAction`), or **repeat last** (`repeatLastSessionAction`).
   Snapshots plan structure into `workout_session_exercises` + pending
   `workout_sets`; records `source_plan_version`; rejects if another
   `in_progress` session exists. Copy/repeat creates **independent rows** with
   fresh ids; prior reps/load appear only as set `notes` suggestions — never
   pre-completed (`copy-session.ts`, ADR 0007).
6. **Log sets** → complete/skip/add/update/delete sets; persist `weight_kg` +
   `load_unit`; bump session `version` on each mutation.
7. **Finish** → `status = completed`, `duration_seconds`, `total_volume`, PR
   candidate detection (pending until user confirms), daily module status
   summary. Completed sessions cannot reopen.
8. **Personal records** → on finish, inserts `pending` candidates (warmup
   ignored; unique per `(workout_set_id, record_type)`). Workout focus shows
   confirm/dismiss UI; only `confirmed` rows count as the bar to beat.
9. **Offline** → Dexie v4 drafts + outbox payloads; coordinator replays when
   online (`WORKOUT_OFFLINE_SYNC.md`). Finish bundles pending set writes
   atomically.

## Conflict rules (exact)

| Case                               | Rule                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Plan update                        | Client sends expected `workout_plans.version`; stale update **rejected** (no silent merge)            |
| Session in progress vs stale write | Server `completed` / `discarded` **wins** over stale offline `in_progress` mutations                  |
| Dual active sessions               | **No silent dual** `in_progress` sessions per user; start actions return conflict + `activeSessionId` |
| Completed session reopen           | Stale offline mutation **cannot** reopen a `completed` session or downgrade its status                |
| Destructive delete                 | Plan soft-delete / session discard requires **current** `version` when provided                       |
| Historical snapshots               | Plan edits **never rewrite** `display_name_snapshot`, `snapshot_json`, or performed set rows          |

Session-level optimistic concurrency uses `workout_sessions.version` (sets have
no version column). Set mutations check session version before apply.

## Safety boundaries

- **No diagnosis** — pain/RPE/notes are user-entered context, not clinical
  assessment output.
- **No rehab merge** — rehab remains a separate future module; do not fold
  clinical protocol fields into workout sessions in this increment.
- Starter plans (e.g. Arnold Phase One) are **example templates**, not
  prescriptions; user must explicitly install.

## Deferred (not Increment 6)

- Rehab engine merge with workouts
- AI workout generation / import
- Wearables, pose detection, form scoring
- Progress photos, measurements engine (Increment 7)
- Social feeds, trainer/coach multi-user admin
- Full drag-and-drop plan reorder (keyboard reorder ships; pointer DnD optional)
- Medical diagnosis or clinical protocol modeling

## Related docs

- `WORKOUT_PLAN_MODEL.md`, `WORKOUT_SESSION_MODEL.md`, `ADVANCED_SET_TYPES.md`
- `WORKOUT_OFFLINE_SYNC.md`, `INCREMENT_6_TEST_PLAN.md`, `INCREMENT_6_MANUAL_QA.md`
- `docs/design-system/INCREMENT_6_VISUAL_REVIEW.md`
- `docs/architecture/ADR/0007-plan-versus-performed-session.md`
- `docs/architecture/ADR/0008-advanced-workout-block-model.md`

## Module map

| Path                                                         | Role                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| `src/app/plans/page.tsx`, `plans/[planId]/page.tsx`          | Plans list + plan editor routes                         |
| `src/widgets/plans/plans-client.tsx`                         | Create plan, install Arnold, schedule day               |
| `src/widgets/plans/plan-editor-client.tsx`                   | Full plan CRUD UI + version conflict refresh            |
| `src/modules/workout/plans/actions.ts`                       | Plan/day/block/exercise/prescription mutations          |
| `src/modules/workout/sessions/actions.ts`                    | Session lifecycle, scheduling, copy/repeat, PR review   |
| `src/modules/workout/sessions/copy-session.ts`               | Pure copy/repeat materialization (pending sets + notes) |
| `src/modules/workout/sessions/personal-record-candidates.ts` | PR detection rules (warmup excluded)                    |
| `src/modules/workout/sessions/load-workout-day.ts`           | Today-board workout summary                             |
| `src/modules/workout/plans/arnold-starter.ts`                | Pure starter plan data                                  |
| `src/modules/workout/calculations/*`                         | Volume, 1RM estimates, units, duration                  |
| `src/shared/offline/workout-outbox.ts`                       | Dexie v4 drafts + outbox payload builders               |
| `src/shared/offline/sync-coordinator.ts`                     | Workout outbox apply (`isWorkoutOutboxPayload`)         |
| `src/widgets/today-board/focus/workout-focus.tsx`            | Session runner, offline queue, PR confirm/dismiss       |
| `supabase/tests/increment6_workout_rls.sql`                  | Catalog read-only + owner isolation                     |
