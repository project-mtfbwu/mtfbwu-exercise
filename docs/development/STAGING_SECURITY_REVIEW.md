# Staging security review

## Headers / transport (hosted)

| Check                     | Result  | Notes                           |
| ------------------------- | ------- | ------------------------------- |
| CSP                       | Pending | App middleware / headers module |
| HSTS                      | Pending | Host + app headers              |
| Frame restrictions        | Pending |                                 |
| Referrer policy           | Pending |                                 |
| Camera Permissions-Policy | Pending | self only                       |
| HTTPS only                | Pending | Needs live staging URL          |

## Data isolation

| Check                                 | Result                                               | Notes                                            |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| No public storage buckets             | Pass (schema)                                        | `progress-photos`, `nutrition-labels` private    |
| Cross-user RLS                        | Pass (hosted SQL suites Inc3–10 after privilege fix) | App two-user smoke still pending                 |
| Catalog / append-only privileges      | Pass                                                 | `20260804120000` privilege hardening             |
| Signed URL expiry                     | Pending                                              | Needs app + users                                |
| Service-role isolation                | Pass (RPC grants)                                    | `execute_account_domain_purge` service_role only |
| Account export isolation              | Pending                                              | Hosted smoke                                     |
| Deletion isolation                    | Pending                                              | Disposable user smoke                            |
| Safe auth redirects                   | Pending                                              | Needs Site URL                                   |
| Private response caching              | Pending                                              | Hosted app                                       |
| Rate-limit behavior                   | Pending                                              | Upstash                                          |
| No secrets in source maps / responses | Pending                                              | Hosted deploy                                    |
| Staging disallow public indexing      | Pending                                              | Prefer `noindex`                                 |

## Dependency / secret scan

| Check                          | Result                  |
| ------------------------------ | ----------------------- |
| `pnpm run audit` on checkpoint | Pass (local 2026-08-04) |
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

## Supabase advisors (staging project)

### Resolved

| Finding                                                      | Resolved by                                         |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `set_updated_at` mutable search_path                         | `20260803120000_staging_security_definer_hardening` |
| `ensure_user_board_defaults` executable by `anon`            | `20260803120000`                                    |
| `handle_new_user` broad EXECUTE                              | `20260803120000`                                    |
| `sync_personal_record_status` mutable search_path            | `20260804120000_staging_privilege_hardening`        |
| anon/authenticated EXECUTE on `execute_account_domain_purge` | `20260804120000`                                    |
| anon EXECUTE on `request_account_deletion`                   | `20260804120000`                                    |

### Remaining — expected and justified

| Finding                                              | Object                       | Justification                                                                   |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `authenticated_security_definer_function_executable` | `archive_rehab_plan`         | Intentional app RPC for owner rehab plan archive                                |
| `authenticated_security_definer_function_executable` | `ensure_user_board_defaults` | Intentional onboarding / board initialization RPC                               |
| `authenticated_security_definer_function_executable` | `request_account_deletion`   | Intentional authenticated deletion-request RPC; purge remains service_role-only |

No additional forward migration required for these intentional grants.

## Status

- **Staging database:** healthy (22 migrations; hosted Inc3–10 + privilege suites pass; advisors classified).
- **Staging overall:** **not healthy** until app hostname, Auth Site URL/redirects, Upstash, env/allowlist, and hosted smoke (including export/deletion) complete.
- Hosted app security headers / smoke **not executed** (no staging app URL).
