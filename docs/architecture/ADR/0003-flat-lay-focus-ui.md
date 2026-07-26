# ADR 0003 — Flat-lay focus UI

## Status

Accepted — 2026-07-26

## Context

Product identity is a GeoCities-inspired **flat-lay board** where all enabled modules are visible. Users need deep interaction without losing spatial context. Animation must respect full / reduced / disabled modes.

Approved reference **images were missing** from `docs/design-references/` at decision time; textual direction from product owner is authoritative until images are added.

## Decision

- Normal mode: all enabled modules visible on one board
- Focus mode: selected module lifts into retro desktop window; **board remains visible behind**
- Visual language: dark grid, glitter type, torn-paper cards, pixel stickers, window chrome
- Motion: `full` | `reduced` | `off`, with `prefers-reduced-motion` as a floor (`disabled` in older notes maps to `off`)

## Consequences

**Positive:** Distinct brand; natural module discovery; focus without “app switch” amnesia.

**Negative:** Harder than a standard tab bar; performance care with many animated layers; needs real reference images before polishing.

**Reject:** Dashboard KPI grids; social feeds; Odiina UI patterns; hiding non-focused modules entirely.

## References

- `UI_ARCHITECTURE.md`
- `docs/design-references/README.md`
- `.cursor/rules/visual-direction.mdc`
