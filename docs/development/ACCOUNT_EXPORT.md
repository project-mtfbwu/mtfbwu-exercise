# Account export

Owner-only export from Settings (`requestAccountExportAction`).

## Payload (exportVersion 2)

- Profile, modules, domain counts
- `privateFiles` signed-link manifest (MVP approach **B**)
  - progress photos (active only)
  - retained nutrition-label images
  - avatar path when `profiles.avatar_path` is set
  - rehab media: none in current schema
- Short-lived signed URLs (`SIGNED_LINK_TTL_SECONDS` = 15 minutes)
- Soft-deleted / cross-user paths excluded
- Partial signing failures recorded on each file entry + `failed_file_count` on `account_export_requests`

## Guarantees

- Owner-only (RLS + `auth.uid()`)
- Rate-limited (fail-closed on limiter provider failure)
- No public bucket URLs
- No service-role secret in client
- Auditable `account_export_requests` row with `expires_at`, `manifest_summary`

## Deferred

ZIP packaging of binary files remains future work when using the signed-link manifest approach.
