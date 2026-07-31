# Increment 7 — Test plan

## Database / RLS (`supabase/tests/increment7_rehab_rls.sql`)

- [x] System catalog read (definitions, body areas, movements)
- [x] System catalog write denied
- [x] Private `user_rehab_exercises` isolation
- [x] Clinician-source isolation
- [x] Plan / phase / day / exercise / prescription ownership chains
- [x] Restriction ownership
- [x] Scheduled session ownership
- [x] Performed session / set / observation / alert ownership
- [x] Historical snapshots after plan soft-delete

## Application (Vitest)

- [x] Calculations: completion, pain/confidence comparison, ROM, assistance, alerts
- [x] Alert detection helpers
- [x] Rehab outbox builders + finish folding / conflict predicates
- [x] `rehabStatusLabel` board summary

## Manual / integration (see INCREMENT_7_MANUAL_QA.md)

- Plan builder create/edit/archive/copy/version
- Session start/complete/stop/skip/finish/discard
- Alert acknowledgment
- Offline continue + retry
- Accessibility: scale labels, dialog focus, side controls
