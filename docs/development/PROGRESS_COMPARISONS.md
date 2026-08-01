# Progress comparisons (Increment 8)

Saved comparison rows in `progress_comparisons` plus live photo comparison UI on `/progress`.

## Saved comparisons

- Types: `photo`, `weight`, `measurement`, `mixed`
- Optional `left_photo_set_id` / `right_photo_set_id` and date anchors
- `measurement_keys` for measurement-focused comparisons

Actions: `src/modules/progress/comparison-actions.ts`

## Live photo comparison

`PhotoComparisonViewer`:

1. User picks **earlier** and **later** photo sets
2. User picks **slot** (front, side L/R, back)
3. Signed URLs load per photo id
4. Missing slot / deleted source shows neutral unavailable copy

**No automated body analysis** — descriptive, user-selected comparison only. See ADR [0012](../architecture/ADR/0012-progress-comparisons-without-automated-body-analysis.md).

## Overlay slider

Intentionally omitted until a keyboard-accessible implementation exists.
