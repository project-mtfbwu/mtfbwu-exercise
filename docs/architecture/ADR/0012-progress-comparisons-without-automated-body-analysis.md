# ADR 0012 — Progress comparisons without automated body analysis

## Status

Accepted (Increment 8)

## Context

Users want to compare progress photos and measurements over time. MTFBWU must not infer body composition, health status, or aesthetic scores from photos.

## Decision

- Comparisons are **user-initiated** only: pick two dates/sets and a slot
- UI shows side-by-side images with date labels — no overlay slider until keyboard-accessible
- Saved `progress_comparisons` rows store user-selected anchors only
- **No** computer vision, body segmentation, body-fat estimation, or “score” metrics from photos
- Measurement trend text uses neutral “user-recorded data” language

## Consequences

- Increment 8 ships comparison viewer + saved comparison CRUD, not AI analysis
- Future ML features would require a new ADR and explicit user consent — out of scope for MTFBWU core

See `docs/development/PROGRESS_COMPARISONS.md`, `PROGRESS_PRIVACY.md`.
