# ADR 0008 — Advanced workout block model

## Status

Accepted (Increment 6)

## Context

Increment 6 needs more than straight sets: supersets, circuits, timed blocks
(AMRAP, EMOM, for-time), and drop sets appear in real programs (including the
Arnold starter). A single `protocol` string per exercise does not express
block-level rounds, shared rest, or multiple exercises in one unit.

Prior sketch docs used `group_id` on flat exercise rows; the shipped schema
instead nests exercises inside **`workout_blocks`** with a typed enum.

## Decision

1. **`workout_block_type` enum** on `workout_blocks`:
   `warmup`, `straight_sets`, `superset`, `circuit`, `amrap`, `emom`,
   `for_time`, `drop_set`, `cooldown`.
2. **Exercises belong to a block** via `workout_block_exercises.sort_order`.
   Supersets/circuits are multiple exercises in one block — no separate
   `group_id` column.
3. **Set roles and completion rules** on `workout_set_prescriptions`:
   - Roles: `warmup`, `working`, `top_set`, `backoff`, `drop_set`, `amrap`
   - Rules: `fixed_reps`, `rep_range`, `time_based`, `distance_based`,
     `amrap_to_failure`
4. **Performance snapshots** copy `block_type_snapshot` and ordering onto
   `workout_session_exercises` at session start.
5. **Increment 6 UI may implement a subset** (straight sets + superset first);
   enum breadth avoids migrations when timers and circuit UX land.

## Consequences

- Plan authoring UI must be block-aware (add block → add exercises → prescribe sets).
- Session logger iterates blocks, not a flat exercise list, for faithful UX.
- Drop sets use role/type semantics rather than a separate micro-protocol engine.
- Rehab-specific block types deferred — do not overload this enum with clinical
  protocols in Increment 6.

## Related

- `docs/development/ADVANCED_SET_TYPES.md`
- `docs/development/WORKOUT_PLAN_MODEL.md`
- `supabase/migrations/20260730120000_increment6_workout_engine.sql`
