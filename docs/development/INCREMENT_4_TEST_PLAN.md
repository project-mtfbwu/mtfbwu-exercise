# Increment 4 test plan

## Automated

- Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm test`.
- Cover USDA/OFF schema validation, normalizers, source priority, macro/recipe
  calculations, and outbox payload guards.
- Add or maintain replay tests: the same nutrition payload twice must upsert
  the same IDs without duplicating meal items, recipe ingredients, custom-food
  records, or template items.

## Local Supabase

1. Start Docker and run `npx supabase db reset`.
2. Run `supabase/tests/increment3_auth_board_rls.sql` and
   `supabase/tests/increment4_nutrition_rls.sql` (see `SUPABASE_LOCAL.md` for
   the container command).
3. Confirm one user can read catalog foods but cannot read another user's
   private custom food, recipe, meal log, or goal.
4. Confirm authenticated clients cannot modify catalog/provider cache rows,
   including `branded_products` and `barcodes` (barcode → branded_product
   model, see `INCREMENT_4_NUTRITION.md`).
5. Confirm two branded products sharing one catalog food each resolve their
   own barcode to the correct `branded_product_id`, a duplicate
   `normalized_barcode` is rejected, and a `meal_log_items` nutrient snapshot
   does not drift after the source `food_nutrients` row is later corrected.

CI runs both SQL test files automatically (`.github/workflows/ci.yml`): every
push/PR starts a local Supabase stack, resets the database, executes both
files inside the `supabase_db_*` container, and fails the build on any
assertion error. This is in addition to, not a replacement for, running them
locally before pushing.

## Offline/manual

1. Go offline, create a meal draft, reload, then reconnect.
2. Confirm it remains locally available and synchronizes once.
3. Confirm retrying a failed record is idempotent.
4. Sign out and confirm the Dexie database—including drafts and outbox—is gone.

Barcode camera, OCR, AI meal parse, and workout flows are deferred and are not
test targets for Increment 4.
