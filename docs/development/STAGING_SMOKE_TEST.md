# Staging smoke test

Run **after** staging app URL is live, migrations complete, env set, Upstash configured, and private-beta allowlist populated. Record actual results; do not mark untested items as passed.

Staging URL: _pending_  
Build SHA expected: `d1c9104226a8316b6fa7168d6f87d1bfef75a626` (or later approved SHA)  
Release: `0.1.0-beta.1`

## Public / system

| Check                                     | Result | Notes                 |
| ----------------------------------------- | ------ | --------------------- |
| Staging URL loads                         |        |                       |
| HTTPS valid                               |        |                       |
| Security headers present                  |        | See security review   |
| `GET /api/health` healthy                 |        |                       |
| `GET /api/readiness` ready                |        | rate-limit configured |
| Release version correct                   |        |                       |
| Build SHA correct                         |        |                       |
| No secrets in health/readiness/HTML       |        |                       |
| Robots / indexing appropriate for staging |        | Prefer noindex        |

## Auth

| Check                          | Result | Notes                    |
| ------------------------------ | ------ | ------------------------ |
| Allowlisted signup/signin      |        |                          |
| Non-allowlisted signup blocked |        | Server message           |
| Email confirmation             |        |                          |
| Password reset                 |        |                          |
| Safe redirects                 |        | External `next` rejected |
| Logout                         |        |                          |
| Session persistence            |        |                          |

## Onboarding

| Check                         | Result | Notes |
| ----------------------------- | ------ | ----- |
| Complete onboarding           |        |       |
| Resume interrupted onboarding |        |       |
| Module selection              |        |       |
| Privacy step                  |        |       |

## Core product

| Area                  | Result | Notes |
| --------------------- | ------ | ----- |
| Today board           |        |       |
| Nutrition log         |        |       |
| Workout session       |        |       |
| Rehab session         |        |       |
| Weight / measurement  |        |       |
| Progress photo upload |        |       |
| Hydration             |        |       |
| Meditation recovery   |        |       |
| Sleep                 |        |       |
| Supplements           |        |       |
| Custom tracker        |        |       |
| Calendar              |        |       |
| History               |        |       |
| Profile preferences   |        |       |

## Offline

| Check                                  | Result | Notes |
| -------------------------------------- | ------ | ----- |
| Queue supported mutation               |        |       |
| Reconnect + sync                       |        |       |
| Failed / retry state (where practical) |        |       |

## Account

| Check                                    | Result | Notes |
| ---------------------------------------- | ------ | ----- |
| Export JSON                              |        |       |
| Private-file signed links                |        |       |
| Link expiry                              |        |       |
| Typed deletion confirmation              |        |       |
| Deletion on disposable staging user only |        |       |
| Storage + DB cleanup                     |        |       |
| Session revocation                       |        |       |

## Rate limiting

| Check                      | Result | Notes |
| -------------------------- | ------ | ----- |
| Safe rate-limit trigger    |        |       |
| `Retry-After` present      |        |       |
| Readiness remains truthful |        |       |
| No silent memory fallback  |        |       |

## Outcome this prep

Hosted smoke **not executed** — staging app hostname and full migrations / Upstash / env still operator-blocked.
