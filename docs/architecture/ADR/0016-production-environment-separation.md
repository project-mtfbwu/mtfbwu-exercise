# ADR 0016 — Production environment separation

Status: Accepted

local / preview / production use separate Supabase projects and secrets. Production rejects localhost APP_URL. Service role remains server-only.
