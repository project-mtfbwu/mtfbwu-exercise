# Increment 4 — Nutrition engine

Increment 4 establishes the nutrition persistence and integration foundation:
normalized foods/nutrients/portions, user custom foods, recipes and meal
templates, performed meal logs, goals, server-only USDA/OFF clients, and
offline nutrition drafts.

Performed `meal_logs` and `meal_log_items` are distinct from recipes and meal
templates. Meal items store display, macro, nutrient, and source snapshots so
historical logs remain stable when a food record changes.

## Meal focus UI (implemented)

`src/widgets/today-board/focus/meal-focus.tsx` and
`src/widgets/today-board/focus/meal/*` implement, on top of the base
search-and-log flow:

- **Saved meals** (`saved-meals-section.tsx`) — install a starter plan
  (Chicken / Plant-based / Fish), list saved meal templates for the current
  user, apply a template into a new meal log, or save the meal currently being
  built as a new template.
- **Custom food builder** (`custom-food-builder.tsx`, collapsible) — name,
  brand, food state, serving grams, and per-100 g macros with a required
  verification checkbox before a food is marked `verified`; saves through
  `saveCustomFoodAction` and adds the result straight into the meal being
  built.
- **Recipe builder** (`recipe-builder.tsx`, collapsible) — ingredient search
  (reuses the food search endpoint), amount per ingredient, optional final
  cooked weight and serving count, recipe macro totals computed with
  `@/modules/nutrition/calculations`. Recipes list with "Add serving" and
  soft "Delete". Adding a recipe serving logs **one `meal_log_items` row with
  `item_type = 'recipe'` and `recipe_id` set** — it no longer expands into
  per-ingredient food lines; see "Recipe-log identity model" below.
- **USDA import on demand** — a food search result that is not yet in the
  local catalog (id `usda:<fdcId>`, source starting with `usda_`) is
  materialized through `POST /api/nutrition/usda/materialize` before it can be
  logged: the server fetches the USDA detail, upserts `foods` +
  `food_nutrients` + a default `food_portions` row keyed on
  `(source, source_id)`, and returns the local food UUID, which the meal-focus
  UI then adds to the meal like any catalog food. A concurrent duplicate
  insert (`23505`) re-reads and returns the winning row instead of erroring.
  Search itself passes `includeUsda=true` so USDA candidates always appear
  alongside local matches; a provisional-values notice sits next to the
  search box since generic/USDA candidate rows are not yet verified (see
  `docs/data/MTFBWU_CURATED_FOODS.md`).
- **Nutrition goals** — goals are loaded for the active day and, when set,
  shown next to the meal totals; the flat-lay nutrition card's status label
  shows `consumed / target kcal` once a calorie target exists (see
  `nutritionStatusLabel` in `board-model.ts`). Goals are never invented; a
  day with no saved goals shows totals only.
- **Offline queuing** — when `useOnlineStore` reports offline (or
  `navigator.onLine` is false), saving a meal builds `meal_logs` +
  `meal_log_items` upsert writes locally (`buildMealLogWrites` in
  `nutrition-outbox.ts`) with client-generated UUIDs, queues them through
  `queueNutritionMutation`, and applies an optimistic update immediately.
  `sync-coordinator.ts` replays the same queued writes once back online;
  reusing the client-generated IDs keeps retries idempotent.
- Barcode scanning stays a disabled button labelled "Coming in a later
  increment" — camera capture is still out of scope for Increment 4.

## Starter templates

`src/modules/nutrition/meals/starter-templates.ts` defines three example
multi-meal day plans (`chicken`, `plant`, `fish`), each covering breakfast,
lunch, evening, pre-workout, and a shake, built from
`docs/data/MTFBWU_CURATED_FOODS.md` UUIDs. `installStarterTemplateAction`
inserts each plan's meals as `meal_templates` + `meal_template_items` for the
current user. Every installed plan carries `STARTER_TEMPLATE_NOTE`: these are
**example templates, not medical prescriptions**, portions should be reviewed
and adjusted per person, and fish calories vary by species so the specific
fish should be checked before trusting the totals.

## Server actions added this pass

`src/modules/nutrition/meals/actions.ts` (schemas split out to `schemas.ts`,
starter data to `starter-templates.ts` — a `"use server"` file may only export
async functions, so shared constants/schemas cannot live inline anymore):

