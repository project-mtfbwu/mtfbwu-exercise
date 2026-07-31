# ADR 0010 — Clinician instructions and user-confirmed structure

## Status

Accepted (Increment 7)

## Context

Clinician guidance often arrives as free text. Automatically interpreting
ambiguous wording into numeric limits risks unsafe automation.

## Decision

1. Store original clinician wording prominently (`rehab_restrictions.value_text`).
2. Structured fields (type, side, numeric min/max, unit, severity) are optional
   and only when the user explicitly confirms them.
3. `rehab_clinician_sources` records provenance; a name does not imply the app
   clinically verified the source.
4. Alerts pause progression and require acknowledgment; they are not diagnoses.
5. No automatic load/ROM/volume increases; no return-to-sport clearance.

## Consequences

- Restriction editor shows free text first
- Workout may only show a neutral notice about active restrictions
- Safety copy is mandatory in rehab UI surfaces
