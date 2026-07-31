# Increment 6 workout visual review

References: `06-workout-routine-board.png.jpeg`, `07-workout-focus.png.png`,
and `01-master-today-board.png.png` from `docs/design-references/`. Apply
`FOCUS_MODE.md`, `RESPONSIVE_BEHAVIOR.md`, and `ACCESSIBILITY.md`.

## Viewports

Check at **1440×900**, **768×1024**, and **390×844** (portrait phone).

## Board (ref 06)

- [ ] Workout module is a live torn-paper / retro-window card on the dark grid —
  not a KPI dashboard or feed tile.
- [ ] Routine/plan summary readable at a glance (title, scheduled day, progress
  hint when session active).
- [ ] Pixel stickers and glitter type match Increment 2–5 tone; no purple-indigo
  SaaS gradients.
- [ ] All enabled modules remain visible together in normal mode.

## Focus (ref 07)

- [ ] Workout focus lifts above the board; backdrop dimmed but board still
  visible behind (`FOCUS_MODE.md`).
- [ ] Set rows: reps, load (`weight_kg` display with `load_unit`), done/skip
  controls large enough for one-hand mobile use.
- [ ] Copy yesterday / repeat last buttons when prior completed sessions exist;
  copied sets show suggestion notes, not pre-filled completions.
- [ ] Pending personal records section with Confirm / Dismiss after finish.
- [ ] Block boundaries visible for superset/circuit days (shared chrome, not
  separate app screen).
- [ ] Session title, elapsed hint, and finish/discard actions in retro window
  chrome.
- [ ] Escape closes focus and restores focus to originating card.

## Plans (ref 06 tone)

- [ ] `/plans` list uses torn-paper / retro-window cards — not admin tables.
- [ ] `/plans/[planId]` editor: days sidebar, block/exercise/prescription panels,
  Save details, Copy plan, New version, Archive.
- [ ] Keyboard ArrowUp/ArrowDown reorders focused day/block/exercise/prescription.
- [ ] Version conflict banner with Refresh plan action (Copy plan / New version
  as fork alternatives).
- [ ] Prescription fields include RIR and tempo when set (align migration).

## Motion

- [ ] `full` | `reduced` | `off` honored; reduced/off do not require animation
  to show set completion.
- [ ] No decorative animation blocking set entry controls.

## Accessibility

- [ ] Set table/list has proper headers / labels; status not color-only.
- [ ] Focus trap in panel; focus restored on close.
- [ ] Touch targets ≥ 44px where feasible on 390px width.
- [ ] WCAG 2.2 AA contrast on ink-on-paper set rows.

## Sync / offline UX

- [ ] Pending offline sets show calm sticker/banner — not fake success.
- [ ] Version conflict message actionable (refresh / retry), not silent overwrite.

## Anti-patterns (reject)

- Generic gym SaaS admin tables as the live UI
- Generated reference PNG used as clickable surface
- Social feed or trainer marketplace chrome
- Clinical/diagnostic styling or copy

Run `docs/design-system/REFERENCE_COMPLIANCE_CHECKLIST.md` before sign-off.
