# Rehab restrictions

Restrictions capture clinician-guided limits. Original wording is primary
(`value_text`). Structured fields are optional and only when the user
explicitly confirms them (`ADR/0010`).

## Types

`load_limit` | `range_limit` | `movement_avoidance` | `assistance_required` |
`weight_bearing` | `frequency_limit` | `stop_condition` | `clinician_instruction` |
`custom`

## Severity

`informational` | `caution` | `stop`

## Provenance

`rehab_clinician_sources` records source type (physiotherapist, orthopedic,
document, self_entered, …). Entering a clinician name does **not** imply the
system verified the instruction.

## Rules

- Do not auto-translate free text into numeric limits.
- Expired restrictions remain in session historical snapshots.
- Stale offline restriction edits must not overwrite newer clinician wording
  (updated_at / version checks).
- Workout module may only show a neutral notice that restrictions exist.
