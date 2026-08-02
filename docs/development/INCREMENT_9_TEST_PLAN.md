# Increment 9 test plan

## Unit (vitest)

- [x] `hydration/calculations/helpers.test.ts` — totals, labels, progress
- [x] `meditation/calculations/timer.test.ts` — pause/resume duration
- [x] `meditation/calculations/timer-recovery.test.ts` — target end, remaining, recovery classification, guards
- [x] `sleep/calculations/helpers.test.ts` — sleep date, cross-midnight, weekly text
- [x] `trackers/calculations/streak.test.ts` — applicable days only
- [x] `daily/completion.test.ts` — module activity completion percent
- [x] `shared/offline/tracker-outbox.test.ts` — payload builders (hydration/sleep/supplement delete, reminder writes, replay sort/deps)
- [x] `shared/offline/draft-cleanup.test.ts` — post-sync draft removal, timer cleanup, stale guards, overview cache invalidation, definition vs child draft protection
- [x] `shared/offline/offline-record-status.test.ts` — status labels for draft/queued/syncing/synced/failed/cleanup_warning
- [x] Local-date TZ helpers, month indicator helpers, customize helpers (see manual QA automated table)

## Not yet automated

- Sync-coordinator integration / multi-device conflict E2E
- Airplane-mode manual scenarios (documented in manual QA)
- Meditation focus React component integration (timer recovery UI)

## Recovery + cleanup coverage (unit)

| Scenario                                 | Covered by                                              |
| ---------------------------------------- | ------------------------------------------------------- |
| Active timer restored after refresh      | `timer-recovery.test.ts` + focus persist API            |
| Paused timer restored                    | `timer-recovery.test.ts`                                |
| Expired timer recovery                   | `timer-recovery.test.ts`                                |
| Confirm / adjust / discard expired       | focus handlers + recovery classification                |
| Completed unsynced stays completed       | `cannotReopenCompleted` + `completed_queued`            |
| Stale draft cannot reopen completed      | `cannotReopenCompleted`                                 |
| Local-date / timezone preservation       | `attachLocalDateGuard` + draft fields                   |
| Duplicate timer prevention               | `oneActiveTimerGuard`                                   |
| Focus close/reopen                       | Dexie `meditationTimerState` load on mount              |
| Browser suspension (mocked time)         | `remainingSeconds` / `computeTargetEndAt` with `nowIso` |
| Offline recovery + later sync            | draft-cleanup meditation timer clear                    |
| Successful domain draft cleanup          | `draft-cleanup.test.ts`                                 |
| Definition sync preserves child drafts   | entity-id scoped cleanup + `isDefinitionEntityType`     |
| Newer local edit survives                | `updatedAt > outbox.createdAt` guard                    |
| Idempotent cleanup / recoverable warning | `draft-cleanup.test.ts`                                 |
| Startup reconciliation                   | `reconcileStaleDrafts`                                  |

## DB (local Supabase)

- [x] `supabase/tests/increment9_daily_rls.sql`

## Manual QA

See [INCREMENT_9_MANUAL_QA.md](./INCREMENT_9_MANUAL_QA.md).
Human browser/device QA remains **pending**. Reminder **delivery** remains deferred.
