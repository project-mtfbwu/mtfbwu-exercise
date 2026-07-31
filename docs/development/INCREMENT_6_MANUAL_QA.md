# Increment 6 manual QA

Hardware- and UX-dependent checks are **manual**. Do not mark passed unless
exercised on a real device/browser session.

## Device matrix

| Check                                          | Desktop 1440 | Tablet 768 | Mobile 390 | Status   |
| ---------------------------------------------- | ------------ | ---------- | ---------- | -------- |
| Workout card on flat-lay board (ref 06)        | Manual       | Manual     | Manual     | Untested |
| Workout focus panel over dimmed board (ref 07) | Manual       | Manual     | Manual     | Untested |
| Plans list `/plans` (ref 06 tone)              | Manual       | Manual     | Manual     | Untested |
| Plan editor `/plans/[planId]`                  | Manual       | Manual     | Manual     | Untested |
| Plan version conflict → refresh banner         | Manual       | Manual     | Manual     | Untested |
| Keyboard reorder days/blocks/exercises         | Manual       | Manual     | Manual     | Untested |
| Start blank session                            | Manual       | Manual     | Manual     | Untested |
| Start from installed plan day                  | Manual       | Manual     | Manual     | Untested |
| Copy yesterday / repeat last session           | Manual       | Manual     | Manual     | Untested |
| Complete / skip sets                           | Manual       | Manual     | Manual     | Untested |
| Load unit kg vs lb entry                       | Manual       | Manual     | Manual     | Untested |
| Finish session → daily status summary          | Manual       | Manual     | Manual     | Untested |
| PR confirm / dismiss after finish              | Manual       | Manual     | Manual     | Untested |
| Discard in-progress session                    | Manual       | Manual     | Untested   | Untested |
| Block dual-start guard (second start blocked)  | Manual       | Manual     | Manual     | Untested |
| Install Arnold starter (explicit action only)  | Manual       | Manual     | Manual     | Untested |
| Schedule plan day on calendar date             | Manual       | Manual     | Manual     | Untested |
| Offline set queue (local optimistic UI)        | Manual       | Manual     | Manual     | Untested |
| Offline finish bundles pending sets            | Manual       | Manual     | Manual     | Untested |
| Conflict banner after stale version            | Manual       | Manual     | Manual     | Untested |
| Reduced-motion: no decorative lift over sets   | Manual       | Manual     | Manual     | Untested |

## Safety copy (must verify)

- No diagnosis or treatment language in workout module.
- Starter plan labeled as **example**, not prescription.
- Pain/RPE fields framed as user notes, not clinical output.

## Visual references

- `docs/design-references/06-workout-routine-board.png.jpeg` — routine on board
- `docs/design-references/07-workout-focus.png.png` — session focus chrome
- `docs/design-references/01-master-today-board.png.png` — board stays behind

Full checklist: `docs/design-system/INCREMENT_6_VISUAL_REVIEW.md`.

## Automated coverage

See `INCREMENT_6_TEST_PLAN.md` and calculation/outbox unit tests.
