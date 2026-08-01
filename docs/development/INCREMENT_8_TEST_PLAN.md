# Increment 8 — Test plan

## Database / RLS (`supabase/tests/increment8_progress_rls.sql`)

- [x] System catalog read (`measurement_definitions`)
- [x] Owner-only weight / measurement / photo / comparison / note / prefs
- [x] Storage policies on `progress-photos` bucket
- [x] Cross-user isolation for photo sets and photos

## Application (Vitest)

- [x] `measurements/units.test.ts` — conversions, normalize, reject invalid
- [x] `measurements/calculations/helpers.test.ts` — delta, same-day modes, trend text
- [x] `progress-outbox.test.ts` — payload kind, replay order, blob id, storageUpload
- [x] `board-model.test.ts` — `progressStatusLabel`
- [x] `widgets/progress/charts/line-chart.test.ts` — chart data helpers
- [x] `widgets/progress/measurement-form-helpers.test.ts` — left/right value building
- [x] `progress-photos/image/progress-crop-session.test.ts` — crop geometry, upload guard, ObjectUrlRegistry
- [x] `progress-photos/camera/managed-camera.test.ts` — getUserMedia constraints, permission errors
- [x] `progress-photos/offline/progress-quota.test.ts` — quota-safe blob store
- [x] `progress-photos/replacement.test.ts` — replacement order, stale/missing previous, restore rules, orphan cleanup, server-loaded slot identities
- [x] Slot preload via `loadPhotoSetSlotIdentitiesAction` / `loadPhotoSetForLocalDateAction`

## Manual / integration

See [INCREMENT_8_MANUAL_QA.md](./INCREMENT_8_MANUAL_QA.md)
