# Account deletion

Owner-initiated deletion from Settings with typed `DELETE` confirmation.

## Orchestrator stages

Implemented in `src/modules/account/deletion-orchestrator.ts` and wired by `requestAccountDeletionAction`:

1. Verify authenticated user + confirmation + rate limit (fail-closed)
2. Mark deletion requested (`request_account_deletion` RPC)
3. Enumerate owned private storage (recursive list + metadata paths)
4. Delete private objects (progress photos, nutrition labels, avatars bucket if present)
5. Purge domain rows (`execute_account_domain_purge`)
6. Revoke auth user (service role `deleteUser`)
7. Persist `cleanup_stage` / `cleanup_detail`; never report success early
8. Client Dexie wipe best-effort after server success

## Safety

- Owner-prefix only; cross-user paths rejected
- No broad bucket wipe
- Security-definer RPCs use fixed `search_path = public`
- Already-missing storage objects treated as success
- Partial storage failure stops before domain purge / auth revoke (retryable)
- Idempotent re-run after failure

## Shared fixture protection (E2E)

Smoke tests assert the delete button stays disabled for incorrect confirmation text and do **not** click delete on the shared completed fixture account.
