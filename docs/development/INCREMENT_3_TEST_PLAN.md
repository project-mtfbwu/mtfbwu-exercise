# Increment 3 test plan

## Automated (CI / local)

| Area               | Coverage                                                                           |
| ------------------ | ---------------------------------------------------------------------------------- |
| Auth validation    | `src/shared/auth/auth.test.ts` — schemas, protected-path helpers, conflict markers |
| Local dates        | `src/shared/utils/local-date.test.ts`                                              |
| Outbox transitions | `src/shared/offline/outbox.test.ts`, `board-outbox.test.ts`                        |
| Board UI           | `today-board.test.tsx` — cards, focus, Save/Cancel status, empty modules           |
| Onboarding         | `onboarding-wizard.test.tsx` — recommended modules, optional toggle                |
| Foundation         | proxy, motion, primitives (Increment 1–2)                                          |

## Database / RLS (requires Docker + `npx supabase start`)

```bash
npx supabase db reset
# Optional: add pgTAP later under supabase/tests
```

Manual checklist:

1. User A cannot `select` User B profile / modules / layouts / daily rows
2. `module_definitions` readable when authenticated; inserts/updates fail for authenticated role
3. `dashboard_cards` only via own layout
4. `daily_module_statuses` only via own `daily_records` + own `user_modules`
5. Re-run `ensure_user_board_defaults` twice → no duplicate modules/layouts/cards
6. `bump_dashboard_layout_version` with stale version fails
7. `apply_daily_module_status` refuses completed → not_started

## Manual UI

- [ ] Unauthenticated `/today` → login with `next`
- [ ] Sign up → onboarding → Today
- [ ] Customize: keyboard up/down, save, reset, variant change
- [ ] Date prev/next; next disabled at today; future clamped
- [ ] Offline: disable network → status Save queues → banner → reconnect → Retry sync
- [ ] Conflict: two tabs reorder; second save shows conflict (no silent overwrite)
- [ ] Sign out clears Dexie; session expired messaging on mutations

## Accessibility

- [ ] Auth/onboarding labels + error announcements
- [ ] Customize controls keyboard reachable
- [ ] Focus trap still works on Today
