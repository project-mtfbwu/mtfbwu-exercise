# Increment 2 — visual review checklist

**Date:** 2026-07-26  
**Checkpoint before work:** `830820da779fc4be88324cc803e99065f200e27b`  
**Scope:** Live GeoCities flat-lay board shell + focus-mode interaction demos only.  
**No Playwright** in this increment — manual visual review + Vitest interaction tests.

> Note: Product Increment 2 is the flat-lay board shell (see `docs/architecture/BUILD_INCREMENTS.md`). Auth/RLS is Increment 3.

## References used

| File | Used for |
| --- | --- |
| `docs/design-references/01-master-today-board.png.png` | Normal board DNA, status strip, targets footer, stickers, dense packing |
| `docs/design-references/05-breakfast-focus.png.png` | Meal focus over dimmed board, paper focus panel, steppers |
| `docs/design-references/07-workout-focus.png.png` | Workout focus window chrome, sets table |
| `docs/design-references/08-water-focus.png.png` | Hydration focus, quick-add, progress |
| `docs/design-references/11-profile-board.png.png` | Profile window chrome, board module variety |

## Layout decisions

- **Desktop (≥1024px):** 3-column CSS grid with documented rotation/overlap classes (`board-layout.module.css`). Not random absolute positioning.
- **Tablet (640–1023px):** 2-column packed board; lighter overlap; rotation ≤2–3°.
- **Mobile (&lt;640px):** Single column; rotation ≤1–2°; no horizontal page trap; touch targets ≥44×44 via `PixelButton` / card buttons.
- Brand title is live HTML with gradient text (not a glitter bitmap).
- Focus uses `FocusLayer` dialog over a **mounted, dimmed, inert** board — no route change.

## Known visual differences vs references

- Fewer decorative stickers than poster denseness (performance + clutter).
- No guestbook / social widgets.
- Demo macros/totals are clearly labeled development placeholders — not copied fake “production” vitals as requirements.
- Glitter title is CSS gradient, not multi-layer bitmap word-art.
- Focus open animation is FLIP-ish via Framer `layoutId` in `full` mode only.

## Responsive behavior to verify manually

| Viewport | Checks |
| --- | --- |
| 1440×900 | All six demo cards visible; controlled overlap; footer readable; focus panel centered with board peeking |
| 768×1024 | Two columns; cards still large enough to tap; focus ~90% width |
| 390×844 | Single column; no horizontal overflow; Save/Cancel reachable; sticky OS keyboard does not hide primary actions permanently |

## Accessibility checks

- [ ] One `h1` (“TODAY”)
- [ ] Cards are real `<button>`s with `aria-haspopup="dialog"`
- [ ] Focus visible rings on cards and pixel buttons
- [ ] Focus trap inside dialog; Escape closes; focus returns to trigger
- [ ] Board `inert` + `aria-hidden` while open
- [ ] Labels on all demo inputs; demo banner in every focus panel
- [ ] Motion: `full` / `reduced` / `off` via Today or Settings toggle; OS reduce honored when override cleared

## Motion checks

| Mode | Expect |
| --- | --- |
| full | Card hover lift, focus expand, optional twinkle |
| reduced | Short opacity/scale only; no twinkle loop |
| off | Instant open/close |

## Screenshot instructions (manual)

1. `pnpm dev` → open `/today`.
2. Capture desktop / tablet / mobile sizes listed above (browser responsive mode is fine).
3. Capture Breakfast focus open with board dimmed behind.
4. Optional: store screenshots under `docs/design-system/reviews/` (not required to commit).

## Automated coverage

Vitest covers board render, keyboard open, Escape restore, inert board, Save vs Cancel, dialog semantics, motion toggle pressed state, and no `fetch` during demo saves.
