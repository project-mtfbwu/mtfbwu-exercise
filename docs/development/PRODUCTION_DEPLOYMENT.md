# Production deployment

Intended: Next.js-compatible host (e.g. Vercel) + hosted Supabase.

1. Create separate preview and production Supabase projects
2. Set env from `.env.example` (no localhost APP_URL in production)
3. Set `RATE_LIMIT_BACKEND=upstash` + Upstash REST credentials for multi-instance
4. Configure Auth redirect allowlists per environment
5. Run migrations via CI/CLI against the target project after backup
6. Smoke `/api/health` and `/api/readiness` (confirm rate-limit `configured: true`)
7. Verify camera Permissions-Policy and signed storage
8. Confirm hosted backup/PITR policy before private beta

Do not deploy production without explicit approval and green CI.
Local automated gates alone do **not** make the app publicly launch-ready.
