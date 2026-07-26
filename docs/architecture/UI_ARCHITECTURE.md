# UI_ARCHITECTURE.md

## Metaphor

The home surface is a **flat-lay desk/board**: dark grid background, torn-paper module cards, pixel stickers, glitter typography, retro desktop windows.

## Modes

### Normal mode

- All **enabled** modules are visible on the board concurrently.
- Modules are spatial (positions may be saved per user later); first ship can use a responsive packed layout that still *reads* as flat-lay, not a KPI dashboard.
- Brand **MTFBWU** is a hero-level signal on the board.

### Focus mode

- Selecting a module **lifts** it into a retro desktop window.
- The flat-lay board **remains visible** behind (dimmed/scaled), preserving place memory.
- Closing focus returns to the full board without route amnesia when possible (query param or client state).

### Animation modes

| Mode | Behavior |
| --- | --- |
| `full` | Lift transitions, glitter accents, sticker motion |
| `reduced` | Opacity/position simplifications; no decorative loops |
| `disabled` | Instant state changes; honor OS `prefers-reduced-motion` as floor |

User preference in profile overrides decorative motion; accessibility preference always wins when stricter.

## Module chrome

Each module card:

- Torn-paper frame
- Glitter or sticker accent tied to domain (sparingly)
- Title + one-line status (e.g. today’s calories, last workout)
- Opens focus window with full interaction UI

Focus window:

- Title bar, close control, optional maximize within board
- Content scrolls inside the window; board does not turn into a separate “app shell” with bottom tabs as the primary metaphor (tabs may exist *inside* a window if needed)

## Routing sketch (Increment 1+)

- `/` — flat-lay board
- `/focus/[module]` — optional deep link into focus (board still rendered behind)
- Domain nested routes only when a flow needs shareable URLs (e.g. `/focus/workouts/session/[id]`)

## Design tokens (to implement later)

```css
--mt-grid-bg
--mt-paper
--mt-ink
--mt-glitter
--mt-window-chrome
--mt-sticker-shadow
--mt-focus-dim
--mt-motion-duration
```

Do not default to purple-indigo SaaS gradients or cream/terracotta “AI landing” tropes.

## Content rules

- First viewport of marketing surfaces (if any): brand, one headline, one sentence, one CTA, one dominant visual — see user frontend design rules.
- Inside the app board: modules are the content; avoid stat strips and promo chips floating over hero art.
- Cards exist because they are interactive module containers — not decorative boxes.

## Missing references

Approved images were not present under `docs/design-references/` at planning time. UI implementation must wait on added references or explicit user approval of interim comps. See `docs/design-references/README.md`.

## Related

- `ADR/0003-flat-lay-focus-ui.md`
- `.cursor/rules/visual-direction.mdc`
