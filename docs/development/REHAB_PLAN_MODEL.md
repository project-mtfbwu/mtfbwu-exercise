# Rehab plan model

Plans are **templates**: clinician-guided intended structure. Editing a plan
never rewrites completed `rehab_sessions`.

## Hierarchy

```
rehab_plans (versioned, soft-delete via archive_rehab_plan)
  rehab_plan_phases (phase_type; display_order)
    rehab_plan_days (day_index)
      rehab_plan_exercises (exactly one of catalog XOR user exercise)
        rehab_set_prescriptions
  rehab_restrictions (value_text primary; structured fields optional)
  rehab_clinician_sources (provenance; name ≠ clinical verification)
```

## Phase types

`protection` | `mobility` | `activation` | `strength` | `control` |
`return_to_activity` | `custom`

These labels organize user/clinician structure. They do **not** imply every
injury follows this sequence.

## Versioning

- `rehab_plans.version` increments on structural edits and archive.
- Stale `expectedVersion` updates return a visible conflict.
- `newVersionPlanAction` / `copyPlanAction` create independent plan rows.

## Scheduling

`scheduled_rehab_sessions` assign a plan day (or ad-hoc title) to a local date.
Status: `planned` | `started` | `completed` | `skipped` | `cancelled`.

Phase advancement is never automatic.
