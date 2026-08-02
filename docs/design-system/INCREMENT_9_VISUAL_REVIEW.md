# Increment 9 — Visual review

Daily tracker UI must match the flat-lay GeoCities system (`docs/design-references/README.md`, ADR 0003).

## References

- `01-master-today-board.png.png` — board composition
- `08-water-focus.png.png` — hydration focus chrome
- Meditation / sleep modules: paper/window cards, pixel buttons, dark grid backdrop

## Required

- [ ] Hydration focus: preset vessels, progress meter, torn-paper / retro window chrome
- [ ] Meditation focus: timer controls readable; not clinical dashboard
- [ ] Sleep focus: bedtime/wake pickers; neutral duration copy (no sleep-score medical framing)
- [ ] Supplements focus: checklist + safety disclaimer visible
- [ ] Custom tracker focus: matches board card variants
- [ ] `/calendar` + `/history`: retro typography, dark grid, no purple-indigo SaaS gradients
- [ ] WCAG 2.2 AA: labels on inputs, status regions for errors
- [ ] Profile reminder preferences section + deferred-delivery copy

## Viewports

| Size | Check |
| --- | --- |
| 1440×900 | Focus panels centered; calendar month grid readable |
| 768×1024 | Focus panels fit; history list scannable |
| 390×844 | Touch targets ≥44px; no horizontal clip on presets |

Run [REFERENCE_COMPLIANCE_CHECKLIST.md](./REFERENCE_COMPLIANCE_CHECKLIST.md) before sign-off.

**Status:** pending human review on listed viewports.
