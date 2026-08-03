# Increment 10 — Production readiness

Master doc for production readiness, security hardening, account lifecycle, and launch prep.

Version target: `0.1.0-beta.1`

## Delivered in this increment

- Environment matrix (local / preview / production)
- Zod env validation + instrumentation fail-closed
- Security headers (camera self, CSP workers, COOP)
- Rate limiting: memory / none / **Upstash Redis REST** adapter (mocked in unit tests)
- `/api/health` and `/api/readiness` (includes rate-limit backend status, no secrets)
- Logging redaction + error-monitoring no-op adapter
- Analytics consent foundation (off by default)
- Account export JSON **v2** with short-lived signed private-file links
- Account deletion orchestrator (enumerate → delete storage → domain purge → revoke auth)
- `/privacy` `/terms` `/support` `/about`
- Expanded onboarding + `onboarding_version`
- Feature flags + private-beta allowlist hooks
- Playwright **smoke** E2E (Chromium) + extended domain suite
- jest-axe / @axe-core/playwright automated a11y checks (contrast decorative rules relaxed)
- Local backup/restore drill scripts + EXPLAIN review doc
- Launch docs + ADRs 0015–0017

## E2E coverage and exclusions

**Smoke (CI):** auth login/logout/session, safe `next` redirect, onboarding resume, account export download + deletion confirm gate, a11y/responsive viewports.

**Extended (optional):** seeded nutrition/workout/rehab/progress/trackers/calendar/offline paths.

**Not automated:** Safari/iPhone matrix, physical camera, real VoiceOver/TalkBack, full Playwright browser matrix. Chromium pass ≠ complete device QA.

## Private-file export

Approach **B**: signed-link manifest (`privateFiles` in export JSON). ZIP packaging deferred. Soft-deleted and cross-user paths excluded. Partial signing failures recorded honestly.

## Deletion orchestration stages

`requested` → `enumerate_storage` → `delete_storage` → `purge_domain` → `revoke_auth` → `completed` (or `failed` with retryable detail). Success is never reported before mandatory stages finish. Dexie wipe remains client best-effort after server success.

## Shared rate-limit adapter

`RATE_LIMIT_BACKEND=upstash` uses REST pipeline; credentials server-only. Production must not silently use memory (unless `RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION=true` for single-instance). Auth/account/expensive routes fail closed on provider failure; ordinary nutrition reads may fail open.

## Readiness classification

| Target       | Status                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local QA     | Ready when automated gates pass                                                                                                                                                   |
| Staging      | Hosted project `mtfbwu-staging` created; remaining migrations + app host + Upstash + env still required (`STAGING_SETUP.md`)                                                      |
| Private beta | **Not ready** until staging deploy, manual browser/device smoke, founder/legal skim of legal pages, hosted backup policy, shared rate limiting configured, support contact active |
| Public MVP   | **Blocked** until counsel review, physical-device matrix, hosted recovery drill, monitoring choice, production secrets/domain/auth redirects, launch checklist approval           |

## Deferred / accepted beta limitations

- Physical browser/device QA still pending human pass
- Hosted staging/production projects require operator setup
- Legal pages require lawyer review before public launch
- Reminder delivery, AI import review, wearables remain out of scope
- ZIP binary export packaging deferred

## Related docs

`ENVIRONMENTS.md`, `ACCOUNT_EXPORT.md`, `ACCOUNT_DELETION.md`, `SECURITY_HEADERS.md`, `RATE_LIMITING.md`, `LAUNCH_CHECKLIST.md`, `INCREMENT_10_RECOVERY_DRILL.md`, `DATABASE_PERFORMANCE_REVIEW.md`, ADRs 0015–0017.
