# Increment 10 test plan

## Automated

| Suite                                | Command                                | CI                     |
| ------------------------------------ | -------------------------------------- | ---------------------- |
| Unit/integration (Vitest)            | `pnpm test`                            | yes                    |
| Security headers unit                | included in `pnpm test`                | yes                    |
| Account export/deletion unit         | included in `pnpm test`                | yes                    |
| Rate-limit Upstash contract (mocked) | included in `pnpm test`                | yes                    |
| jest-axe account panel               | included in `pnpm test`                | yes                    |
| SQL RLS Inc 3–10                     | CI supabase job                        | yes                    |
| Playwright smoke (Chromium)          | `pnpm test:e2e:smoke`                  | yes                    |
| Playwright extended                  | `pnpm test:e2e:extended`               | optional               |
| Axe + viewport smoke                 | Playwright smoke                       | yes                    |
| Backup/restore drill                 | `scripts/*-local.mjs`                  | local / optional smoke |
| EXPLAIN review                       | `scripts/explain-critical-queries.mjs` | local                  |

## E2E fixtures

- Isolated synthetic users (`e2e-*.example.test`)
- No live USDA/OFF calls in E2E
- No personal health data
- Screenshots/traces only on failure
- Shared completed user is never deleted by smoke tests

## Manual (pending)

See `INCREMENT_10_MANUAL_QA.md` — physical devices, Safari, camera, screen readers.
