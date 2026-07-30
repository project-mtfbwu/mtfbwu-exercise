# Camera privacy

## Principles

- Camera access is **opt-in** and starts only from meal-focus scanner / label capture.
- Request **video only** — never audio.
- Frames are processed in-memory for decode/OCR; they are not uploaded as live video.
- Stop every `MediaStream` track when scanning ends or the focus layer closes.
- No background camera access after the panel closes.

## Secure contexts

`getUserMedia` and `BarcodeDetector` require a secure context (HTTPS or localhost).
Insecure HTTP origins show an explicit incompatibility message.

## Retention

See [IMAGE_RETENTION.md](./IMAGE_RETENTION.md). Camera previews use blob/object URLs that must be revoked on cleanup.

## User guidance

Permission-denied, no-camera, and insecure-context states include retry instructions. Manual barcode entry remains available without camera.
