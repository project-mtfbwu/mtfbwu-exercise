# REFERENCE_COMPLIANCE_CHECKLIST.md

Use this checklist for **every UI increment**. Fail the increment if any required item fails.

## Before coding

- [ ] Relevant reference images in `docs/design-references/` were opened/inspected
- [ ] Filenames cited in the implementation report
- [ ] If no direct reference: derived from `DESIGN_SYSTEM.md` + `FOCUS_MODE.md` + `REFERENCE_CATALOG.md` (usually via ref `10` + `01`)

## Visual DNA

- [ ] GeoCities flat-lay personality preserved (grid, paper, windows, stickers, glitter brand)
- [ ] Not converted into generic SaaS dashboard / card-grid admin UI
- [ ] Not a poster/infographic as the clickable app surface
- [ ] Glitter used for brand/display, not critical form text
- [ ] Generated-image mistakes not copied (typos, fake macros, garbled text, melted icons, non-functional chrome)

## Focus / board

- [ ] Normal mode shows enabled modules together
- [ ] Focus keeps board visible behind (dimmed)
- [ ] Save/close returns to board; collapsed card updates
- [ ] Mobile focus retains paper/window identity

## Web quality

- [ ] Text is live HTML/SVG, not essential baked image text
- [ ] Keyboard access works; focus ring visible
- [ ] Touch targets adequate; mobile keyboard doesn’t hide Save
- [ ] Reduced / off motion works; `prefers-reduced-motion` honored
- [ ] Contrast checked for body/controls
- [ ] Loading, empty, error, and offline states exist for the flow
- [ ] Decorative motion does not block barcode, timers, or logging

## Product boundaries

- [ ] No guestbook/social/feed features
- [ ] No general journaling product surface
- [ ] Progress photos treated as private
- [ ] AI import is propose → review → draft template

## Sign-off

| Field | Value |
| --- | --- |
| Increment | |
| References cited | |
| Reviewer | |
| Date | |
