# ADR 0004 — Nutrition source priority

## Status

Accepted — 2026-07-26

## Context

Food data comes from USDA FoodData Central (CC0), Open Food Facts (ODbL/DbCL; API rate-limited), user entry, and AI proposals. Macros must be comparable and honest about provenance. wger’s `Source` enum (WGER / OFF / USDA) shows the need for explicit sources — **concept only (AGPL)**.

## Decision

Normalize all foods into `food_items` with `source`, external ids, and `review_status`.

### Priority when resolving a product

1. **User-confirmed** local FoodItem (including edited imports)
2. **USDA** Foundation / SR Legacy analytical data for generic foods (server-side API, cached)
3. **Open Food Facts** for packaged barcode products (cached; custom User-Agent)
4. **USDA Branded** when OFF missing/poor and FDC branded hit exists
5. **AI-proposed** macros — never auto-trusted; require review

### Operational rules

- USDA API key: **server-only** (USDA API Guide key responsibility)
- OFF: cache by barcode; respect rate limits; prefer bulk exports if volume grows
- Meal entries store `nutrients_snapshot` at log time so cache refreshes don’t rewrite history
- Attribution: cite FDC; comply with OFF license/attribution for redistributed data/images

## Consequences

**Positive:** Clear provenance; offline meals remain stable; license-safe API usage.

**Negative:** Matching heuristics (name/barcode) need care; dual-API complexity; crowd-sourced OFF data quality varies.

**Reject:** Client-side USDA keys; treating AI macros as trusted; vendoring AGPL Product Opener.

## References

- https://fdc.nal.usda.gov/api-guide/
- https://openfoodfacts.github.io/openfoodfacts-server/api/
- `DATA_MODEL.md`, `AI_IMPORT_PIPELINE.md`, `REFERENCE_PROJECTS_RESEARCH.md`
