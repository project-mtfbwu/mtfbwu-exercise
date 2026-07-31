# Rehab offline sync

Dexie **v6** adds:

- `activeRehabSessions`
- `rehabSetDrafts`
- `rehabObservationDrafts`
- `rehabAlertDrafts`

Outbox payloads use `kind: "rehab"` (`src/shared/offline/rehab-outbox.ts`).

## Replay order

1. Session
2. Session exercises
3. Sets
4. Observations and alerts
5. Notes
6. Finish

A finish mutation must not replay before earlier set/alert writes.
`queueSessionFinish` folds pending drafts into one ordered payload.

## Conflict rules

| Case                        | Behavior                                            |
| --------------------------- | --------------------------------------------------- |
| Completed/discarded session | Reject reopen from stale mutation                   |
| Stopped set                 | Cannot silently become completed                    |
| Severe alert acknowledgment | Cannot be silently removed                          |
| Stale pain on completed set | Newer completed entry wins; conflict surfaced       |
| Plan version                | Stale plan updates rejected visibly                 |
| Restriction freshness       | Stale offline edit must not overwrite newer wording |

Failed sync remains visible with retry controls. No silent deletion.
