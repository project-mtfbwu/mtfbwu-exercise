# Increment 7 — Rehab engine

Checkpoint baseline: Increment 6 (`3fb1082918361bdd28cf73e1940eb6d234e48954`).

## Goal

Ship clinician-guided **rehabilitation tracking**: catalog, plans/phases/days,
restrictions with provenance, performed sessions with symptom scales, alerts,
board status, and offline logging.

MTFBWU records plans supplied or confirmed by the user and their clinician.
It is a **tracking tool, not medical advice**, and must not behave like an
autonomous physiotherapist.

See also:

- `REHAB_PLAN_MODEL.md`
- `REHAB_SESSION_MODEL.md`
- `REHAB_RESTRICTIONS.md`
- `REHAB_OFFLINE_SYNC.md`
- `REHAB_SAFETY_BOUNDARIES.md`
- ADRs 0009–0010

## Migrations

| File                                               | Contents                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `20260731120000_increment7_rehab_engine.sql`       | Enums, 18 tables, indexes, checks, RLS, grants, `archive_rehab_plan` RPC |
| `20260731120100_increment7_rehab_catalog_seed.sql` | Body areas, movements, curated rehab exercise catalog                    |
| `20260731120200_increment7_rehab_align.sql`        | `rehab_restrictions.display_order`; hardened `archive_rehab_plan`        |

## Tables (18)

**Catalog (authenticated read-only):** `rehab_body_areas`, `rehab_movements`,
`rehab_exercise_definitions`, `rehab_exercise_aliases`.

**User-owned:** `user_rehab_exercises`, `rehab_clinician_sources`, `rehab_plans`,
`rehab_plan_phases`, `rehab_plan_days`, `rehab_plan_exercises`,
`rehab_set_prescriptions`, `rehab_restrictions`, `scheduled_rehab_sessions`,
`rehab_sessions`, `rehab_session_exercises`, `rehab_sets`,
`rehab_session_observations`, `rehab_alert_events`.

## Soft-delete note

Authenticated `UPDATE` that sets `deleted_at` while `SELECT` requires
`deleted_at IS NULL` fails under RLS (PostgREST `RETURNING` / policy
interaction). Plan archive uses security-definer RPC `archive_rehab_plan`.

## Workout boundary

Rehab and workout remain separate modules. Workout may show a neutral notice
when active rehab restrictions exist. Workouts are never auto-modified from
rehab data.

## Deferred

Diagnosis, AI rehab plans, pose analysis, wearables, measurements/photos,
clinician portal, PDF export (beyond summary view), automatic progression /
return-to-sport clearance.
