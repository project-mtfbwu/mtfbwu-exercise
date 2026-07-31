# Workout session model (performed history)

Migrations: `20260730120000_increment6_workout_engine.sql`,
`20260730120200_increment6_workout_align.sql`,
`20260730120400_increment6_plan_editor_align.sql`

Performed sessions are **immutable history** once completed. Plan edits never
rewrite session rows (`ADR/0007`).

## Status enum

`workout_session_status`:

| Value         | Meaning                                      |
| ------------- | -------------------------------------------- |
| `in_progress` | Active logging                               |
| `paused`      | Reserved for future pause/resume UX          |
| `completed`   | Finished; snapshots frozen                   |
| `discarded`   | Abandoned without counting as completed work |

There is **no** `cancelled` status in the shipped schema.

## `workout_sessions`

| Column                                   | Notes                                                   |
| ---------------------------------------- | ------------------------------------------------------- |
| `daily_record_id`                        | Links to Increment 3 `daily_records` for the board date |
| `scheduled_workout_id`                   | Optional link when started from calendar                |
| `workout_plan_id`, `workout_plan_day_id` | Source plan references (nullable for blank sessions)    |
| `title`                                  | Display title (align migration; default `'Workout'`)    |
| `status`                                 | See table above                                         |
| `version`                                | Optimistic concurrency — bumped on set-level mutations  |
| `snapshot_json`                          | Opaque JSON snapshot of plan structure at start         |
| `source_plan_version`                    | `workout_plans.version` at session creation             |
| `started_at`, `completed_at`             | Timestamps                                              |
| `duration_seconds`                       | Set on finish                                           |
| `session_rpe`                            | Optional session-level RPE 0–10                         |
| `total_volume`                           | Computed on finish from completed/partial strength sets |
| `notes`                                  | Session-level free text                                 |

**Conflict rules:**

- Start actions reject when another `in_progress` session exists (`conflict: true`,
  `activeSessionId`).
- Set complete/skip/finish/discards require matching `version`; mismatch returns
  conflict — stale `in_progress` writes lose to server `completed`.
- A `completed` session **cannot** be reopened by a stale offline mutation.

## `workout_session_exercises`

Snapshot row per exercise performed:

| Column                                       | Notes                                             |
| -------------------------------------------- | ------------------------------------------------- |
| `display_name_snapshot`                      | **Required** — frozen display name                |
| `exercise_definition_id`, `user_exercise_id` | Nullable FKs (`ON DELETE SET NULL`)               |
| `sort_order`                                 | Legacy ordering field                             |
| `block_type_snapshot`                        | Block type at performance time                    |
| `block_order`, `exercise_order`              | Ordering within session (prefer `exercise_order`) |
| `started_at`, `completed_at`                 | Per-exercise timing (optional)                    |
| `notes`                                      | Per-exercise notes                                |

Plan renames or catalog deactivations do not alter `display_name_snapshot`.

## `workout_sets`

| Column                                                 | Notes                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `set_index`                                            | 1-based per session exercise                                      |
| `set_role`                                             | Same enum as prescriptions                                        |
| `status`                                               | `pending`, `completed`, `skipped`, `failed`, `partial`            |
| `reps`                                                 | Performed reps                                                    |
| `weight_kg`                                            | Canonical load storage                                            |
| `load_unit`                                            | `kg`, `lb`, `bodyweight`, `assisted_bodyweight` (align migration) |
| `duration_seconds`, `distance_meters`, `distance_unit` | Timed/distance work                                               |
| `rpe`, `rir`                                           | Effort markers (0–10)                                             |
| `tempo_snapshot`, `rest_seconds_actual`                | Optional performance metadata                                     |
| `completed_at`                                         | When marked done                                                  |

**Load rule:** UI may collect lb or bodyweight semantics, but persistence
normalizes strength loads to `weight_kg` where applicable; `load_unit` preserves
what the user entered.

Sets have **no** row-level version; concurrent set edits guard via parent
session `version`.

## `workout_session_notes`

Append-friendly notes with `note_type` (default `general`), optional `body_area`,
and `value_text` (align migration mirrors legacy `body`).

## `personal_records`

Detected on session finish when a completed strength set beats prior **confirmed**
bests. Stores `exercise_label_snapshot`, `record_type`, `value`, `unit`, optional
`workout_set_id`, and review state.

| Column / field    | Notes                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`          | `pending` \| `confirmed` \| `dismissed` — source of truth (align migration); legacy `confirmed`/`dismissed` booleans kept in sync by trigger |
| Unique constraint | `(workout_set_id, record_type)` — at most one PR row per set per type                                                                        |

**Detection rules** (`personal-record-candidates.ts`):

- Only `completed` sets with working roles (`working`, `top_set`, `backoff`,
  `amrap`, `max_effort`, `failure`, `drop_set`, `drop`) — **warmup skipped**.
- Types: estimated 1RM (best Epley/Brzycki), heaviest load, max reps (load-free).
- Pending/dismissed prior rows never block a new candidate; only **confirmed**
  rows count as the bar to beat.
- Never auto-confirmed — user must confirm or dismiss in workout focus UI.

## Session lifecycle (server actions)

| Action                                                        | Behavior                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `startBlankSessionAction`                                     | Empty session on today's `daily_record`                                                      |
| `startFromPlanDayAction`                                      | Snapshot plan day → exercises + pending sets                                                 |
| `startFromScheduledWorkoutAction`                             | Schedule → plan day or blank                                                                 |
| `copyYesterdaySessionAction`                                  | Copy prior calendar day's last completed session → new `in_progress` session for `localDate` |
| `repeatLastSessionAction`                                     | Copy user's most recent completed session (any date) → new session for `localDate`           |
| `getSessionStartOptionsAction`                                | Scheduled workout, yesterday/last summaries, active session for start menu                   |
| `completeSetAction` / `skipSetAction`                         | Mutate set + bump session version                                                            |
| `addSetAction`                                                | Append pending set                                                                           |
| `finishSessionAction`                                         | Complete, volume, PR scan (`pendingPersonalRecords`), daily status                           |
| `discardSessionAction`                                        | Mark discarded                                                                               |
| `confirmPersonalRecordAction` / `dismissPersonalRecordAction` | Set PR `status` to confirmed or dismissed                                                    |
| `listPendingPersonalRecordsAction`                            | Pending PRs for confirm/dismiss UI                                                           |

## Copy yesterday vs repeat last

Both call `buildCopySessionPlan` (`copy-session.ts`) via `materializeSessionCopy`:

- **Copy yesterday** — last `completed` session on the calendar day before
  `localDate`.
- **Repeat last** — most recently `completed` session for the user (any date).

Shared semantics:

- Fresh session/exercise/set **primary keys** — never reuses source ids (ADR 0007).
- All new sets are `pending`; reps/load are **null**.
- Prior performance copied into each set's `notes` as `"Suggested: …"` only.
- `snapshot_json` and plan references preserved from the source session.

## Immutability after completion

Once `status = completed`:

- Performed sets and snapshots are historical record.
- Plan version bumps do not alter `source_plan_version` or snapshot columns.
- Deletes require current session `version` when version is supplied (discard
  path).

## Daily board integration

`loadWorkoutDaySummary(localDate)` returns scheduled workout + active session
progress counts for the workout flat-lay card. Active session lookup is global
(one `in_progress` per user), not date-scoped.
