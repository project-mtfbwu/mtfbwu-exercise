# Increment 5 manual QA

Hardware-dependent checks are **manual**. Do not mark them passed unless
actually exercised on a device.

## Device matrix

| Check                                         | Chrome desktop (upload) | Chrome Android (rear) | Safari iPhone (rear)  | Status   |
| --------------------------------------------- | ----------------------- | --------------------- | --------------------- | -------- |
| Upload image → crop → OCR → review            | Manual                  | —                     | —                     | Untested |
| Rear camera barcode scan                      | —                       | Manual                | Manual                | Untested |
| Permission denied guidance                    | Manual                  | Manual                | Manual                | Untested |
| Camera unavailable / insecure context message | Manual                  | Manual                | Manual                | Untested |
| Camera switch (multi-camera)                  | Manual                  | Manual                | Manual                | Untested |
| Torch supported toggle                        | —                       | Manual                | Manual (if available) | Untested |
| Torch unsupported (control hidden/disabled)   | Manual                  | Manual                | Manual                | Untested |
| Barcode local-cache hit                       | Manual                  | Manual                | Manual                | Untested |
| OFF cache miss → remote lookup                | Manual                  | Manual                | Manual                | Untested |
| Product not found → label capture             | Manual                  | Manual                | Manual                | Untested |
| Label photo portrait                          | Manual                  | Manual                | Manual                | Untested |
| Label photo landscape                         | Manual                  | Manual                | Manual                | Untested |
| Rotated label (in-app rotate)                 | Manual                  | Manual                | Manual                | Untested |
| Cropped label                                 | Manual                  | Manual                | Manual                | Untested |
| Low-confidence OCR → recrop / manual          | Manual                  | Manual                | Manual                | Untested |
| Offline cached barcode                        | Manual                  | Manual                | Manual                | Untested |
| Offline uncached label draft                  | Manual                  | Manual                | Manual                | Untested |

## Capture guidance (must appear on pick screen)

- Keep the label flat
- Fill the frame
- Avoid glare
- Photograph straight-on
- Must **not** claim in-app perspective correction

## Crop / rotate (must verify)

- Rotate CW / CCW / reset rotation
- Adjustable crop; reset crop; confirm crop
- Retake / choose another
- Crop stays on content after rotation
- Keyboard numeric crop fallback
- OCR runs on cropped image only
- Recrop / rotate-and-scan-again preserves barcode and reuses capture row

## Automated coverage

See `INCREMENT_5_TEST_PLAN.md` and `src/modules/nutrition/ocr/crop-rotate.test.ts`.
