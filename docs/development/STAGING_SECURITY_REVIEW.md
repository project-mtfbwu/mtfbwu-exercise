# Staging security review

## Headers / transport (hosted)

| Check                     | Result | Notes                           |
| ------------------------- | ------ | ------------------------------- |
| CSP                       |        | App middleware / headers module |
| HSTS                      |        | Host + app headers              |
| Frame restrictions        |        |                                 |
| Referrer policy           |        |                                 |
| Camera Permissions-Policy |        | self only                       |
| HTTPS only                |        |                                 |

## Data isolation

| Check                                 | Result | Notes                   |
| ------------------------------------- | ------ | ----------------------- |
| No public storage buckets             |        | After Inc5/8 migrations |
| Cross-user RLS                        |        | Two-user smoke          |
| Signed URL expiry                     |        |                         |
| Service-role isolation                |        | Server-only             |
| Account export isolation              |        |                         |
| Deletion isolation                    |        | Disposable user         |
| Safe auth redirects                   |        |                         |
| Private response caching              |        |                         |
| Rate-limit behavior                   |        | Upstash                 |
| No secrets in source maps / responses |        |                         |
| Staging disallow public indexing      |        | Prefer `noindex`        |

## Dependency / secret scan

| Check                          | Result                  |
| ------------------------------ | ----------------------- |
| `pnpm run audit` on checkpoint | Pass (local 2026-08-03) |
| CI secret scan on `main`       | Green at checkpoint     |
| Hosted deploy secret scan      | Pending                 |

## Monitoring integration (only after approval)

If a provider is chosen later:

- [ ] Staging DSN only
- [ ] Release / build tagging
- [ ] Environment tagging (`preview`)
- [ ] PII scrubbing
- [ ] Exclude health payloads (measurements, photos, meals, rehab symptoms, supplements, OCR text, tokens, private notes)
- [ ] Source-map handling
- [ ] Alert routing

Until then: **monitoring = operator blocker** (no-op adapter remains).

## Supabase advisors (staging project, Inc3 only)

Recorded 2026-08-03 via hosted security advisors (before full migration push):

| Finding                                           | Severity | Notes                                                                                        |
| ------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `set_updated_at` mutable search_path              | WARN     | Prefer `SET search_path` on function in a future forward migration (do not edit applied SQL) |
| `ensure_user_board_defaults` executable by `anon` | WARN     | Revoke `EXECUTE` from `PUBLIC`/`anon` in a forward hardening migration when authorized       |
| `handle_new_user` executable via RPC roles        | WARN     | Trigger function; revoke broad `EXECUTE` if exposed via PostgREST                            |

These are **not** silently “fixed” in this staging prep (no migration rewrites; no Inc11). Track as P2 follow-ups after `db push` completes.

## Status this prep

Hosted app security verification **not executed** (no staging app URL). Code-level headers and local RLS covered by local gates + Inc 3–10 SQL suites. Advisor warnings above recorded for operator triage.
