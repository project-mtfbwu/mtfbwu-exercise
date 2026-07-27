-- Increment 4 nutrition schema and RLS checks.
-- Run after migrations, for example:
--   Get-Content supabase/tests/increment4_nutrition_rls.sql -Raw |
--     docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
-- The transaction rolls back all fixture rows. A failing assertion raises an exception.
-- Barcode / branded_product assertions below assume migration
-- 20260727130000_increment4_barcode_provenance.sql has been applied.

begin;

do $$
declare
  expected_keys text[] := array[
    'energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'fiber_g', 'sugar_g',
    'saturated_fat_g', 'sodium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg',
    'potassium_mg', 'vitamin_d_mcg', 'vitamin_b12_mcg', 'omega_3_g'
  ];
  missing_key text;
begin
  select key into missing_key
  from unnest(expected_keys) as key
  where not exists (
    select 1 from public.nutrient_definitions nd where nd.stable_key = key
  )
  limit 1;

  if missing_key is not null then
    raise exception 'missing seeded nutrient definition: %', missing_key;
  end if;

  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'nutrient_definitions', 'foods', 'food_aliases', 'food_portions',
        'food_nutrients', 'branded_products', 'barcodes', 'user_custom_foods',
        'recipes', 'recipe_ingredients', 'meal_templates', 'meal_template_items',
        'meal_logs', 'meal_log_items', 'nutrition_goals'
      ])
      and c.relrowsecurity
  ) <> 15 then
    raise exception 'every Increment 4 nutrition table must have RLS enabled';
  end if;
end $$;

do $$
declare
  user_one uuid := '10000000-0000-0000-0000-000000000001';
  user_two uuid := '10000000-0000-0000-0000-000000000002';
  catalog_food uuid := '20000000-0000-0000-0000-000000000001';
  private_food uuid := '20000000-0000-0000-0000-000000000002';
  recipe_one uuid := '30000000-0000-0000-0000-000000000001';
  recipe_two uuid := '30000000-0000-0000-0000-000000000002';
  record_one uuid := '40000000-0000-0000-0000-000000000001';
  record_two uuid := '40000000-0000-0000-0000-000000000002';
  meal_one uuid := '50000000-0000-0000-0000-000000000001';
  meal_two uuid := '50000000-0000-0000-0000-000000000002';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment4-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment4-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.profiles (id) values (user_one), (user_two)
  on conflict (id) do nothing;

  insert into public.foods (
    id, canonical_name, normalized_name, source, source_id, food_state, verified
  ) values
    (catalog_food, 'Catalog oats', 'catalog oats', 'mtfbwu_curated', 'increment4-catalog-oats', 'dry', true),
    (private_food, 'Private oats', 'private oats', 'user_custom', null, 'prepared', false)
  on conflict (id) do nothing;

  insert into public.user_custom_foods (user_id, food_id, private)
  values (user_two, private_food, true)
  on conflict (food_id) do nothing;

  insert into public.recipes (id, user_id, name)
  values
    (recipe_one, user_one, 'User one recipe'),
    (recipe_two, user_two, 'User two recipe')
  on conflict (id) do nothing;

  insert into public.daily_records (id, user_id, local_date)
  values
    (record_one, user_one, date '2026-07-27'),
    (record_two, user_two, date '2026-07-27')
  on conflict (id) do nothing;

  insert into public.meal_logs (id, user_id, daily_record_id, meal_type)
  values
    (meal_one, user_one, record_one, 'breakfast'),
    (meal_two, user_two, record_two, 'breakfast')
  on conflict (id) do nothing;

  insert into public.nutrition_goals (user_id, effective_from, calorie_target)
  values
    (user_one, date '2026-07-27', 2000),
    (user_two, date '2026-07-27', 3000)
  on conflict (user_id, effective_from) do nothing;
end $$;

-- Barcode -> branded_product fixtures: two brands sharing the same catalog food,
-- each with its own barcode; a food_nutrients row that later changes value after
-- a meal has already snapshotted it.
do $$
declare
  catalog_food uuid := '20000000-0000-0000-0000-000000000001';
  recipe_one uuid := '30000000-0000-0000-0000-000000000001';
  meal_one uuid := '50000000-0000-0000-0000-000000000001';
  branded_one uuid := '60000000-0000-0000-0000-000000000001';
  branded_two uuid := '60000000-0000-0000-0000-000000000002';
  meal_item_food uuid := '80000000-0000-0000-0000-000000000001';
  meal_item_recipe uuid := '80000000-0000-0000-0000-000000000002';
  energy_def uuid;
  duplicate_rejected boolean := false;
