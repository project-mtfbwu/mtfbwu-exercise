# Increment 4 nutrition visual review

References used: `01-master-today-board`, `10-optional-tracker-focus`, and
`14-overview` from `docs/design-references/`; apply `FOCUS_MODE.md`,
`RESPONSIVE_BEHAVIOR.md`, and `ACCESSIBILITY.md`.

## Checklist

- [ ] Nutrition card remains one live HTML module on the dark-grid flat-lay
  board; it is not a KPI dashboard or feed.
- [ ] Selecting food, portions, and meal items happens inside a retro
  paper/window focus panel while the board stays visibly behind it.
- [ ] Food provenance, provisional/verified state, serving units, and macro
  totals are readable and never communicated by color alone.
- [ ] Search, quantity controls, save/retry actions, and error states are
  keyboard operable with WCAG 2.2 AA contrast and labels.
- [ ] Motion obeys `full`, `reduced`, and `off`; reduced/off modes do not rely
  on animation to explain added food or sync state.
- [ ] Offline drafts and failed sync are explicit, calm stickers/messages—not
  fake success or generic SaaS toast-only feedback.
- [ ] No purple-indigo gradient shell, generic analytics tiles, or generated
  image used as interactive UI.
