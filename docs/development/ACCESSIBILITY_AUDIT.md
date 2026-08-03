# Accessibility audit (Increment 10)

Target: **WCAG 2.2 AA** where practical for a GeoCities-styled personal tracker.

## Automated (shipped)

- Playwright + `@axe-core/playwright` on login/today/calendar/settings/legal pages (serious/critical)
- Viewport smoke: 1440×900, 768×1024, 390×844 — no document-level horizontal overflow; primary controls visible
- `jest-axe` on Settings account lifecycle panel (form labels)
- Focus mode dialog semantics + skip link foundations from earlier increments
- Decorative glitter contrast: color-contrast rule relaxed in automation; interactive controls must not rely on stickers alone

## Manual QA (still pending)

1. Keyboard-only full Today → focus → save → Escape
2. VoiceOver/TalkBack pass
3. Safari/iPhone matrix
4. Physical camera permission flows

See `INCREMENT_10_MANUAL_QA.md`.
