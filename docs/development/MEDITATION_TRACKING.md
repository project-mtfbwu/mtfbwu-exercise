# Meditation tracking

Increment 9 meditation logs timed or manual sessions with pause-aware duration and offline timer recovery.

## Data model

- **`meditation_sessions`** — `local_date`, `started_at`, `completed_at`, `duration_seconds`, `meditation_type` enum, `completed` flag
- Duration = elapsed time minus pauses (see `src/modules/meditation/calculations/timer.ts`)

## Module

`src/modules/meditation/` — timer state, actions, day summary loader, recovery helpers.

### Timer recovery (`MeditationTimerDraft`)

Persisted in Dexie `meditationTimerState` (single row per user: `meditation-timer:{userId}`):

- Phases: `active` | `paused` | `expired_pending` | `completed_queued` | `completed_synced`
- Timestamp math via `timer-recovery.ts` (`computeTargetEndAt`, `remainingSeconds`, `classifyTimerRecovery`)
- Guards: one active timer, no reopen after completed, local-date attach only on matching board day

## UI

- **Meditation focus** — start/pause/resume/complete timer or manual duration entry
- **Recovery** — restores active/paused timers on mount; expired timers require explicit confirm/adjust/discard (never silent complete)
- **`completed_queued`** — shows sync status; timer UI stays closed until post-sync cleanup
- Board label shows completed duration or "not logged"
- `timezone` prop from today-board for draft metadata

## Offline

- Dexie `meditationDrafts` + `meditationTimerState` for in-progress timer recovery
- Outbox via `buildMeditationSessionWrites`
- Post-sync cleanup clears drafts and timer state when session outbox row is `synced` (see `draft-cleanup.ts`)

## Related

- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
- [INCREMENT_9_OFFLINE_SYNC.md](./INCREMENT_9_OFFLINE_SYNC.md)
