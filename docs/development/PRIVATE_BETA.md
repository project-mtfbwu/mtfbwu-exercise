# Private beta

`PRIVATE_BETA_MODE=true` + `PRIVATE_BETA_ALLOWLIST=email1,email2`.

Enforcement is **server-side** in the signup action via `isPrivateBetaSignupAllowed` (`src/shared/config/feature-flags.ts`). Non-allowlisted signup returns a clear closed-beta message. Empty allowlist with mode on blocks all signups.

Public signup later: set `PRIVATE_BETA_MODE=false` (or clear mode) — no schema migration required.

Operator runbook: `PRIVATE_BETA_OPERATOR_CHECKLIST.md`
Staging wiring: `STAGING_SETUP.md`
