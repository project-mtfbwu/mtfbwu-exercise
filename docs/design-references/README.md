# Design references — MTFBWU

Approved visual direction for the MTFBWU flat-lay board UI.

## Status of image assets

**Inspection date:** 2026-07-26

At planning time, `docs/design-references/` contained **no image files**. The git workspace for `project-mtfbwu/mtfbwu-exercise` was empty aside from `.git`. No chat-attached or `@Files` images were available to this agent session.

**Action required before Increment 1 UI work:** place approved reference images in this folder and list them in the inventory table below.

### Expected inventory (placeholders)

| File (expected) | Role | Status |
| --- | --- | --- |
| *(to be added)* | Full flat-lay board / normal mode | **Missing** |
| *(to be added)* | Focus mode (module lifted; board still visible) | **Missing** |
| *(to be added)* | Torn-paper card / pixel sticker / window chrome detail | **Missing** |
| *(to be added)* | Glitter typography / dark grid atmosphere | **Missing** |

Until images land, treat the **textual direction below** and `docs/architecture/UI_ARCHITECTURE.md` / `ADR/0003` as authoritative.

## Approved visual direction

- **Inspiration:** GeoCities / early personal-web aesthetic, not corporate SaaS
- **Background:** dark grid (desk/board atmosphere)
- **Typography:** glitter / expressive display treatment for brand and module titles
- **Surfaces:** torn-paper cards for module content
- **Ornaments:** pixel stickers as decorative accents (not primary navigation chrome)
- **Chrome:** retro desktop-window styling for focused modules
- **Layout:** flat-lay — all **enabled** modules visible together in normal mode
- **Focus mode:** selected module lifts into focus; surrounding flat-lay board remains visible behind it
- **Motion:** three modes — `full` | `reduced` | `disabled`

## What this is not

- Not a dashboard of KPI cards
- Not a feed or social wall
- Not Odiina’s visual language (separate product)
- Not purple-gradient / cream-serif AI default themes

## How agents should use this folder

1. Prefer files here over inventing a new aesthetic.
2. When images are added, open and describe them before implementing UI.
3. Encode reusable tokens (grid, paper texture, window chrome) as CSS variables — see `UI_ARCHITECTURE.md`.
4. Respect `prefers-reduced-motion` and the user-selected animation mode.

## Related docs

- `docs/architecture/UI_ARCHITECTURE.md`
- `docs/architecture/ADR/0003-flat-lay-focus-ui.md`
- `.cursor/rules/visual-direction.mdc`
