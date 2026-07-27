# Nutrition source priority

Resolution order is defined in `src/modules/nutrition/sources/priority.ts`:

1. User custom food
2. MTFBWU curated food
3. Branded cache
4. Open Food Facts
5. USDA Foundation, SR Legacy, Survey, then Branded
6. Other

Search ranking does not make data authoritative. `foods.source`, `source_id`,
`verified`, source timestamps, and provider payload metadata preserve
provenance. The curated seed is deliberately `verified = false`; its notes
identify provisional entries. A meal log snapshots its selected values and
source, rather than inheriting later catalog corrections.

Use USDA for nutrient authority where a matching food exists. Use Open Food
Facts primarily for branded/barcode data. Custom food is private by default.
See ADR 0004 and `docs/data/MTFBWU_CURATED_FOODS.md`.
