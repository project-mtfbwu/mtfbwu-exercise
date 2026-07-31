# Increment 7 — Manual QA

## Prep

1. `pnpm install --frozen-lockfile`
2. Local Supabase start + `db reset`
3. Sign in; enable Rehab module; open Today

## Safety copy

- [ ] Tracking disclaimer visible in rehab focus and plan editor
- [ ] Stop guidance mentions sharp pain, swelling, instability, locking, faintness

## Plan builder (`/rehab/plans`)

- [ ] Create blank plan (no prefilled medical protocol)
- [ ] Add phase, day, catalog exercise, side, prescription, restriction
- [ ] Original restriction wording shown prominently
- [ ] Archive / copy / new version; stale version conflict message

## Session

- [ ] Start scheduled and unscheduled
- [ ] Complete / skip / stop set with pain, swelling, instability, confidence, ROM
- [ ] Scale meanings visible (not color-only)
- [ ] Alert on pain limit / severe symptoms; continue only after acknowledge
- [ ] Previous performance limited; finish; discard with confirm
- [ ] Summary page labeled “Rehab session summary — user-recorded data.”

## Board

- [ ] Collapsed Rehab card shows scheduled / progress / alert indicator
- [ ] Focus lifts card; board remains dimmed behind
- [ ] Workout shows neutral restriction notice when applicable

## Offline

- [ ] Start/continue offline; queue set + alert; finish order preserved
- [ ] Failed sync visible; retry succeeds

## Viewports

- [ ] 1440×900, 768×1024, 390×844 — no overflow; calm cream/ink surfaces
