# RESPONSIVE_BEHAVIOR.md

References are wide collage posters. Production must be **responsive, zoom-tolerant, and keyboard-usable** while keeping the same visual identity.

## Breakpoints (guidance)

| Name | Width | Board behavior |
| --- | --- | --- |
| Mobile | &lt; 640px | Single-column stack of `FlatLayCard`s; rotation ≤ 2°; stickers reduced |
| Tablet | 640–1023px | 2-column packed board; light overlap OK |
| Desktop | ≥ 1024px | Multi-column flat-lay closer to refs 01/06/11 |

Do not freeze a fixed 4:3 artboard as the only layout.

## Normal mode

- All **enabled** modules remain reachable without horizontal page-scroll traps.
- Status strip may wrap or become a 2-row strip on mobile.
- Sticker density scales down on small screens (personality retained, clutter reduced).
- Browser zoom 200%: text reflows; controls do not clip essential actions.

## Focus mode by viewport

### Desktop

- Focus panel centered, max-width ~720–900px.
- Board clearly visible around panel (dimmed).
- Esc closes (with confirm if dirty).

### Tablet

- Focus panel ~90% width/height; board peeks at edges.
- Same paper/window chrome.

### Mobile

- Focus panel nearly full viewport (safe-area insets).
- **Still** uses TornPaperPanel / RetroWindow — never a blank Material page.
- Sticky footer actions: Save + Close.
- Software keyboard: scroll focused field into view; avoid decorative fixed stickers covering inputs.
- Barcode camera: fullscreen-ish preview inside window chrome; pause glitter animations.

## Reflow rules for dense boards (02–04, 06)

- Collapse secondary decorative windows first.
- Keep primary daily cards (nutrition/workout/water) above the fold when possible.
- “Micros / Guestbook / slogan footers” are secondary.

## Flow screens (ref 12)

On mobile, show **one step at a time** inside focus chrome rather than a six-panel poster.

## Images

- Photos: responsive `next/image` (later).
- Decorative stickers: SVG, lazy, optional `content-visibility` where helpful.