- `listMealTemplatesAction` / `applyMealTemplateAction` — list saved templates
  with items (food or recipe); apply one into a new meal log via
  `saveMealLogAction`, which accepts both item shapes (see "Recipe-log
  identity model" below). `saveMealAsTemplateAction` and
  `installStarterTemplateAction` still only ever write food items today —
  saving a recipe-containing meal as a template, or adding a recipe to a
  starter plan, is not yet wired up.
- `saveCustomFoodAction` — inserts `foods` (`source = user_custom`,
  `user_editable = true`, `verified` only when the caller confirms the
  checkbox), `food_nutrients` rows resolved against `nutrient_definitions`
  by `stable_key`, a default `food_portions` row, and a private
  `user_custom_foods` ownership row; an optional barcode is written to
  `barcodes` when supplied. Macros must be non-negative and serving
  grams is required.
- `saveRecipeAction` / `deleteRecipeAction` / `listRecipesAction` — create or
  update a recipe and its ingredients (nutrient snapshot + macro totals via
  the shared calculation helpers), soft-delete (`deleted_at`), and list
  recipes with ingredient `per100g` data for client-side recalculation.
- `loadNutritionGoalsAction` / `updateNutritionGoalsAction` — read/write
  `nutrition_goals` for a given local date. Missing goals stay `null`; no
  default targets are fabricated.

## Schema alignment migration

`supabase/migrations/20260727120200_increment4_nutrition_align.sql` adds, on
top of `20260727120000_increment4_nutrition.sql`, the columns the actions
above need (all additive — `IF NOT EXISTS` / nullable `ALTER`, safe to run
after the base migration and its curated seed):

- `recipes.final_cooked_weight_g numeric` (`> 0` when set)
- `recipes.default_serving_g numeric` (`> 0` when set)
- `meal_templates.deleted_at timestamptz`
- `meal_logs.source_template_id uuid references meal_templates(id) on delete set null`
- `food_nutrients.source food_source not null default 'other'`
- `food_nutrients.source_reference text`
- `food_aliases.locale text not null default 'en'`

It also replaces the `meal_templates_select_own` RLS select policy so
soft-deleted templates (`deleted_at is not null`) never surface through a
normal select, and adds two supporting partial indexes
(`meal_templates_user_type_active_idx`, `meal_logs_source_template_idx`).

No deviations from the requested schema patch were needed — every column and
policy change landed as specified.

## Barcode → branded_product model

`supabase/migrations/20260727130000_increment4_barcode_provenance.sql`
corrects the original one-food-one-brand assumption: a `barcodes` row now
identifies a **`branded_products` row** (`branded_product_id`, not-null
`references branded_products(id)`), and `branded_products` no longer has a
unique constraint on `food_id` — multiple brands/package sizes (each with
their own barcode) can point at the same generic catalog `foods` row. Reads
flow `barcodes → branded_products → foods`; the `branded_products` and
`barcodes` select policies check the same "catalog or owned custom food"
visibility rule against the food at the end of that chain. Both tables stay
cache/catalog data: authenticated clients get `select` only (no insert /
update / delete grants and no write policies), matching the existing
foods/nutrients provenance model — cache population is server-only.

`foods` also gained explicit provenance columns in the same migration
(`source_organization`, `source_dataset`, `source_reference`, `reviewed_at`,
`provenance_notes`) so curated rows carry an honest, inspectable trail
instead of an implied "verified" status; see `NUTRITION_SOURCES.md`.

`supabase/tests/increment4_nutrition_rls.sql` covers this model: two
`branded_products` on one `food_id` each get their own barcode and both
resolve to the correct `branded_product_id`; a duplicate `normalized_barcode`
is rejected by the unique constraint; authenticated inserts/updates against
`barcodes` / `branded_products` are denied; and a `meal_log_items` nutrient
snapshot taken at log time stays stable after the underlying
`food_nutrients` value is later corrected.

## Recipe-log identity model

A performed meal item is either a **food line** or a **recipe line**,
distinguished by `meal_log_items.item_type` (`'food' | 'recipe'`):

- Food line: `food_id` is set, `recipe_id` is `null`. Snapshot fields
  (`display_name_snapshot`, `energy_kcal`/`protein_g`/`carbohydrate_g`/
  `fat_g`/`fiber_g`, `nutrient_snapshot_json`, `source_snapshot`) come from
  the food's `food_nutrients` at `amountG`, exactly as before.
- Recipe line: `recipe_id` is set, `food_id` is `null`. The macro snapshot is
  the recipe's ingredient totals scaled to the logged `servings` (default 1)
  of the recipe's `serving_count`; `nutrient_snapshot_json.ingredients` and
  `source_snapshot` (`{ source: "recipe", recipe_id, recipe_version }`)
  freeze **which ingredients, at what gram amounts, and which recipe version**
  produced the logged macros, so editing the recipe later never changes a
  historical log.

This applies everywhere a meal is written:

- `saveMealLogAction` (`schemas.ts`'s `saveMealSchema`) takes a discriminated
  `items` array — `{ itemType: 'food', foodId, amountG }` or
  `{ itemType: 'recipe', recipeId, amountG?, servings? }` — and resolves each
  kind to the item-row shape above before insert.
- The offline outbox (`nutrition-outbox.ts`) mirrors the same shape:
  `MealLogOutboxItemInput` carries `itemType` + nullable `foodId`/`recipeId`,
  and `buildMealLogWrites` writes `item_type`/`food_id`/`recipe_id` plus a
  recipe-specific `nutrient_snapshot_json.ingredients` and `source_snapshot`
  so a meal logged offline with a recipe line replays identically once
  synced.
- The meal-focus UI's recipe builder (`recipe-builder.tsx`) calls
  `onAddServing(recipe: RecipeView)` directly — adding a recipe serving adds
  **one** meal line (`itemType: 'recipe'`) instead of expanding into one line
  per ingredient. The meal item list shows a "Recipe" badge and an optional
  expandable ingredient list read from `recipeIngredientsSnapshot`.

## Search API enrichment

`src/app/api/nutrition/search/route.ts` now enriches locally-sourced search
results with per-100 g macros (`enrichWithLocalNutrients`) so the meal-focus
UI, custom food builder, and recipe builder can compute and recompute macros
client-side as amounts change, instead of showing zeroed-out values until the
next server round trip.

## Offline boundary

Dexie v2 adds `mealLogDrafts`. `nutrition-outbox.ts` queues primary-keyed,
dependency-ordered upserts for `meal_log`, `recipe`, `custom_food`, and
`meal_template`. A retry replays the same IDs and does not duplicate rows.
Authentication actions are never offline-capable; logout deletes Dexie.

One known limitation carried into a later increment: an offline meal edit
replays as an upsert of the meal log and its items, but does not delete
server-side items that were removed locally while offline. Reconciling
deletions made while offline needs a dedicated merge pass and is out of
scope here.

## Deferred

Camera barcode scanning, OCR, AI meal parsing, offline deletion
reconciliation, saving a recipe-containing meal as a template, adding a
recipe to a starter plan, and workouts are not Increment 4 deliverables. See
`INCREMENT_4_TEST_PLAN.md`.
