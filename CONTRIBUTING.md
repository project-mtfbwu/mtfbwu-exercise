# Contributing (MTFBWU)

## Rules of the road

1. Read `AGENTS.md` and `.cursor/rules/` before coding.
2. Follow `docs/architecture/BUILD_INCREMENTS.md` — do not skip ahead.
3. Do not copy AGPL/GPL application code (wger, openfoodfacts-server).
4. Keep templates/plans separate from performed sessions/logs.
5. Never commit `.env`, secrets, or service-role keys.
6. For UI: inspect `docs/design-references/` and pass `REFERENCE_COMPLIANCE_CHECKLIST.md`.

## Setup

See `docs/development/LOCAL_SETUP.md`.

## PR expectations

- Typecheck, lint, format, tests, and build must pass (CI).
- Prefer small, increment-scoped diffs.
- No drive-by refactors unrelated to the task.

## Motion preference naming

Production code uses `MotionPreference = "full" | "reduced" | "off"`.  
Older docs saying `disabled` map to **`off`**.
