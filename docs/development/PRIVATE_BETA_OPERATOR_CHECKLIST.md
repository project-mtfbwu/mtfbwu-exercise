# Private beta operator checklist

Goal: controlled tester access on staging. Not public MVP.

## Engineering prerequisites

- [x] Increments 0–10 closed; CI green on checkpoint `d1c9104…`
- [x] Hosted staging Supabase migrations Inc 3–10 complete (`oliwxuhmlqefarazilss`)
- [x] Privilege hardening `20260804120000` applied; hosted Inc 3–10 + privilege SQL/RLS pass
- [ ] Staging app deployed on non-prod hostname
- [ ] Env checklist complete (`STAGING_ENV_CHECKLIST.md`)
- [ ] `PRIVATE_BETA_MODE=true`
- [ ] `PRIVATE_BETA_ALLOWLIST` populated with synthetic / controlled emails
- [ ] Upstash staging backend configured; readiness shows configured
- [ ] Hosted smoke auth + allowlist tests pass (`STAGING_SMOKE_TEST.md`)

## Allowlist verification

| Check                                      | Result                                     |
| ------------------------------------------ | ------------------------------------------ |
| Allowlisted user can sign up or sign in    |                                            |
| Non-allowlisted signup blocked             |                                            |
| Existing allowlisted users remain usable   |                                            |
| Restriction is server-side (`actions.ts`)  | Code present                               |
| Client-side bypass does not work           |                                            |
| Error copy understandable                  | Copy: “Signup is closed for private beta…” |
| Public signup later without schema changes | Yes — flip `PRIVATE_BETA_MODE` / allowlist |

Do **not** build an admin dashboard for allowlist management in this phase.

## Support / legal operator setup

| Item                                  | Status                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| Support email (`SUPPORT_EMAIL`)       | Pending approved staging value                                        |
| Privacy contact                       | Pending                                                               |
| Data export / deletion contact        | Pending (may equal support)                                           |
| Company / operator name               | Package metadata: Parvat and Shifu Learning Studio LLP / Anjay Nilmek |
| Jurisdiction placeholder              | Only when approved — do not invent                                    |
| `/privacy` `/terms` marked draft/beta | Keep until counsel review                                             |
| Counsel approval claimed?             | **No**                                                                |

### Review ladder

- [ ] Founder review of `/privacy` `/terms` `/support` `/about`
- [ ] Legal skim (non-counsel)
- [ ] Final counsel review before **public** MVP (not required to start private beta if draft labeling is clear)
- [ ] Support inbox receive/reply test
- [ ] Data-request workflow test (export + deletion path with disposable user)

## Go / no-go

| Question               | Answer this prep                                                               |
| ---------------------- | ------------------------------------------------------------------------------ |
| Staging healthy?       | **No** — DB healthy, but no app host / Auth URLs / Upstash / allowlist / smoke |
| Private beta ready?    | **No** — blocked                                                               |
| Public signup enabled? | **No** (must stay off)                                                         |

## Related

`PRIVATE_BETA.md`, `STAGING_SETUP.md`, `LAUNCH_CHECKLIST.md`
