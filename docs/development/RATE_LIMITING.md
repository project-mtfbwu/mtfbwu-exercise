# Rate limiting

## Backends

| `RATE_LIMIT_BACKEND` | Use                                    |
| -------------------- | -------------------------------------- |
| `memory`             | Local / single-instance only           |
| `none`               | Tests / CI                             |
| `upstash`            | Multi-instance production (Redis REST) |

## Upstash adapter

- Server-only `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Fixed-window via `INCR` + `EXPIRE NX` + `TTL` pipeline
- Injectable `fetch` for unit tests (no network in CI)
- Timeout ~1.5s; category-based fail-open / fail-closed

## Failure policy

| Category                                            | On provider failure                       |
| --------------------------------------------------- | ----------------------------------------- |
| Auth / account deletion / export / USDA materialize | fail closed                               |
| Ordinary nutrition search/barcode reads             | fail open (documented fallback to memory) |

Production with `RATE_LIMIT_BACKEND=memory` is rejected unless `RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION=true`.

## Privacy-safe keys

Keys hash email/IP/user id (`sha256` truncated) — raw email/IP is never persisted as the Redis key.

## Responses

HTTP 429 includes `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

## Readiness

`/api/readiness` reports `{ backend, configured, available }` without credentials.
