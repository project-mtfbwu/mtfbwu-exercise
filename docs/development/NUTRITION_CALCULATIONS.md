# Nutrition calculations

Nutrition amounts are stored per 100 g in `food_nutrients`. For weighed food,
`amount = amount_per_100g × grams / 100`. For a named portion, first convert
with its `gram_weight × quantity`, then apply the same formula.

`amountFromPer100g` and `amountFromPortion` preserve unknown nutrients as
`null`; callers must not turn missing data into zero. Macro totals sum known
meal-item values using the utilities in `src/modules/nutrition/calculations/`.
Round only for display, not before aggregation.

When a meal is recorded, persist its computed calories, protein, carbohydrate,
fat, fiber, full nutrient JSON, display name, and source snapshot to
`meal_logs`/`meal_log_items`. Recipe/template recalculation affects future use
only; it never changes a performed meal.

## Recipe-log identity

`meal_log_items.item_type` is `'food'` or `'recipe'`. A recipe item sets
`recipe_id` (not `food_id`) and its macro snapshot is the recipe's ingredient
totals scaled to the servings logged, computed once at save time from
`recipe_ingredients` and `recipes.serving_count`/`final_cooked_weight_g`. The
ingredient list that produced those macros — food id, display name, and
scaled gram amount — is frozen into `nutrient_snapshot_json.ingredients`
alongside the recipe id and version in `source_snapshot`, so a later edit to
the recipe (a changed ingredient, quantity, or serving count) never changes
an already-performed log. See
`docs/development/INCREMENT_4_NUTRITION.md#recipe-log-identity-model` for the
full model and how the offline outbox mirrors it.
