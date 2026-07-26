# ACCESSIBILITY.md

Production UI targets **WCAG 2.2 AA**.

## Non-negotiables

- Semantic HTML (`button`, `dialog`/`role="dialog"`, headings, lists, tables for tabular data)
- Keyboard: Tab order matches reading order; Enter/Space activate cards; Esc closes focus (with dirty confirm)
- Visible `:focus-visible` rings using `--mt-focus-ring`
- Touch targets ≥ 44×44 CSS px for primary actions
- Screen-reader labels on icon-only controls (`aria-label`)
- Focus trap inside focus dialogs; restore focus to triggering card on close
- Form fields have visible labels; errors linked via `aria-describedby`
- Responsive layout remains usable at 200% zoom
- `prefers-reduced-motion` honored (`ANIMATION_SYSTEM.md`)
- Contrast: body text on paper ≥ 4.5:1; UI components ≥ 3:1 for non-text
- Do not communicate state by color alone (macros use P/C/F letters; deltas use ↑/↓ text)
- No essential text baked into background images or glitter bitmaps
- Live regions for timer ticks optional; announce saves with polite status

## Focus mode a11y

- Use `role="dialog"` + `aria-modal="true"` + labelledby title
- Dimmed board: `aria-hidden="true"` on inert board content while dialog open (keep mounted visually)
- Barcode: announce “camera active” / permission denied errors

## Retro chrome caveat

Min/max/close glyphs must map to real controls with names (“Close”, “Save”). Do not ship non-functional fake OS buttons that confuse AT users.

## Decorative stickers

`aria-hidden="true"` unless they convey status — then provide text alternative.

## Testing (later increments)

- Keyboard-only walkthrough of board → focus → save → return
- VoiceOver/NVDA on meal and workout focus
- Contrast check on neon title bars
- Mobile dynamic type / large text
