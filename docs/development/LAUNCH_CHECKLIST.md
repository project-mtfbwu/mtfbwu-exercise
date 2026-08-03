# Launch checklist

## Before private beta

- [ ] Automated gates green (typecheck, lint, format, unit, RLS Inc3–10, Playwright smoke, build, audit)
- [ ] Staging hosted project + env values configured
- [ ] `RATE_LIMIT_BACKEND=upstash` credentials configured on staging
- [ ] Hosted backup / PITR policy configured
- [ ] Manual browser/device smoke pass recorded in `INCREMENT_10_MANUAL_QA.md`
- [ ] Founder/legal skim of `/privacy` `/terms` `/support`
- [ ] Support contact active (`SUPPORT_EMAIL`)
- [ ] Private-beta allowlist populated if `PRIVATE_BETA_MODE=true`
- [ ] No production seed users

## Before public MVP (still blocked)

- [ ] Counsel review of legal pages
- [ ] Physical-device matrix (Safari/iPhone + camera)
- [ ] Hosted recovery drill
- [ ] Production monitoring DSN choice + config
- [ ] Production secrets, custom domain, auth redirect URLs
- [ ] Launch checklist approval

## Accepted beta limitations

- Chromium E2E ≠ full browser matrix
- ZIP export deferred (signed-link manifest shipped)
- Reminder delivery / AI import / wearables out of scope
- Monitoring adapter may remain no-op until DSN chosen
