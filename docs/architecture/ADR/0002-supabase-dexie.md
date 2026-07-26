# ADR 0002 — Supabase + Dexie

## Status

Accepted — 2026-07-26

## Context

Requirements include authenticated multi-device sync, private file storage for progress photos, Postgres relational data, and **offline** workout/meal logging.

## Decision

- **Supabase**: Auth, PostgreSQL, Storage, RLS as cloud system of record
- **Dexie**: IndexedDB wrapper for offline-first client data + outbox sync
- Server routes/edge for secrets (USDA API key, service role tasks)

## Consequences

**Positive:** Managed auth/storage; RLS colocated with data; Dexie is Apache-2.0 with mature versioning/transactions.

**Negative:** Must design idempotent sync and conflict rules; IndexedDB is not a security boundary; two schemas (Postgres + Dexie) to evolve together.

**Reject:** Offline-only with no cloud; cloud-only with no Dexie; copying AGPL offline stacks.

## References

- `OFFLINE_SYNC.md`, `SECURITY_AND_PRIVACY.md`
- https://dexie.org/docs/Tutorial/Design
- Supabase RLS + Storage access-control docs
