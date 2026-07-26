# COMPONENT_INVENTORY.md

Planned component set for the live UI shell. **Do not implement yet** — this is the inventory contract.

All components render **live HTML/SVG/CSS**. References are DNA only.

## Board shell

### `FlatLayBoard`

- Dark grid background, optional glow, checker footer strip, glitter brand title slot, status strip slot, module slots, sticker layer.
- Props: `modules[]`, `animationMode`, `selectedModuleId`, `onSelectModule`.
- Refs: `01`, `06`, `10`, `11`, `14`.

### `FlatLayCard`

- Collapsed module tile: torn-paper **or** mini retro window.
- Shows title, icon/sticker, one-line status / meter, optional slight rotation.
- Keyboard activatable (`button` or `role="button"` with Enter/Space).
- Refs: `01`, `10`, `12` (before/after update).

### `FocusLayer`

- Portal/overlay: dims board, keeps board mounted/visible, hosts focus panel, restores focus on close.
- Refs: `05`, `07`, `08`, `12`.

### `RetroWindow`

- Title bar (module accent color), title text, optional pixel icon, window controls mapped to real actions (close required; min/max optional/no-op or collapse).
- Body: paper/window face.
- Refs: `01`, `07`, `08`, `10`, `11`.

### `TornPaperPanel`

- Deckled edge mask, cream paper, optional dashed accent border, shadow.
- Refs: meal cards in `02–05`.

## Controls

### `PixelButton`

- Chunky border, optional pixel icon, variants: primary (lime save), danger (pink close), neutral.
- Min touch 44×44 CSS px.
- Refs: `05`, `08`, `12`.

### `StickerBadge`

- Decorative or status (“GOAL!”, “NEW PR!”, “YOU GOT THIS!”).
- Never the only carrier of state — pair with text/ARIA.
- Refs: all boards.

### `ProgressMeter`

- Variants: `segmented` | `smooth` | `circular` (summary only).
- Always include numeric text (`2.1 / 3.0 L`).
- Refs: `01`, `08`, `10`.

### `SegmentedControl`

- Mutually exclusive options (units kg/cm vs lb/in; meditation type).
- Refs: `11` units; `10` meditation.

### `NumericStepper`

- − / value / + ; supports decimals; aria for live value.
- Refs: `05` quantity; `07` reps/weight.

### `SearchInput`

- Clearable search for foods/exercises.
- Refs: `10`, `12`.

### `BarcodeButton`

- Opens barcode/label camera flow; icon button with accessible name “Scan barcode”.
- Refs: `05`, `10`.

### `Timer`

- Session timer and rest timer; start/pause/reset; respects reduced motion (no spinning decoration required).
- Refs: `07`, `10` meditation.

### `CalendarTile`

- Day cell with selected state + compact completion icons.
- Refs: `01` mini; `10` full.

### `MeasurementInput`

- Label, value, unit, previous, delta.
- Refs: `10`, `11`.

### `PhotoCard`

- Front/side/back slot, privacy badge, take/upload/retake.
- Refs: `10`, `11`.

### `ModuleToggle`

- Enable/disable module on board; optional drag order handle.
- Refs: `11` Customize / Layout.

## Composite patterns (not separate packages yet)

| Pattern | Built from | Ref |
| --- | --- | --- |
| Meal log focus | FocusLayer + TornPaperPanel + steppers + BarcodeButton | 05, 12 |
| Workout session focus | FocusLayer + RetroWindow + Timer + table | 07, 12 |
| Water focus | FocusLayer + RetroWindow + ProgressMeter + quick adds | 08 |
| Status strip | TornPaperPanel horizontal | 01–04 |
| Targets footer | Retro/paper bar + ProgressMeter | 01 |

## Explicit non-components

- Guestbook widget (decorative sticker only)
- Social feed / comments
- KPI dashboard charts as the home metaphor (charts may appear later inside a focus panel, styled to DNA — ref 10 overview is optional later)

## Next.js media note

- Progress photos: `next/image` when implemented.
- Stickers/grid/glitter: CSS/SVG/small assets — not giant photographic backgrounds.
