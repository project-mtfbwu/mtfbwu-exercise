# Progress privacy (Increment 8)

Personal health-adjacent data — private to the authenticated user.

## Principles

1. **User-recorded only** — no AI body analysis, scoring, or diagnosis
2. **Neutral language** — descriptive change text in `src/modules/measurements/calculations/`
3. **Private photos** — Storage RLS + `{user_id}/…` path prefix; signed URLs for display
4. **No clinician provenance on progress rows** — `source: manual`; rehab clinician sources remain separate
5. **Soft delete** — RLS hides `deleted_at` rows

## UI copy

`src/modules/progress-photos/safety.ts` — privacy banner, capture hint, disclaimer:

> Progress summary — user-recorded data.

## Camera

Progress photo capture uses device camera in-browser (`managed-camera.ts`); **video is never uploaded** — only a single JPEG frame after crop/rotate/preprocess. File picker fallback when permission denied or insecure context. See also `CAMERA_PRIVACY.md`.

Processed uploads include SHA-256 checksum metadata when available.

Export/delete account flows: Increment 11.
