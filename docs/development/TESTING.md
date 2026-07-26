# Testing

## Stack

- Vitest + jsdom
- Testing Library
- Coverage via `@vitest/coverage-v8`

## Commands

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## What Increment 1 covers

- Env Zod schemas
- Motion preference resolution (`full` / `reduced` / `off`)
- Outbox state transitions
- Shared `Button`
- Online status hook
- Today route smoke render
- Next.js `proxy` export + matcher smoke

## Conventions

- Deterministic — no network
- Prefer pure functions for sync logic
- Do not assert against generated reference image pixels

## Dependency audit

**Official CI/local gate:** `pnpm run audit`

Uses the pnpm 11 bulk advisories endpoint against `pnpm-lock.yaml` (see
`docs/development/PACKAGE_MANAGER.md`). Exit code reflects real advisories.

Bare `pnpm audit --prod` may still fail with `ERR_PNPM_AUDIT_BAD_RESPONSE` when
the registry returns naked gzip — that is not a vulnerability report.

### Audit ignore configuration

This repository has **no** `auditConfig.ignoreCves` and **no**
`auditConfig.ignoreGhsas`. If ignores are ever needed, pnpm 11 requires GHSA IDs
under `auditConfig.ignoreGhsas` only.
