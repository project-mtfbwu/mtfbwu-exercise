# ADR 0005 — Native BarcodeDetector with ZXing fallback

## Status

Accepted (Increment 5)

## Context

Packaged-food logging needs reliable barcode scanning on mobile browsers. Native
`BarcodeDetector` is available in Chromium (secure contexts) with format
negotiation via `getSupportedFormats()`, but Safari/Firefox support remains
incomplete. A maintained MIT fallback is required.

## Decision

1. Prefer native `BarcodeDetector` when present and when supported formats
   include at least `ean_13` (retail packaged food).
2. Otherwise dynamically import `@zxing/browser@0.2.1` (MIT).
3. Expose a single `BarcodeScannerAdapter` so UI never depends on either engine.
4. Never run both engines at once; never start the camera until the user opens
   the scanner; stop all `MediaStream` tracks on close/unmount/success.

## Consequences

- Chromium users get a smaller path (no ZXing until needed).
- Safari/Firefox users pay a dynamic ZXing download on first scan.
- Format support must be documented per engine; QR URLs are never treated as
  food barcodes.
