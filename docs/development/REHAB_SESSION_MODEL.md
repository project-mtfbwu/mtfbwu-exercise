# Rehab session model

Performed history is separate from plans (`ADR/0009`).

## Status

`rehab_session_status`: `in_progress` | `paused` | `completed` | `discarded`

Completed and discarded sessions cannot reopen via stale offline mutations.

## Snapshots (immutable history)

On start, sessions store:

- `clinician_source_snapshot`
- `restriction_snapshot_json`
- `session_snapshot_json`
- per-exercise `exercise_name_snapshot`, `instructions_snapshot`,
  `stop_conditions_snapshot`

Plan or catalog edits later do not alter these fields.

## Sets

`rehab_sets` record side, reps/duration/hold/load, assistance, ROM, pain
before/during/after (0–10), swelling, instability, confidence (0–10), status
(`pending` | `completed` | `skipped` | `stopped` | `partial`).

## Scales

| Scale       | Values                             |
| ----------- | ---------------------------------- |
| Pain        | 0–10 (0 none, 10 worst imaginable) |
| Confidence  | 0–10 (0 none, 10 fully confident)  |
| Swelling    | none / mild / moderate / severe    |
| Instability | none / slight / moderate / severe  |

Values are user-entered observations, not clinical conclusions.

## Alerts

`rehab_alert_events` record threshold crossings or stop-condition matches.
They are not diagnoses. Continue requires explicit acknowledgment.
