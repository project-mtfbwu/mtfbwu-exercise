# Workout module

## Owns

Exercise catalog usage, workout templates, performed sessions/sets/protocols.

## Must not own

Nutrition macros, progress photos, gym multi-user admin.

## Planned entities

Exercise, WorkoutTemplate, WorkoutSession, PerformedSet

## External dependencies (later)

Shared kernel only in Increment 1. Domain APIs/libraries are deferred.

## Templates vs performed

Templates/routines vs performed WorkoutSession.

## Increment 6 scope (current)

Pure calculation functions and lightweight view types only — no persistence,
migrations, or UI yet (those land alongside this increment from other work):

- `calculations/types.ts` — `LoadUnit`, `DistanceUnit`, `DumbbellSemantics`,
  `PerformedSetLike`, and related shapes calculations depend on.
- `calculations/volume.ts` — session/exercise volume (`load * reps`), with
  documented dumbbell (`per_hand` vs `total_combined`) and unilateral rules.
- `calculations/one-rm.ts` — Epley/Brzycki 1RM **estimates** (not measured
  truth), valid only for 1–12 reps and a positive load.
- `calculations/units.ts` — kg/lb conversion; bodyweight units resolve to
  `null` because the caller must supply the user's bodyweight.
- `calculations/duration.ts` — session duration and timed-set duration sums.
- `types.ts` — lightweight template/session/performed-set view types for UI,
  matching the templates-vs-performed split in `DOMAIN_MODEL.md`.

## Status

Increment 6: calculations module + domain types implemented as pure
functions. No exercise catalog, templates, sessions, or migrations yet —
those are separate, still-pending Increment 6 work.
