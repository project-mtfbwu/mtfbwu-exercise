# ADR 0006 — Human-reviewed nutrition-label extraction

## Status

Accepted (Increment 5)

## Context

OCR can accelerate custom branded-product entry but is unreliable on glare,
skewed photos, dual-column labels, and unit variants. Treating OCR as trusted
would violate MTFBWU provenance rules.

## Decision

1. Use client-side `tesseract.js@7.0.0` (Apache-2.0) behind an `OcrAdapter`,
   English only in Increment 5.
2. Run a deterministic label parser that returns suggestions with basis,
   confidence, and source text — never silent guesses for ambiguous columns.
3. Require an explicit human review form and an unchecked confirmation before
   saving a custom branded product.
4. Keep label images in a private Storage bucket; default retention is delete
   after save unless the user opts in.
5. Do not call paid/cloud OCR in this increment.

## Consequences

- Label entry is slower than a silent OCR save, by design.
- Bundle impact is deferred via dynamic import until label capture opens.
- Hindi/Tamil language packs remain future work.
