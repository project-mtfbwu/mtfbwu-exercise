# Staging deployment log

Operator-facing record. Update rows when actions complete. No secrets.

## Identity

| Item             | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| Repo             | `project-mtfbwu/mtfbwu-exercise`                        |
| Green checkpoint | `d1c9104226a8316b6fa7168d6f87d1bfef75a626`              |
| Release version  | `0.1.0-beta.1`                                          |
| App env          | `preview`                                               |
| Supabase project | `mtfbwu-staging` / `oliwxuhmlqefarazilss` / `us-east-1` |
| Supabase URL     | `https://oliwxuhmlqefarazilss.supabase.co`              |
| Staging app URL  | _pending operator hostname_                             |
| Host platform    | Vercel (documented) — _not yet connected in this prep_  |
| Upstash          | _pending operator create_                               |
| Private beta     | Mode planned `true` — allowlist _pending_               |

## Timeline

| When (UTC)        | Action                                                                                                             | Result                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 2026-08-03 ~03:42 | Created hosted Supabase project `mtfbwu-staging`                                                                   | OK                                               |
| 2026-08-03        | Applied MCP migration `increment3_auth_board_daily`                                                                | OK                                               |
| 2026-08-03        | Attempted `increment4_nutrition_align` before nutrition base                                                       | Failed (expected); not applied                   |
| 2026-08-03        | Remaining Inc 4–10 migrations                                                                                      | **Blocked** — needs `supabase login` + `db push` |
| 2026-08-03        | Local baseline (install, db reset, RLS 3–10, types, typecheck, lint, format, unit, build, Playwright smoke, audit) | OK (see note)                                    |
| 2026-08-03        | Vercel staging project + domain                                                                                    | Not done                                         |
| 2026-08-03        | Upstash staging Redis                                                                                              | Not done                                         |
| 2026-08-03        | Hosted smoke / recovery drill                                                                                      | Not executed                                     |

### Local baseline note

First Playwright attempt in the combined script failed because auth admin user creation raced after a long session; re-run with live local Supabase: **10/10 smoke passed**. Supabase stopped afterward.

## Migration checklist

| Migration file                             | Hosted                                           | Notes                               |
| ------------------------------------------ | ------------------------------------------------ | ----------------------------------- |
| `…increment3_auth_board_daily.sql`         | Partial (MCP name `increment3_auth_board_daily`) | Version stamp differs from filename |
| `…increment4_nutrition.sql`                | Pending                                          |                                     |
| `…increment4_curated_foods_seed.sql`       | Pending                                          |                                     |
| `…increment4_nutrition_align.sql`          | Pending                                          |                                     |
| `…increment4_barcode_provenance.sql`       | Pending                                          |                                     |
| `…increment5_label_captures.sql`           | Pending                                          |                                     |
| `…increment6_workout_engine.sql`           | Pending                                          |                                     |
| `…increment6_exercise_catalog_seed.sql`    | Pending                                          |                                     |
| `…increment6_workout_align.sql`            | Pending                                          |                                     |
| `…increment6_catalog_expansion.sql`        | Pending                                          |                                     |
| `…increment6_plan_editor_align.sql`        | Pending                                          |                                     |
| `…increment7_rehab_engine.sql`             | Pending                                          |                                     |
| `…increment7_rehab_catalog_seed.sql`       | Pending                                          |                                     |
| `…increment7_rehab_align.sql`              | Pending                                          |                                     |
| `…increment8_progress_tracking.sql`        | Pending                                          |                                     |
| `…increment8_measurement_catalog_seed.sql` | Pending                                          |                                     |
| `…increment9_daily_system.sql`             | Pending                                          |                                     |
| `…increment9_tracker_catalog_seed.sql`     | Pending                                          |                                     |
| `…increment10_production_readiness.sql`    | Pending                                          |                                     |
| `…increment10_lifecycle_hardening.sql`     | Pending                                          |                                     |

After full push, confirm both Increment 10 migrations present and regenerate types.

## Hosted type validation

| Check                            | Result  |
| -------------------------------- | ------- |
| Types generated vs staging       | Pending |
| Diff vs repo `database.types.ts` | Pending |

## Auth / storage / env

| Check                          | Result                           |
| ------------------------------ | -------------------------------- |
| Site URL + redirects           | Pending                          |
| Email confirm / password reset | Pending                          |
| Private buckets + policies     | Pending (need Inc5/8 migrations) |
| Env vars on host               | Pending                          |
| Private-beta allowlist live    | Pending                          |
| Upstash readiness `configured` | Pending                          |

## Explicit non-actions

- No production deploy
- No release tag
- No public signup enablement
- No Increment 11 work
- No commit/push from this prep unless separately requested
