# DESIGN_SYSTEM.md

Reference-led visual system for MTFBWU.  
**Sources:** all images in `docs/design-references/` (see `REFERENCE_CATALOG.md`).  
**Authority:** visual DNA from references + product/architecture docs. Not pixel-perfect clones.

## Personality (locked)

- GeoCities / Y2K maximalist desk board
- Dark grid “space desk”
- Glitter display titles
- Torn-paper cards + sticky notes
- Retro OS windows
- Pixel stickers with thick light outlines
- Slight card rotation and overlap in normal mode
- Neon accents on cream paper

**Not allowed:** SaaS KPI dashboards, purple-indigo marketing gradients, cream/terracotta AI-default landing looks, poster/infographic layouts as the live app, social feeds, baking essential text into images.

---

## Color tokens

Use CSS variables. Hex values are **starting tokens** sampled from references; adjust slightly only to meet WCAG.

### Backgrounds

| Token | Approx | Use |
| --- | --- | --- |
| `--mt-bg-deep` | `#0A0618` | App root |
| `--mt-bg-board` | `#12082A` | Flat-lay board plane |
| `--mt-bg-glow` | `#3A0A5C` @ low opacity | Soft radial glow behind board |
| `--mt-grid-line` | `#7B5CFF` / `#5CE1FF` @ 25–40% | Square grid |
| `--mt-checker-a` | `#FF2BD6` | Footer checker |
| `--mt-checker-b` | `#0A0618` | Footer checker |

### Paper / surfaces

| Token | Approx | Use |
| --- | --- | --- |
| `--mt-paper` | `#F7F0E1` | Torn paper body |
| `--mt-paper-warm` | `#FFF6C8` | Sticky / status strips |
| `--mt-paper-mint` | `#E8F8E8` | Optional pastel window body |
| `--mt-paper-pink` | `#FFE6F2` | Optional pastel window body |
| `--mt-window-face` | `#E8E4DC` | Retro window body |
| `--mt-window-chrome` | `#C0C0C0` | Bevel / classic chrome |

### Neon accents (decorative + module chrome)

| Token | Approx | Use |
| --- | --- | --- |
| `--mt-neon-pink` | `#FF2BD6` | Titles, water accents, hearts |
| `--mt-neon-cyan` | `#2DE2FF` | Grid, links, hydration |
| `--mt-neon-lime` | `#B8FF2E` | Success, save, complete |
| `--mt-neon-yellow` | `#FFE566` | Status strips, warnings soft |
| `--mt-neon-orange` | `#FF9A3C` | Fat macros, energy |
| `--mt-neon-purple` | `#9B5CFF` | Window bars, meditation |
| `--mt-neon-blue` | `#3D7EFF` | Workout chrome, protein alt |

### Text

| Token | Approx | Use |
| --- | --- | --- |
| `--mt-ink` | `#14121A` | Body on paper |
| `--mt-ink-muted` | `#4A4558` | Secondary labels on paper |
| `--mt-ink-inverse` | `#FFF8FF` | Text on dark/neon bars |
| `--mt-ink-display` | (gradient/glitter) | Brand titles only |

### Semantic

| Token | Approx | Notes |
| --- | --- | --- |
| `--mt-success` | `#1FAE5B` / lime accents | Checks, saved |
| `--mt-warning` | `#E6A100` | Caution; pair with icon/text |
| `--mt-error` | `#D7263D` | Errors, delete |
| `--mt-focus-ring` | `#FFE566` on dark / `#5B2EFF` on light | Visible keyboard focus |

### Accessible contrast alternatives

When neon-on-neon fails AA:

- Prefer **ink on paper** for all form labels, errors, and table data.
- Neon may frame chrome; do not use neon pink text on purple bars for critical copy.
- Provide `--mt-ink` / `--mt-paper` pairings as the trustworthy reading mode.
- Decorative glitter headings must have a **visually hidden or adjacent plain-text** accessible name when they convey meaning (usually brand only).

### Macro color coding (nutrition)

