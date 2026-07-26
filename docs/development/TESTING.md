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

**Official audit:** `pnpm audit --prod` (also the CI step).

A manual npm registry security API probe is **not** equivalent to `pnpm audit` (different dependency graph resolution and advisory coverage). Do not treat a probe as a substitute.

### Local Windows limitation

On some Windows environments, `pnpm audit --prod` fails while parsing the registry response as JSON when the body is gzip-compressed, e.g.:

```text
ERROR  Unexpected token '', "... is not valid JSON
```

That is an **environment / client limitation**, not a clean audit result. After the first push, **GitHub Actions on ubuntu-latest** is the source of truth for the production audit.
