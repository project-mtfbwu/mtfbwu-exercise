# ADR 0009 — Rehab plan versus performed session

## Status

Accepted (Increment 7)

## Context

Rehab needs both clinician-guided structure and historical logging of what the
user actually did. Merging these causes plan edits to corrupt history.

## Decision

Keep four concepts separate:

1. **Rehab plan** — intended structure (phases/days/exercises/prescriptions)
2. **Rehab phase / day** — named organization inside a plan
3. **Scheduled rehab** — plan day assigned to a local date
4. **Performed rehab session** — immutable snapshots of exercises, sets,
   symptoms, restrictions, and clinician source at performance time

Editing a plan never rewrites completed sessions.

## Consequences

- Session start copies snapshots into session/exercise rows
- Soft-deleted plans remain referenced by historical FKs (`ON DELETE SET NULL`
  where appropriate) while snapshots preserve display data
- Offline finish cannot reopen a completed session
