# ANIMATION_SYSTEM.md

Three user-selectable modes, with OS preference as a floor.

| Mode | Behavior |
| --- | --- |
| `full` | Card lift/expand, sticker sparkle loops, soft parallax optional, glitter shimmer |
| `reduced` | Opacity/transform only; no loops; shorter durations (~150–200ms) |
| `disabled` | Instant state changes; no transitions |

## Rules

1. Honor `prefers-reduced-motion: reduce` → never higher than `reduced` (force `disabled` if user chose off).
2. Profile toggle “Animate UI” (ref `11`) maps to these modes.
3. **Never** animate in ways that hurt:
   - barcode scanning
   - timers (digits must stay readable)
   - form typing
   - workout set entry performance
4. Decorative animation is optional ornament — not required to understand state.
5. Focus open/close: prefer `transform` + `opacity`; avoid layout thrash.
6. Save feedback may use a brief `StickerBadge` (“SAVED!” / “NEW PR!”) in `full`/`reduced` only (ref `12`).

## Suggested tokens

```css
--mt-motion-fast: 120ms;
--mt-motion-med: 220ms;
--mt-motion-lift: 280ms;
--mt-ease-lift: cubic-bezier(0.2, 0.8, 0.2, 1);
```

When `disabled`: all durations `0ms`.

## Focus lift choreography (full)

1. Record card’s board rect.
2. Dim board overlay fades in.
3. Card morphs/expands to focus panel (FLIP or shared-element style).
4. On close: reverse; restore focus to the card.

`reduced`: fade + scale without FLIP path complexity.  
`disabled`: show/hide.