begin
  insert into public.branded_products (id, food_id, product_name, brand_name, source, source_id)
  values
    (branded_one, catalog_food, 'Catalog Oats 500g Bag', 'Brand One', 'branded_cache', 'increment4-branded-one'),
    (branded_two, catalog_food, 'Catalog Oats 1kg Tub', 'Brand Two', 'branded_cache', 'increment4-branded-two')
  on conflict (id) do nothing;

  insert into public.barcodes (branded_product_id, normalized_barcode, barcode_type)
  values
    (branded_one, 'increment4-barcode-one', 'ean13'),
    (branded_two, 'increment4-barcode-two', 'ean13')
  on conflict (normalized_barcode) do nothing;

  -- A second barcode row reusing an already-claimed normalized_barcode must be rejected.
  begin
    insert into public.barcodes (branded_product_id, normalized_barcode, barcode_type)
    values (branded_two, 'increment4-barcode-one', 'ean13');
    raise exception 'duplicate normalized_barcode insert was not rejected';
  exception
    when unique_violation then duplicate_rejected := true;
  end;

  if not duplicate_rejected then
    raise exception 'expected a unique_violation for duplicate normalized_barcode';
  end if;

  -- Snapshot-stability fixture: log a meal item against the current nutrient
  -- value, then mutate the catalog's food_nutrients row as a later correction
  -- would. The already-logged item must keep its original snapshot.
  select id into energy_def from public.nutrient_definitions where stable_key = 'energy_kcal';

  insert into public.food_nutrients (food_id, nutrient_definition_id, amount_per_100g)
  values (catalog_food, energy_def, 389)
  on conflict (food_id, nutrient_definition_id)
  do update set amount_per_100g = excluded.amount_per_100g;

  insert into public.meal_log_items (
    id, meal_log_id, item_type, food_id, display_name_snapshot, quantity, unit,
    energy_kcal, nutrient_snapshot_json
  ) values (
    meal_item_food, meal_one, 'food', catalog_food, 'Catalog oats', 100, 'g',
    389, jsonb_build_object('energy_kcal', 389)
  )
  on conflict (id) do nothing;

  insert into public.meal_log_items (
    id, meal_log_id, item_type, recipe_id, display_name_snapshot, quantity, unit,
    energy_kcal, nutrient_snapshot_json
  ) values (
    meal_item_recipe, meal_one, 'recipe', recipe_one, 'User one recipe', 1, 'serving',
    0, '{}'::jsonb
  )
  on conflict (id) do nothing;

  -- Simulate a later catalog correction changing the underlying nutrient value.
  update public.food_nutrients
  set amount_per_100g = 999
  where food_id = catalog_food and nutrient_definition_id = energy_def;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

do $$
declare
  changed_rows integer;
  branded_one uuid := '60000000-0000-0000-0000-000000000001';
  branded_two uuid := '60000000-0000-0000-0000-000000000002';
  meal_item_food uuid := '80000000-0000-0000-0000-000000000001';
  meal_item_recipe uuid := '80000000-0000-0000-0000-000000000002';
  resolved_food_id uuid;
  snapshot_energy numeric;
  current_amount numeric;
begin
  if not exists (
    select 1 from public.foods where id = '20000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'authenticated user cannot read catalog food';
  end if;

  if exists (
    select 1 from public.foods where id = '20000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'another user can read a private custom food';
  end if;

  if not exists (
    select 1 from public.recipes where id = '30000000-0000-0000-0000-000000000001'
  ) or exists (
    select 1 from public.recipes where id = '30000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'recipe ownership RLS failed';
  end if;

  if not exists (
    select 1 from public.meal_logs where id = '50000000-0000-0000-0000-000000000001'
  ) or exists (
    select 1 from public.meal_logs where id = '50000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'meal log ownership RLS failed';
  end if;

  if (
    select count(*) from public.nutrition_goals
  ) <> 1 then
    raise exception 'nutrition goal ownership RLS failed';
  end if;

  update public.foods
  set canonical_name = 'Unauthorized catalog change'
  where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'authenticated user modified a system food row';
  end if;

  -- Two branded products on the same food, each with a distinct barcode that
  -- resolves to the correct branded_product id.
  select bp.food_id into resolved_food_id
  from public.barcodes b
  join public.branded_products bp on bp.id = b.branded_product_id
  where b.normalized_barcode = 'increment4-barcode-one' and b.branded_product_id = branded_one;

  if resolved_food_id is null or resolved_food_id <> '20000000-0000-0000-0000-000000000001' then
    raise exception 'barcode one did not resolve to the expected branded_product / food';
  end if;

  select bp.food_id into resolved_food_id
  from public.barcodes b
  join public.branded_products bp on bp.id = b.branded_product_id
  where b.normalized_barcode = 'increment4-barcode-two' and b.branded_product_id = branded_two;

  if resolved_food_id is null or resolved_food_id <> '20000000-0000-0000-0000-000000000001' then
    raise exception 'barcode two did not resolve to the expected branded_product / food';
  end if;

  if (
    select count(distinct branded_product_id)
    from public.barcodes
    where normalized_barcode in ('increment4-barcode-one', 'increment4-barcode-two')
  ) <> 2 then
    raise exception 'both barcodes must resolve to distinct branded_product ids';
  end if;

  -- Authenticated clients may read the barcode cache but never write it.
  begin
    insert into public.barcodes (branded_product_id, normalized_barcode)
    values (branded_one, 'increment4-authenticated-write');
    raise exception 'authenticated user inserted a barcode cache row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.branded_products
    set product_name = 'Unauthorized branded product rename'
    where id = branded_one;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 0 then
      raise exception 'authenticated user updated a branded_products cache row';
    end if;
  exception
    when insufficient_privilege then null;
  end;

  -- Snapshot stability: the underlying nutrient changed after logging, but the
  -- already-recorded meal_log_item snapshot must not drift.
  select (nutrient_snapshot_json ->> 'energy_kcal')::numeric into snapshot_energy
  from public.meal_log_items
  where id = meal_item_food;

  if snapshot_energy is distinct from 389 then
    raise exception 'meal_log_item nutrient snapshot drifted after food_nutrients update';
  end if;

  select fn.amount_per_100g into current_amount
  from public.food_nutrients fn
  join public.nutrient_definitions nd on nd.id = fn.nutrient_definition_id
  where fn.food_id = '20000000-0000-0000-0000-000000000001' and nd.stable_key = 'energy_kcal';

  if current_amount is distinct from 999 then
    raise exception 'expected the catalog food_nutrients row to reflect the later correction';
  end if;

  -- A recipe-identity meal_log_item (item_type = recipe, recipe_id set) is
  -- readable by its owner.
  if not exists (
    select 1 from public.meal_log_items
    where id = meal_item_recipe
      and item_type = 'recipe'
      and recipe_id = '30000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'owner cannot read their own recipe meal_log_item';
  end if;
end $$;

rollback;
