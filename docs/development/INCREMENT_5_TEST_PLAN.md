# Increment 5 test plan

## Utilities

- [x] Barcode normalize/validate (EAN-13/8, UPC-A/E, leading zeros, check digit, whitespace)
- [x] Reject nonnumeric QR / URL payloads for product lookup
- [x] Scan dedupe / cooldown
- [x] Label parser fixtures (per 100g, per serving, units, energy warning)
- [x] Image preprocess fixtures (where present)
- [x] Crop/rotate geometry (CW/CCW, four-turn identity, bounds, min size, crop-after-rotate)
- [x] Object URL registry cleanup
- [x] Upload refuses uncropped original
- [x] OCR worker terminate idempotent
- [x] Keyboard crop coordinate mapping

## Scanner UI

- [x] Manual entry path
- [x] Product review card smoke
- [ ] Permission-denied (manual / browser)
- [ ] Close stops camera (manual)
- [ ] Torch / multi-camera (device)

## Label capture UI

- [x] Perspective guidance copy (no false perspective-correction claim)
- [x] Interactive crop/rotate controls in panel
- [x] OCR retry actions (recrop / rotate / use text / manual)
- [ ] Device camera + crop on phone (see `INCREMENT_5_MANUAL_QA.md`)

## Database / RLS

- [x] `supabase/tests/increment5_label_rls.sql` — own capture, cross-user deny, storage path, soft-delete
- [x] Trusted branded-product overwrite denied; private custom product allowed

## Integration

- [x] Cached / OFF lookup paths covered by unit + existing nutrition server tests
- [ ] Full camera → meal add on device
- [ ] Offline uncached draft on device

## Accessibility

- [x] Manual path always in UI
- [x] Numeric crop fallback labeled
- [ ] Screen-reader pass on device

## CI gate

Inc 3–5 SQL RLS + typecheck + lint + format + unit tests + build + audit.
