# MTFBWU curated foods

## Status and scope

This is a deliberately small, Indian-household-oriented starter catalog seeded by
`20260727120100_increment4_curated_foods_seed.sql`. It contains ingredients and
single-species fish only; it does **not** model mixed dishes. Do not use a row
below to infer macros for curry, sabzi, biryani, dal prepared with tempering, or
any other prepared mixed dish.

All nutrient values are per **100 g edible portion**. `food_state` is part of a
food's identity: raw rice and cooked rice, and dry and hydrated soy chunks, are
separate records. The seed has 35 foods, each with a default 100 g portion and
energy, protein, carbohydrate, fat, and fiber nutrient rows.

## Provenance and verification policy

- Curated rows rank below a user's custom food and above provider cache results;
  see `docs/development/NUTRITION_SOURCES.md`. Ranking never changes the
  provisional status described below.
- `source` is `mtfbwu_curated` for every seed row, matching the catalog enum.
- A `usda_fdc:<id>` identifier records a public USDA FoodData Central candidate
  for subsequent source review. It does **not** make the row verified: this
  migration was not generated from an FDC response snapshot.
- `mtfbwu_curated:<slug>` means no source record has yet been accepted. Values
  are provisional, documented USDA-style/generic approximations.
- Every row starts `verified = false`. Before a row becomes verified, a
  maintainer must retrieve the exact source record, compare the source's
  preparation/state and nutrients, record the retrieval date, and update the
  migration replacement path or catalog import process.
- The generic paneer, Greek yogurt, whey, mixed bone-in chicken, oils marked
  generic, tofu, soy chunks, psyllium, and rohu placeholder are
  `user_editable = true`. Their labels or local recipe/product information take
  precedence over this starter value.

## Global assumptions and limitations

- Values do not include salt, oil, masala, sauces, cooking loss, hydration
  beyond the explicitly hydrated soy row, bones, peel/skin exceptions stated
  below, or brand fortification.
- Raw animal foods describe uncooked edible tissue. Cooked yield must be logged
  with a cooked record, not by reusing raw grams.
- Fish are species-specific. Never substitute Atlantic salmon values for rohu,
  or vice versa.
- FDC identifiers are public candidate identifiers retained for review; they
  must be checked in FoodData Central before the record is marked verified.

## Seed inventory

