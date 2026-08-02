# Increment 9 — Manual QA

## Automated pass (CI / local verify)

| Check                                                                                                                                                              | Result                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Increment 3–9 SQL/RLS suites                                                                                                                                       | Pass when Supabase local is up       |
| `pnpm typecheck` / `lint` / `format:check` / `test` / `build` / `audit`                                                                                            | Pass on completion of this increment |
| Unit: hydration totals, meditation timer, sleep date cross-midnight, streaks, daily completion, tracker outbox, local-date TZ, month indicators, customize helpers | Pass                                 |

## Desktop browser pass

Run with `pnpm dev` against local Supabase + a signed-in user.

| Viewport | Surfaces                                                                                            | Status                           |
| -------- | --------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1440×900 | Hydration/Meditation/Sleep/Supplements/CustomTracker focus, `/calendar`, `/history`, profile totals | **Pending human browser review** |
| 768×1024 | Same                                                                                                | Pending                          |
| 390×844  | Same — confirm no horizontal overflow, reachable controls                                           | Pending                          |

Checklist when reviewing:

- [ ] Board stays visible behind lifted focus cards
- [ ] Hydration presets + custom amount update board label
- [ ] Meditation timer pause/resume; manual entry fallback
- [ ] Meditation timer recovery after refresh (same day); expired timer confirm/adjust/discard
- [ ] Meditation `completed_queued` shows sync status; clears after successful sync
- [ ] Sleep cross-midnight logs on **bedtime date** in calendar; session list Remove soft-deletes
- [ ] Supplement checklist shows safety disclaimer; taken/skipped/partial; Clear removes intake
- [ ] Custom tracker event appears in day summary
- [ ] Calendar month indicators + day detail
- [ ] History pagination cursor works
- [ ] Profile reminder preferences: list/add/edit/disable; deferred-delivery copy (no Notification API / no fake push)
- [ ] Offline hydration queues and syncs on reconnect
- [ ] Offline sleep/supplements/custom tracker/profile prefs queue and sync
- [ ] Focus panels show OfflineRecordStatusBadge (local draft / queued / syncing / synced / failed / cleanup warning)
- [ ] Daily overview sync health strip shows failed/cleanup without changing module totals
- [ ] Post-sync draft cleanup removes queued drafts; cleanup warnings appear in sync banner when cleanup fails
- [ ] Customize: cancel layout, preview card, target confirm checkbox, archive tracker
- [ ] Focus restoration after closing panels
- [ ] `prefers-reduced-motion` / animation mode off still usable

## Remaining deferred

- Reminder **delivery** (push/email) — preferences only in Increment 9
- Human browser/device QA (tables above remain unchecked until reviewed)

## Responsive simulation pass

Use browser DevTools for 1440×900, 768×1024, 390×844:

- Desktop simulation: _not run in agent session_
- Tablet simulation: _not run in agent session_
- Mobile simulation: _not run in agent session_

## Physical-device checks (still untested)

- [ ] Meditation timer background tab behavior
- [ ] Touch targets on hydration presets
- [ ] IndexedDB quota with many queued tracker drafts

Visual review notes: [INCREMENT_9_VISUAL_REVIEW.md](../design-system/INCREMENT_9_VISUAL_REVIEW.md).
