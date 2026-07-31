# ADR 0007 — Plan versus performed session

## Status

Accepted (Increment 6)

## Context

Workout apps often collapse "what I planned" and "what I did" into one mutable
row. That makes history untrustworthy when templates evolve, exercises rename, or
prescription loads change. MTFBWU already separates meal templates from
`meal_logs` (Increment 4) and daily status from domain logs (Increment 3).

External study references (not copied): workout.cool `Program*` vs
`WorkoutSession*`, wger `Routine` vs `WorkoutLog` — AGPL code is study-only.

## Decision

1. **Plans** live in `workout_plans` → days → blocks → prescriptions. They are
   editable templates with optimistic `version`.
2. **Performed work** lives in `workout_sessions` → session exercises → sets.
   Sessions snapshot names and plan version at start (`display_name_snapshot`,
   `snapshot_json`, `source_plan_version`).
3. **Editing a plan never rewrites historical sessions.** Catalog or plan changes
   affect future sessions only.
4. **Scheduling** (`scheduled_workouts`) is a calendar pointer, not a session.
   Starting work creates a new session row.
5. **Conflict handling:** stale plan updates rejected by version; stale session
   mutations rejected when server status is terminal (`completed` / `discarded`).

## Consequences

- Storage grows with snapshots — acceptable for personal tracking scale.
- Plan editor and session logger can ship incrementally without migration churn.
- PRs and history views always have stable labels even if catalog rows deactivate.
- Must educate UI copy: changing tomorrow's plan does not change yesterday's log.

## Related

- `docs/development/WORKOUT_PLAN_MODEL.md`
- `docs/development/WORKOUT_SESSION_MODEL.md`
- `docs/architecture/DOMAIN_MODEL.md`
