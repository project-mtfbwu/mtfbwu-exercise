# AI_IMPORT_PIPELINE.md

## Purpose

Allow users to import workouts, foods, or tracker configs from AI-assisted or file-based sources **without** trusting model output blindly.

## Principles

1. **Propose, don’t commit** — imports create proposals, not final logs.
2. **Provenance always** — who/what generated the payload, when, and from which source bytes/hash.
3. **Human review** — accept / edit / reject before promotion into trusted tables.
4. **No silent nutrition invention** — macros must cite USDA, OFF, user entry, or remain `needs_review`.

## Pipeline stages

```
Source (file | paste | camera OCR later)
   → Parse / model extract
   → Validate against domain schemas
   → Persist ai_import_jobs + ai_import_proposals
   → Review UI (focus module or dedicated window)
   → Promote to templates / food_items / trackers
```

## Provenance object (required)

```json
{
  "import_job_id": "uuid",
  "generator": "user_paste|model_x|ocr",
  "model_id": "optional",
  "prompt_hash": "optional",
  "source_hash": "sha256...",
  "created_at": "ISO-8601",
  "parser_version": "1"
}
```

Store on `ai_import_proposals.provenance` and copy a subset onto promoted rows (`source = ai_proposed` until user confirms).

## Domain-specific rules

### Workouts

- Map to **templates** first, not completed sessions.
- Unknown exercises → create `needs_review` stubs; do not invent biomechanics claims.
- Protocols (superset/drop set) must be explicit in proposal JSON.

### Nutrition

- Prefer matching barcode/name against OFF cache or USDA search (server-side).
- If model supplies macros without database match → `review_status = needs_review`.
- Never mark AI-only macros as `trusted` automatically.

### Custom trackers

- Accept name/unit/valueType only after user confirms.

## Security & privacy

- Do not send progress photos to third-party AI providers without explicit opt-in (default: off).
- Strip EXIF from any image leaving the device for AI.
- Import payloads are user-private (RLS by `user_id`).

## Out of scope

- Auto-posting imports to feeds (no feeds).
- Training on user data without consent.
- Unattended clinical advice generation.

## Related

- `DOMAIN_MODEL.md`
- `DATA_MODEL.md`
- `SECURITY_AND_PRIVACY.md`
- `ADR/0004-nutrition-source-priority.md`
