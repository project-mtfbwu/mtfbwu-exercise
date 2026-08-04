# Staging deployment log

Operator-facing record. Update rows when actions complete. No secrets.

## Identity

| Item             | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Repo             | `project-mtfbwu/mtfbwu-exercise`                                             |
| Green checkpoint | `9d5442bfc317cf3c6f087cbfc6a371f786083819` (docs) / eng `d1c9104…`           |
| Release version  | `0.1.0-beta.1`                                                               |
| App env          | `preview`                                                                    |
| Supabase project | `mtfbwu-staging` / `oliwxuhmlqefarazilss` / `us-east-1`                      |
| Supabase URL     | `https://oliwxuhmlqefarazilss.supabase.co`                                   |
| Staging app URL  | _none — hostname not selected/deployed_                                      |
| Host platform    | Vercel documented — **CLI not installed** in this agent shell                |
| Upstash          | **not provisioned**                                                          |
| Private beta     | Mode planned `true` — allowlist **not configured**                           |
| Staging DB       | **Healthy** (migrations + hosted SQL/RLS green)                              |
| Staging overall  | **Not healthy** — app host / Auth URLs / Upstash / allowlist / smoke pending |

## Timeline

| When (UTC)    | Action                                                         | Result                                                               |
| ------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| 2026-08-03    | Created hosted Supabase project `mtfbwu-staging`               | OK                                                                   |
| 2026-08-03    | Docs commit `9d5442b` + CI green                               | OK                                                                   |
| 2026-08-03/04 | Operator completed hosted `db push` Inc3–10 + security-definer | OK — 21 migrations on remote                                         |
| 2026-08-04    | Hosted Inc 5–9 failed on excess table privileges               | P1 recorded                                                          |
| 2026-08-04    | Local verify of privilege hardening (reset + Inc3–10 + gates)  | Green (610 tests; build; audit)                                      |
| 2026-08-04    | `db push` `20260804120000_staging_privilege_hardening.sql`     | Applied on `oliwxuhmlqefarazilss`; local/remote histories match (22) |
| 2026-08-04    | Hosted re-verify Inc5–10 + privilege + security-definer        | **All PASS**                                                         |
| 2026-08-04    | Security advisors re-check                                     | Only intentional authenticated SECURITY DEFINER RPCs remain          |
| 2026-08-04    | Staging hostname / Auth redirects / Vercel / Upstash / smoke   | **Not done** — blocked on operator inputs                            |

## Migration checklist

| Migration file                             | Hosted  | Notes                    |
| ------------------------------------------ | ------- | ------------------------ |
| `…increment3_auth_board_daily.sql`         | Applied | version `20260726120000` |
| `…increment4_nutrition.sql`                | Applied |                          |
| `…increment4_curated_foods_seed.sql`       | Applied |                          |
| `…increment4_nutrition_align.sql`          | Applied |                          |
| `…increment4_barcode_provenance.sql`       | Applied |                          |
| `…increment5_label_captures.sql`           | Applied |                          |
| `…increment6_workout_engine.sql`           | Applied |                          |
| `…increment6_exercise_catalog_seed.sql`    | Applied |                          |
| `…increment6_workout_align.sql`            | Applied |                          |
| `…increment6_catalog_expansion.sql`        | Applied |                          |
| `…increment6_plan_editor_align.sql`        | Applied |                          |
| `…increment7_rehab_engine.sql`             | Applied |                          |
| `…increment7_rehab_catalog_seed.sql`       | Applied |                          |
| `…increment7_rehab_align.sql`              | Applied |                          |
| `…increment8_progress_tracking.sql`        | Applied |                          |
| `…increment8_measurement_catalog_seed.sql` | Applied |                          |
| `…increment9_daily_system.sql`             | Applied |                          |
| `…increment9_tracker_catalog_seed.sql`     | Applied |                          |
| `…increment10_production_readiness.sql`    | Applied |                          |
| `…increment10_lifecycle_hardening.sql`     | Applied |                          |
| `…staging_security_definer_hardening.sql`  | Applied | `20260803120000`         |
| `…staging_privilege_hardening.sql`         | Applied | `20260804120000`         |

**Remote applied count:** 22. **Local/remote histories:** match exactly.

## Hosted type validation

| Check                            | Result                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Types generated vs staging       | `tmp/staging-database.types.ts` (linked gen)                                                     |
| Critical symbols present         | `cleanup_stage`, `file_count`, progress/nutrition/account tables — yes                           |
| Diff vs repo `database.types.ts` | Table set matches (87); raw text differs (formatting / PostgrestVersion) — **not a schema miss** |

## Hosted SQL / RLS verification (Inc 3–10)

| Suite                      | Result | Notes                                  |
| -------------------------- | ------ | -------------------------------------- |
| Increment 3                | PASS   | Prior + unchanged                      |
| Increment 4                | PASS   | Prior + unchanged                      |
| Increment 5                | PASS   | After privilege hardening              |
| Increment 6                | PASS   | After privilege hardening              |
| Increment 7                | PASS   | After privilege hardening              |
| Increment 8                | PASS   | After privilege hardening              |
| Increment 9                | PASS   | After privilege hardening              |
| Increment 10               | PASS   | Re-confirmed after privilege hardening |
| Security-definer hardening | PASS   | Re-confirmed                           |
| Privilege hardening        | PASS   | Catalogs / append-only / RPC grants    |

## Advisors (security) after `20260804120000`

| Finding                                                      | Status                     | Notes                        |
| ------------------------------------------------------------ | -------------------------- | ---------------------------- |
| Inc3 `set_updated_at` / board defaults / handle_new_user     | **Resolved**               | Via `20260803120000`         |
| `sync_personal_record_status` mutable search_path            | **Resolved**               | Via `20260804120000`         |
| anon/authenticated execute on `execute_account_domain_purge` | **Resolved**               | service_role only            |
| anon execute on `request_account_deletion`                   | **Resolved**               |                              |
| authenticated execute on `archive_rehab_plan`                | **Expected / intentional** | App rehab archive RPC        |
| authenticated execute on `ensure_user_board_defaults`        | **Expected / intentional** | Onboarding / board init RPC  |
| authenticated execute on `request_account_deletion`          | **Expected / intentional** | Account deletion request RPC |

No further forward migration required for the current advisor list.

## Auth / storage / env

| Check                            | Result                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site URL + redirects             | Pending — no staging hostname                                                                                                                                  |
| Email confirm / password reset   | Pending                                                                                                                                                        |
| Private buckets + policies       | Buckets `progress-photos` / `nutrition-labels` both `public: false`; own-path CRUD policies present. Behavioral signed-URL / cross-user tests need app + users |
| Env vars on host                 | Pending                                                                                                                                                        |
| Private-beta allowlist live      | Pending                                                                                                                                                        |
| Upstash readiness `configured`   | Pending                                                                                                                                                        |
| Vercel staging project           | Pending — `vercel` CLI not available here                                                                                                                      |
| `/api/health` / `/api/readiness` | Pending — no staging URL                                                                                                                                       |
| Hosted smoke / export / deletion | Pending                                                                                                                                                        |
| Backup / PITR                    | **Unconfirmed** — dashboard operator check                                                                                                                     |

## Explicit non-actions

- No production deploy
- No release tag
- No public signup enablement
- No Increment 11 work
- No automatic commit from this privilege-hardening apply
- No app deploy / Vercel / Upstash configuration in this step
