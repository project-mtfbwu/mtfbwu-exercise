# Barcode scanner

## Engines

| Engine                   | When used                                            | Formats (product lookup)                                                    |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Native `BarcodeDetector` | Secure context + `ean_13` in `getSupportedFormats()` | EAN-13/8, UPC-A/E (plus Code 128 / Data Matrix / QR when reported)          |
| `@zxing/browser@0.2.1`   | Fallback (dynamic import)                            | Same retail set; QR decoded but rejected for food lookup if URL/non-numeric |

Abstraction: `BarcodeScannerAdapter` in `src/modules/nutrition/barcode/`.

## Normalization

- Strip whitespace; preserve leading zeros when meaningful.
- Validate check digits for EAN/UPC families.
- Reject QR URLs and non-product payloads with a clear message.

## Camera lifecycle

- Start only after explicit “Scan barcode”.
- Video only (`getUserMedia({ video: true })` — no audio).
- Prefer `facingMode: environment`; allow camera switch when multiple devices exist.
- Torch when `ImageCapture` / track constraints support it.
- Stop all tracks on success, close, focus dismiss, route change, tab hide (when appropriate), unmount.
- One active stream; no frame retention; no live video upload.

## Deduplication

- Debounce + identical-result cooldown.
- One lookup at a time; lock after first valid decode until user resumes.
- Optional vibration/audio only when enabled.

## Accessibility

Manual entry and image upload are always available. Status is announced; controls are keyboard-reachable.
