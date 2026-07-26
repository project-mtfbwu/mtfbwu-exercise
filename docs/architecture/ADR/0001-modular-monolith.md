# ADR 0001 — Modular monolith

## Status

Accepted — 2026-07-26

## Context

MTFBWU spans many domains (nutrition, workouts, rehab, etc.) but is one product for one user identity, with a unified flat-lay UI and shared offline sync. Microservices would add operational cost without a team boundary need.

## Decision

Ship a **modular monolith**:

- One Next.js App Router application
- Domain modules with clear folder boundaries
- Shared kernel for auth, sync, design system, calendar aggregation
- Single Supabase project as backend

## Consequences

**Positive:** Shared transactions/types; one deploy; simpler RLS story; fits Increment plan.

**Negative:** Discipline required to avoid spaghetti; module boundaries enforced by convention/docs/rules, not network.

**Reject:** Polyrepo microservices; embedding AGPL apps (wger/OFF server) as the core.

## References

- `SYSTEM_ARCHITECTURE.md`
- workout-cool FSD inspiration (MIT) — study structure, don’t copy UI
