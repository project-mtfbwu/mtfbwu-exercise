# Increment 8 — Visual review

Progress UI must match the flat-lay GeoCities system (`docs/design-references/README.md`, ADR 0003).

## References

- `01-master-today-board.png.png` — board composition
- Measurements / body modules: paper/window cards, orange/pink accents

## Required

- [ ] Measurements focus: torn-paper / retro window chrome, not clinical dashboard
- [ ] Progress photos focus: privacy banner readable; slot picker visible; crop editor + camera panel match retro chrome (**visual QA pending**)
- [ ] `/progress` comparison: side-by-side panels with borders, date labels
- [ ] Weight + measurement charts: SVG inline, table fallback below
- [ ] No purple-indigo SaaS gradients; dark grid visible on board routes
- [ ] WCAG 2.2 AA: labels on inputs, status regions for errors

## Viewports

| Size | Check |
| --- | --- |
| 1440×900 | Progress page sections stack cleanly |
| 768×1024 | Comparison panels stack on narrow |
| 390×844 | Touch targets ≥44px; no horizontal clip |

Run [REFERENCE_COMPLIANCE_CHECKLIST.md](./REFERENCE_COMPLIANCE_CHECKLIST.md) before sign-off.

**Status:** pending — crop editor and camera panel implemented but not yet reviewed against reference images on physical devices.
