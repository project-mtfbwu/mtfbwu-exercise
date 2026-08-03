# Staging recovery drill

Local drill scripts remain in `INCREMENT_10_RECOVERY_DRILL.md` (`--target=local` only). This document covers **hosted staging**.

## Hosted backup capability (operator)

| Item                    | Staging notes                                    | Confirmed? |
| ----------------------- | ------------------------------------------------ | ---------- |
| Automatic backups       | Supabase plan-dependent                          | [ ]        |
| Backup frequency        | Record from dashboard / plan docs                | [ ]        |
| Retention               | Record from plan                                 | [ ]        |
| PITR availability       | Record for selected Supabase plan                | [ ]        |
| Isolated restore target | Separate project or documented restore procedure | [ ]        |

Do **not** restore over the active staging project unless explicitly designed and confirmed safe.

## Drill procedure (when environment supports it)

1. Create synthetic representative data (no real health subjects).
2. Record row counts and private object paths.
3. Create / export backup (or rely on PITR snapshot marker).
4. Mutate or remove sample data.
5. Restore into an **isolated** target.
6. Verify ownership, FKs, RLS, and private storage behavior.
7. Record exact result below.

## Drill result log

| Field                          | Value                         |
| ------------------------------ | ----------------------------- |
| Date                           |                               |
| Operator                       |                               |
| Source project                 | `oliwxuhmlqefarazilss`        |
| Restore target                 |                               |
| Row-count check                |                               |
| Storage path check             |                               |
| RLS / ownership check          |                               |
| Outcome                        | **Not executed** in this prep |
| Claim hosted recovery success? | **No**                        |

## Status this prep

Hosted recovery drill **not claimed and not executed**. Backup/PITR settings remain operator dashboard work.