Every row is inserted with `foods.source = 'mtfbwu_curated'` and
`verified = false`. `Source ID` below is the seed's `foods.source_id` value,
which encodes the underlying provenance: a `usda_fdc:<n>` id names a public
USDA FoodData Central candidate record that has **not** been fetched or
confirmed against a live FDC response (`Data type` = "USDA candidate —
provisional"); a `mtfbwu_curated:<slug>` id means no external source record
has been accepted at all and the row is a documented generic/placeholder
approximation (`Data type` = "MTFBWU generic — provisional", or "— unverified
placeholder" for the two rows with unknown cut/species composition). See
"Provenance and verification policy" above for what turns a row verified.

| Food                              | State    | Source org                        | Source ID                           | Data type                               | Verified | Known limitation                                                                     |
| --------------------------------- | -------- | --------------------------------- | ----------------------------------- | --------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| Whole egg                         | raw      | USDA FoodData Central (candidate) | `748967`                            | USDA candidate — provisional            | false    | Whole raw egg, edible portion only; FDC value not yet fetched.                       |
| Rolled oats                       | dry      | USDA FoodData Central (candidate) | `234639`                            | USDA candidate — provisional            | false    | Plain dry rolled oats; no milk or toppings.                                          |
| White rice                        | raw      | USDA FoodData Central (candidate) | `168878`                            | USDA candidate — provisional            | false    | Dry/raw long-grain white rice; variety/enrichment unconfirmed.                       |
| White rice                        | cooked   | USDA FoodData Central (candidate) | `169756`                            | USDA candidate — provisional            | false    | Plain cooked long-grain rice, no salt/fat; water ratio unconfirmed.                  |
| Chicken breast, skinless boneless | raw      | USDA FoodData Central (candidate) | `171077`                            | USDA candidate — provisional            | false    | Raw, skinless, boneless edible meat; cut-specific FDC unconfirmed.                   |
| Chicken thigh, skinless boneless  | raw      | MTFBWU curated (provisional)      | `chicken-thigh-raw`                 | MTFBWU generic — provisional            | false    | Generic raw thigh; no bone or skin; needs an exact FDC record.                       |
| Chicken, mixed bone-in            | raw      | MTFBWU curated (provisional)      | `chicken-mixed-bone-in-placeholder` | MTFBWU generic — unverified placeholder | false    | Cut mix and edible yield unknown; do not verify as-is, replace instead.              |
| Paneer, low-fat                   | prepared | MTFBWU curated (provisional)      | `paneer-low-fat-generic`            | MTFBWU generic — provisional            | false    | Milk type and draining materially change macros; user-editable.                      |
| Greek yogurt, plain               | prepared | MTFBWU curated (provisional)      | `greek-yogurt-plain-generic`        | MTFBWU generic — provisional            | false    | Plain only; fat/protein vary by product; user-editable.                              |
| Whey protein powder               | packaged | MTFBWU curated (provisional)      | `whey-protein-generic`              | MTFBWU generic — provisional            | false    | Packaging/brand required for reliable macros; user-editable.                         |
| Banana                            | raw      | USDA FoodData Central (candidate) | `173944`                            | USDA candidate — provisional            | false    | Raw edible fruit, no peel; FDC value not yet fetched.                                |
| Guava                             | raw      | USDA FoodData Central (candidate) | `168153`                            | USDA candidate — provisional            | false    | Raw edible fruit; seed/variety differences remain.                                   |
| Orange                            | raw      | USDA FoodData Central (candidate) | `169097`                            | USDA candidate — provisional            | false    | Raw edible fruit, no peel; FDC value not yet fetched.                                |
| Flaxseed                          | dry      | USDA FoodData Central (candidate) | `169414`                            | USDA candidate — provisional            | false    | Dry whole seed; ground seed may log differently by product.                          |
| Chia seed                         | dry      | USDA FoodData Central (candidate) | `170554`                            | USDA candidate — provisional            | false    | Dry seed, not soaked chia pudding.                                                   |
| Psyllium husk                     | dry      | MTFBWU curated (provisional)      | `psyllium-husk-generic`             | MTFBWU generic — provisional            | false    | Fiber/calorie labelling varies by brand; user-editable.                              |
| Tofu, firm                        | prepared | MTFBWU curated (provisional)      | `tofu-firm-generic`                 | MTFBWU generic — provisional            | false    | Water and coagulant change macros; user-editable.                                    |
| Soy chunks                        | dry      | MTFBWU curated (provisional)      | `soy-chunks-dry-generic`            | MTFBWU generic — provisional            | false    | Dry weight; generic package profile; user-editable.                                  |
| Soy chunks                        | prepared | MTFBWU curated (provisional)      | `soy-chunks-hydrated-generic`       | MTFBWU generic — provisional            | false    | Assumes ~2.5x hydration, no added fat; user-editable.                                |
| Moong dal                         | dry      | MTFBWU curated (provisional)      | `moong-dal-dry`                     | MTFBWU generic — provisional            | false    | Generic split mung; no cooked-water conversion.                                      |
| Masoor dal                        | dry      | MTFBWU curated (provisional)      | `masoor-dal-dry`                    | MTFBWU generic — provisional            | false    | Generic dry red lentil; variety unconfirmed.                                         |
| Toor dal                          | dry      | MTFBWU curated (provisional)      | `toor-dal-dry`                      | MTFBWU generic — provisional            | false    | Generic dry split pigeon pea; variety unconfirmed.                                   |
| Chana dal                         | dry      | MTFBWU curated (provisional)      | `chana-dal-dry`                     | MTFBWU generic — provisional            | false    | Generic dry split chickpea; variety unconfirmed.                                     |
| Kidney beans / rajma              | dry      | MTFBWU curated (provisional)      | `rajma-dry`                         | MTFBWU generic — provisional            | false    | Generic dry kidney beans; not cooked rajma curry.                                    |
| Chickpeas                         | dry      | MTFBWU curated (provisional)      | `chickpeas-dry`                     | MTFBWU generic — provisional            | false    | Generic dry chickpeas; not cooked chana masala.                                      |
| Olive oil                         | prepared | USDA FoodData Central (candidate) | `171413`                            | USDA candidate — provisional            | false    | Plain oil only; no frying uptake estimate.                                           |
| Mustard oil                       | prepared | MTFBWU curated (provisional)      | `mustard-oil-generic`               | MTFBWU generic — provisional            | false    | Generic plain oil; user-editable.                                                    |
| Groundnut oil                     | prepared | MTFBWU curated (provisional)      | `groundnut-oil-generic`             | MTFBWU generic — provisional            | false    | Generic plain oil; user-editable.                                                    |
| Spinach                           | raw      | USDA FoodData Central (candidate) | `168462`                            | USDA candidate — provisional            | false    | Raw spinach; cooking concentration excluded.                                         |
| Tomato                            | raw      | USDA FoodData Central (candidate) | `170457`                            | USDA candidate — provisional            | false    | Raw tomato; no curry preparation.                                                    |
| Onion                             | raw      | USDA FoodData Central (candidate) | `170000`                            | USDA candidate — provisional            | false    | Raw onion; no fried onion oil uptake.                                                |
| Cucumber                          | raw      | USDA FoodData Central (candidate) | `168409`                            | USDA candidate — provisional            | false    | Raw cucumber with peel.                                                              |
| Broccoli                          | raw      | USDA FoodData Central (candidate) | `170379`                            | USDA candidate — provisional            | false    | Raw broccoli; no cooked yield.                                                       |
| Atlantic salmon                   | raw      | USDA FoodData Central (candidate) | `175167`                            | USDA candidate — provisional            | false    | Species-specific raw Atlantic salmon only; never use for rohu.                       |
| Rohu                              | raw      | MTFBWU curated (provisional)      | `rohu-raw-placeholder`              | MTFBWU generic — unverified placeholder | false    | Species-specific values not yet validated; replace only with a reviewed rohu source. |

Fixed UUIDs `9e210001-0000-4000-8000-000000000001` through `...0035` (in the
row order above) are the canonical template-reference ids; see
`supabase/migrations/20260727120100_increment4_curated_foods_seed.sql` for the
exact id-to-row mapping used by `starter-templates.ts`.

## UUID summary and counts

- Foods: **35**
- Fixed UUIDs: `...0001` through `...0035` under prefix
  `9e210001-0000-4000-8000-0000000000`; use the inventory above as the
  canonical template-reference list.
- Default 100 g portions: **35**
- Core nutrient rows: **175** (five per food)
- Verification: **0 verified, 35 unverified**
- `user_editable = true`: **11** generic or placeholder rows; all other rows
  remain curated but unverified pending review.
