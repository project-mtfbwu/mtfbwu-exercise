# Design references — MTFBWU

Approved visual references for the MTFBWU flat-lay board UI.

## How to use

1. Open the relevant image(s) before any UI work.
2. Follow the extracted system in `docs/design-system/` — especially `REFERENCE_CATALOG.md` and `DESIGN_SYSTEM.md`.
3. Cite filenames in implementation reports.
4. Treat images as **visual DNA**, not production pixel specs.
5. Never use a reference PNG/JPEG as the live clickable app surface.

## Inventory (inspected 2026-07-26)

| File | Role |
| --- | --- |
| `01-master-today-board.png.png` | Canonical TODAY flat-lay board |
| `02-diet-chicken-day.png.png` | Nutrition day board (chicken) |
| `03-diet-plant-day.png.png` | Nutrition day board (plant) |
| `04-diet-fish-day.png.png` | Nutrition day board (fish) |
| `05-breakfast-focus.png.png` | Meal focus over nutrition board |
| `06-workout-routine-board.png.jpeg` | Workout routine flat-lay |
| `07-workout-focus.png.png` | Workout session focus |
| `08-water-focus.png.png` | Hydration focus |
| `10-optional-tracker-focus.png.png` | Mosaic: many focus UIs + calendar/AI/barcode |
| `11-profile-board.png.png` | Profile + customize board |
| `12-customize-board.png.png` | Food/workout log step flows |
| `14-overview.png` | Duplicate of 01 — prefer citing 01 |

Gaps `09` / `13`: unused. Full catalog notes and mistakes: `docs/design-system/REFERENCE_CATALOG.md`.

## Approved visual direction

- GeoCities-inspired maximalist desk board
- Dark grid background, glitter brand type, torn-paper cards, pixel stickers, retro windows
- Normal: all enabled modules visible together
- Focus: module lifts; board remains visible behind
- Motion: `full` | `reduced` | `off`

## What this is not

- Not a SaaS KPI dashboard
- Not a feed or social wall
- Not Odiina
- Not purple-indigo / cream-terracotta AI-default themes
- Not poster layouts as the production interaction model

## Related

- `docs/design-system/*`
- `docs/architecture/UI_ARCHITECTURE.md`
- `docs/architecture/ADR/0003-flat-lay-focus-ui.md`
- `.cursor/rules/visual-direction.mdc`
