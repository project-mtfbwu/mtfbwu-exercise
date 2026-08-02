# Supplement tracking

Increment 9 supplements let users maintain a personal checklist and mark daily intake.

## Safety language (required in UI)

Copy lives in `src/modules/supplements/safety.ts`:

- **Disclaimer:** "Supplement logging is for personal tracking only. MTFBWU does not provide medical advice."
- **Not dosage advice:** Recorded amounts are user notes — not recommendations or prescriptions.
- **Reminder deferred:** Schedule persists; push/email delivery ships in a later increment.

Do not add dosage recommendations, drug interaction warnings presented as authoritative, or clinical claims.

## Data model

- **`supplement_definitions`** — system catalog (seeded)
- **`user_supplements`** — catalog item or `custom_name`
- **`supplement_intakes`** — per-day `taken` | `skipped` | `partial`, optional amount/note

## Module

`src/modules/supplements/` — CRUD, day checklist loader, intake actions.

## UI

- **Supplements focus** — today's checklist with taken/skipped/partial; **Clear** removes intake (soft-delete)
- Profile totals + safety disclaimer

## Offline

Dexie `supplementIntakeDrafts` (v9) + `userSupplementDrafts` (v10) + tracker outbox. Intake soft-delete via `buildSupplementIntakeDeleteWrites`. Replay order: `user_supplements` before `supplement_intakes`.

## Reminder preferences

Supplement-associated reminders are edited on Profile → Reminder preferences. Delivery deferred — see master doc.

## Related

- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
- [SECURITY_AND_PRIVACY.md](../architecture/SECURITY_AND_PRIVACY.md) — tracker privacy
