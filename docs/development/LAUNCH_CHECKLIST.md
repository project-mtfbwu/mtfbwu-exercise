# Launch checklist

## Before private beta

- [x] Automated gates green (typecheck, lint, format, unit, RLS Inc3–10, Playwright smoke, build, audit) — local 2026-08-03 on `d1c9104…`
- [ ] Staging hosted project migrations Inc 3–10 complete (`oliwxuhmlqefarazilss`)
- [ ] Staging app URL + env values configured (`STAGING_ENV_CHECKLIST.md`)
- [ ] `RATE_LIMIT_BACKEND=upstash` credentials configured on staging
- [ ] Hosted backup / PITR policy documented for staging plan
- [ ] Manual browser/device smoke recorded (`STAGING_MANUAL_QA.md` / `INCREMENT_10_MANUAL_QA.md`)
- [ ] Founder/legal skim of `/privacy` `/terms` `/support`
- [ ] Support contact active (`SUPPORT_EMAIL`)
- [ ] Private-beta allowlist populated (`PRIVATE_BETA_MODE=true`)
- [ ] No production seed users on staging
- [ ] Hosted staging smoke pass (`STAGING_SMOKE_TEST.md`)
- [ ] Monitoring provider decision (DSN or accepted blocker)

## Before public MVP (still blocked)

- [ ] Counsel review of legal pages
- [ ] Physical-device matrix (Safari/iPhone + camera)
- [ ] Hosted recovery drill (`STAGING_RECOVERY_DRILL.md`)
- [ ] Production monitoring DSN choice + config
- [ ] Production secrets, custom domain, auth redirect URLs
- [ ] Launch checklist approval
- [ ] Public signup enablement (explicit; do not flip during private beta)

## Accepted beta limitations

- Chromium E2E ≠ full browser matrix
- ZIP export deferred (signed-link manifest shipped)
- Reminder delivery / AI import / wearables out of scope
- Monitoring adapter may remain no-op until DSN chosen

## Status snapshot (2026-08-03 staging prep)

| Target       | Status                                                   |
| ------------ | -------------------------------------------------------- |
| Local QA     | Ready (gates green)                                      |
| Staging      | Project created; migrations incomplete; app host pending |
| Private beta | **Not ready**                                            |
| Public MVP   | **Blocked**                                              |

See `STAGING_SETUP.md`, `PRIVATE_BETA_OPERATOR_CHECKLIST.md`, `STAGING_DEPLOYMENT_LOG.md`.
