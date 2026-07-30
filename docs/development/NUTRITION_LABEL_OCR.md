# Nutrition-label OCR

## Engine

- `tesseract.js@7.0.0` (Apache-2.0), worker-based, dynamic import.
- Language: English (`eng`) required in Increment 5.
- Hindi/Tamil: deferred (bundle + accuracy trade-off).

## Pipeline

1. Capture or upload image (session keeps EXIF-upright source in memory only).
2. Interactive rotate + crop (Canvas preview; numeric keyboard fallback).
3. Render **cropped** JPEG only → preprocess (resize/grayscale) → OCR.
4. Deterministic parser → `ExtractedNutritionField[]` with basis + confidence + `sourceText`.
5. Human review form (mandatory unchecked confirmation).
6. Retry options: recrop / rotate-and-scan / use text / enter manually (same capture row + barcode).
7. Save private custom branded product; default delete processed label image.

Perspective is **not** auto-corrected — capture tips ask for a flat, straight-on shot.

## Non-goals

- Cloud OCR
- Treating raw OCR as trusted nutrients
- Silent save
- General document OCR / handwritten plans / AI plate estimation

## Energy check

Advisory only: protein×4 + carbs×4 + fat×9 vs printed calories. Never auto-replace printed energy.
