# Workout offline sync

Dexie **v4** adds workout drafts alongside the existing outbox. Pattern mirrors
Increment 4 nutrition (`mealLogDrafts`) and Increment 5 label drafts.

## Dexie v4 stores

Defined in `src/shared/offline/db.ts`:

| Store                   | Key indexes                                        | Purpose                          |
| ----------------------- | -------------------------------------------------- | -------------------------------- |
| `activeWorkoutSessions` | `id`, `userId`, `sessionId`, `updatedAt`           | In-progress session JSON payload |
| `workoutSetDrafts`      | `id`, `userId`, `sessionId`, `setId`, `updatedAt`  | Optimistic set mutation UI       |
| `workoutNoteDrafts`     | `id`, `userId`, `sessionId`, `noteId`, `updatedAt` | Queued session notes             |

Prior versions unchanged: `outbox`, `mealLogDrafts`, `labelCaptureDrafts`.

## Outbox payloads

`src/shared/offline/workout-outbox.ts`:

```typescript
{ kind: "workout", entity: "workout_session" | "workout_set" | "workout_session_note" | "scheduled_workout", writes: WorkoutWrite[] }
```

Each `WorkoutWrite` is `{ table, values, operation? }` with tables restricted to:

- `workout_sessions`
- `workout_session_exercises`
- `workout_sets`
- `workout_session_notes`
- `scheduled_workouts`

Rows use **client-generated UUIDs**; replay is upsert-by-primary-key (same as
nutrition). `idempotencyKey` dedupes duplicate queue attempts.

## Queued mutations

| Builder / queue function          | Purpose                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `queueWorkoutMutation`            | Session start (also writes `activeWorkoutSessions`)                             |
| `queueSetCompletion`              | Complete a set                                                                  |
| `queueSetSkip` / `queueSetUnskip` | Skip or revert skip                                                             |
| `queueSetAdd`                     | Add client-originated pending set (`localOnly` draft flag)                      |
| `queueSetUpdate`                  | Partial edit of reps/load/RPE/duration on a set                                 |
| `queueSetDelete`                  | Delete only unsynced client-added sets                                          |
| `queueSessionNote`                | Append/update session note                                                      |
| `queueSessionFinish`              | Finish session — **atomically prepends all pending set writes** for the session |
| `queueSessionDiscard`             | Discard in-progress session                                                     |

**Finish atomicity:** `buildSessionFinishWrites` folds every still-pending set
outbox write for the session into the finish payload (set writes first, session
completion last). Prevents a completed session from appearing with missing set
rows if the network drops mid-sync.

**Replay order:** outbox rows drain in `createdAt` order; finish bundles set
writes in chronological queue order before the session row.

**Known limitation:** bodyweight loads must be resolved to kg by the caller
before queueing; offline code does not fetch profile bodyweight automatically.

## Sync coordinator

`sync-coordinator.ts` drains **board**, **nutrition**, and **workout**
payloads. `applyWorkoutPayload` upserts rows in dependency order and enforces
session/set conflict rules via pure predicates in `workout-outbox.ts`:

- `isSessionReopenConflict` — completed/discarded session cannot reopen
- `isSessionVersionConflict` — stale discard rejected when version mismatches
- `isStaleSetWrite` — stale skip cannot overwrite a completed set

On conflict, mark outbox row `failed`, surface banner (same pattern as
`layout_version_conflict` / nutrition version mismatch) — **no silent overwrite**.

## Conflict rules (exact)

| Case                            | Rule                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Plan version**                | Plan update with stale `workout_plans.version` → **rejected**; client refreshes plan                                         |
| **Session completion wins**     | Server session already `completed` or `discarded` → stale offline `in_progress` set/session writes **rejected**              |
| **No dual active sessions**     | Only one `in_progress` session per user; offline start must check server/local active draft                                  |
| **Completed not reopened**      | Offline mutation cannot downgrade `completed` → `in_progress` or rewrite finished sets                                       |
| **Stale skip vs completed set** | Offline skip/unskip **rejected** when remote set is already `completed`                                                      |
| **Destructive delete**          | Discard/delete with stale session `version` → **rejected**                                                                   |
| **Historical snapshots**        | Plan edits never mutate queued payloads' `display_name_snapshot` / `snapshot_json`; replay writes upsert performed rows only |

Session optimistic concurrency: mutating actions require expected
`workout_sessions.version` (`completeSetAction`, `skipSetAction`,
`finishSessionAction`, optional on `discardSessionAction`).

## Transactions

Always queue in one Dexie transaction:

```
db.transaction('rw', db.outbox, db.activeWorkoutSessions, ...)  // session start/finish/discard
db.transaction('rw', db.outbox, db.workoutSetDrafts, ...)       // set mutations
db.transaction('rw', db.outbox, db.workoutNoteDrafts, ...)      // session notes
```

Never write session + set outbox rows outside a transaction when they must
appear together.

## Logout

`clearLocalOfflineData` deletes the entire Dexie database — workout drafts and
outbox included. No JWTs or service keys in IndexedDB.

## Catalog offline

Exercise catalog is read from Supabase when online. Increment 6 does not mirror
the full catalog into Dexie yet; offline session start from a plan requires
prior online snapshot or a cached session draft. Graceful degradation: show
message when catalog-dependent start is unavailable offline.

## Testing

See `INCREMENT_6_TEST_PLAN.md` and `workout-outbox.test.ts`:

- Duplicate `idempotencyKey` does not duplicate outbox rows
- `buildSetCompletionWrites`, skip/add/update/delete, finish-with-pending-sets builders
- Stale-write predicates (`isStaleSetWrite`, `isSessionReopenConflict`)
- Airplane mode session draft survives reload (local)
- Coordinator apply rejects completed-session reopen and stale skip

## Related

- `docs/architecture/OFFLINE_SYNC.md`
- `ADR/0002-supabase-dexie.md`
- `ADR/0007-plan-versus-performed-session.md`
