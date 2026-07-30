# Increment 5 — Barcode scanning and nutrition-label OCR

Checkpoint baseline: Increment 4 `cd84c97077fa1a023095587adea8cd0d10c067b1`.

## Goal

Make packaged-food entry fast while keeping extracted nutrition values
reviewable and trustworthy.

## Dependencies

| Package          | Version | License    | Role                               |
| ---------------- | ------- | ---------- | ---------------------------------- |
| `@zxing/browser` | `0.2.1` | MIT        | Barcode fallback (dynamic import)  |
| `tesseract.js`   | `7.0.0` | Apache-2.0 | Client OCR worker (dynamic import) |

Native `BarcodeDetector` is used when available — no package.

## Flows

1. **Scan barcode** → normalize → local cache → OFF on miss → review quantity → add to meal.
2. **Not found** → scan again / manual / label capture / custom (barcode preserved).
3. **Scan label** → tips → crop/rotate → preprocess → OCR → review (with recrop retry) → private custom product → add to meal.

## Privacy

- Camera: video-only, started on explicit action, tracks stopped on close.
- Images: private `nutrition-labels` bucket, path `{user_id}/nutrition-labels/...`.
- Default: delete image after successful product save.

## Deferred

AI plate recognition, portion-from-photo, NL food logging, workouts/rehab/photos,
cloud OCR, auto OFF contributions, silent OCR saves.
