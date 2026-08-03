# Performance budgets

## Targets (private beta)

| Surface                    | Budget                                | Notes                                             |
| -------------------------- | ------------------------------------- | ------------------------------------------------- |
| `/today` first interactive | Prefer < 3s on mid laptop / decent 4G | Demo data + live fetches; no full history preload |
| JS main bundle (app)       | Watch regressions in PR review        | Formal CI size budget deferred                    |
| OCR / barcode              | Dynamic import only                   | Never on critical Today path                      |
| Daily overview             | Bounded `Promise.all`                 | Avoid N+1 per module                              |

## Database

- Owner-scoped indexes already on high-churn tables (meals, sessions, trackers, photos).
- Increment 10: `account_deletion_requests(user_id)`, `account_export_requests(user_id, created_at desc)`.
- Formal `EXPLAIN (ANALYZE)` pass on production-like volumes: run before public MVP; document outliers in PR notes.

## Accepted beta limitations

- No Lighthouse CI gate.
- In-memory rate limiter is not a performance control for multi-instance; use Upstash when scaling.
- Bundle analyzer optional (`@next/bundle-analyzer`) when investigating regressions — not required for Inc10 close.