| Macro | Accent |
| --- | --- |
| kcal | pink/magenta |
| Protein (P) | green |
| Carbs (C) | blue/cyan |
| Fat (F) | orange |

Never rely on color alone — always show letter labels.

---

## Typography

| Role | Treatment | Rules |
| --- | --- | --- |
| Display / glitter | Chunky rounded display + glitter/gradient fill + dark outline | Brand & board titles only (`MTFBWU`, day names). Not for form labels. |
| UI heading | Bold geometric sans (e.g. **Space Grotesk**, **Outfit**, or **Nunito**) | Module titles, window titles |
| Body | Highly readable sans (e.g. **IBM Plex Sans**, **Source Sans 3**, **Nunito Sans**) | Lists, descriptions |
| Numbers / stats | Same family, tabular nums if available | Macros, timers, steppers |
| Labels | Uppercase or small caps UI sans, letter-spacing modest | Field labels |
| Pixel accent | Optional pixel font for badges | Stickers/slogans only — never required reading |
| Handwriting accent | Optional for motivational stickers | Not for inputs |

**Minimum readable sizes (UI):**

- Body ≥ 16px
- Labels ≥ 14px
- Touch helper text ≥ 14px
- Display titles may be large; always provide semantic `<h1>`/`<h2>` text

**Fallbacks:** `ui-sans-serif, system-ui, "Segoe UI", sans-serif` for UI; never leave critical content only in a decorative webfont.

---

## Surfaces

| Surface | Visual DNA | Implementation preference |
| --- | --- | --- |
| Torn paper | Cream fill, deckled/jagged edge, soft shadow | CSS mask / SVG border + texture |
| Sticky note | Yellow square, slight rotate, tape/clip optional | CSS |
| Retro window | Colored title bar, min/max/close glyphs, bevel | CSS box; real buttons with aria |
| Sticker | Thick light outline, slight rotate | SVG |
| Pixel badge | Low-res icon + slogan burst | SVG sprite |
| Progress meter | Segmented LED blocks **or** smooth bar in footers | CSS |
| Focus card | Larger paper/window + stronger elevation | CSS transform + shadow |
| Modal backdrop | Dim board (not solid black void) | `rgba` overlay ~40–60% |
| Calendar tile | Paper cell + pixel completion icons | CSS grid |

---

## Layout DNA

- **Board:** packed modules, slight rotation (±2–6°), controlled overlap, stickers in gaps.
- **Status strip:** yellow/cream horizontal bar near top for day vitals.
- **Footer mantra:** dark bar with neon slogan (decorative); do not put required actions only there.
- **Module accents:** each domain may own a title-bar color; controls semantics stay consistent.

---

## Conflicts between references (and resolutions)

| Conflict | Resolution |
| --- | --- |
| Poster density vs usable web | Keep surfaces/stickers; reflow; use focus for dense input (05, 07, 08, 12). |
| Guestbook / social widgets | Decorative only; no guestbook product. |
| Diet “Mood + Journal” | Optional scales/notes; not a journal app. |
| Smooth vs segmented meters | Segmented on module cards; smooth OK on summary footers. |
| Pastel window bodies (06) vs cream paper (01) | Both allowed; cream default, pastels for workout overview variety. |
| 01 vs 14 duplicate | Canonical = 01. |
| Typo MTFFBWU (04) | Correct to MTFBWU always. |
| Fake sample data | Never copy values/text as requirements. |

---

## Missing-screen derivation rule

If no dedicated reference exists, compose from:

1. Board DNA from **01**
2. Focus chrome from **05 / 07 / 08**
3. Module-specific controls from **10** when present
4. Product fields from `DOMAIN_MODEL.md` / focus specs in `FOCUS_MODE.md`

Never invent a new brand language.

---

## Related

- `COMPONENT_INVENTORY.md`
- `FOCUS_MODE.md`
- `RESPONSIVE_BEHAVIOR.md`
- `ANIMATION_SYSTEM.md`
- `ACCESSIBILITY.md`
- `REFERENCE_COMPLIANCE_CHECKLIST.md`
- `docs/architecture/ADR/0003-flat-lay-focus-ui.md`
