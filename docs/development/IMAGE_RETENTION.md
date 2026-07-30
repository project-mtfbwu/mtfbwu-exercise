# Image retention (nutrition labels)

## Storage

- Private Supabase Storage bucket: `nutrition-labels`
- Object path: `{user_id}/nutrition-labels/{capture_id}/...`
- Signed URL access only; no public bucket policies
- MIME + max size enforced before upload; metadata stripped in preprocess

## Default policy

| Stage                                | Retention                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Session source (camera/upload)       | Memory only until cancel/close; **never uploaded**                                    |
| After confirm crop                   | Processed crop → preprocess → private Storage (optional draft)                        |
| Draft / review in progress           | Keep processed image + capture row while needed                                       |
| After successful custom product save | **Delete image** (default)                                                            |
| User opts to keep                    | Retain privately under same path rules                                                |
| Discard / cancel                     | Delete storage object + soft-delete capture; revoke object URLs; terminate OCR worker |

Do **not** use label images for AI training. Retain/delete applies to the
**processed** label image, not the raw camera original.

## IndexedDB

Dexie may hold a processed blob briefly for offline OCR drafts. Do not keep giant originals indefinitely; handle quota errors with a clear message.

## Related tables

- `nutrition_label_captures` — draft OCR + reviewed JSON; avoid indefinite raw OCR text without reason
- `product_review_events` — audit of review actions (no image payloads)
