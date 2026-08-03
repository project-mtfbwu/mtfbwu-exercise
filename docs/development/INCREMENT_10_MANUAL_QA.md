# Increment 10 manual QA

| Area                                      | Status                                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Automated gates                           | Local / CI green at `d1c9104…` (2026-08-03)                         |
| Desktop Chromium smoke (Playwright)       | Automated local pass (10/10)                                        |
| Desktop Safari                            | Pending human                                                       |
| iPhone / Android                          | Pending human                                                       |
| Physical camera (barcode + progress)      | Pending human                                                       |
| VoiceOver / TalkBack                      | Pending human                                                       |
| Export download + signed links expiry     | Partial automated; human spot-check pending                         |
| Deletion end-to-end on disposable account | Pending human (do not use shared fixtures)                          |
| Hosted staging deploy                     | Project created; migrations/app host pending — see `STAGING_*` docs |

Record human results in `STAGING_MANUAL_QA.md` when staging URL exists.
