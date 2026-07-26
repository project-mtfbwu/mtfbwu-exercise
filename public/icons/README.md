# PWA icons (placeholders required)

Do **not** generate low-quality AI icons for production.

Required before installability polish:

- `public/icons/icon-192.png` — 192×192
- `public/icons/icon-512.png` — 512×512

Design language: GeoCities / pixel sticker energy, dark grid, neon accents.
Until real assets exist, the manifest references these paths; ship proper artwork in a later visual increment.

## Service worker strategy (Increment 1)

- Prefer Next.js App Router `manifest` + documented Serwist later for offline shell.
- Increment 1 does **not** ship a production service worker cache.
- Never blanket-cache authenticated or private health API responses.
- Dexie holds structured offline user data; SW (when added) caches static assets only.
