-- Increment 4: normalized nutrition catalog, user meals, and ownership boundaries.
-- Curated food catalog seed data belongs in a later migration or seed file.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.food_source as enum (
    'user_custom',
    'mtfbwu_curated',
    'open_food_facts',
    'usda_foundation',
    'usda_sr_legacy',
    'usda_survey',
    'usda_branded',
    'branded_cache',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.food_state as enum (
    'raw', 'cooked', 'dry', 'prepared', 'packaged'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.meal_type as enum (
    'breakfast', 'lunch', 'evening', 'pre_workout', 'shake', 'dinner', 'snack', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.meal_item_type as enum ('food', 'recipe');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Catalog tables
-- ---------------------------------------------------------------------------

create table if not exists public.nutrient_definitions (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  display_name text not null,
  unit text not null,
  category text not null,
  daily_value_basis numeric,
  display_order integer not null default 100 check (display_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null,
  source public.food_source not null,
  source_id text,
  food_state public.food_state not null default 'prepared',
  category text,
  brand_name text,
  description text,
  edible_portion_percent numeric check (
    edible_portion_percent is null
    or (edible_portion_percent > 0 and edible_portion_percent <= 100)
  ),
  verified boolean not null default false,
  user_editable boolean not null default false,
  source_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (source, source_id)
);

create table if not exists public.food_aliases (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  source public.food_source not null default 'other',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (food_id, normalized_alias)
);

create table if not exists public.food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  label text not null,
  gram_weight numeric not null check (gram_weight > 0),
  source public.food_source not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists food_portions_one_default_per_food
  on public.food_portions (food_id)
  where is_default;

create table if not exists public.food_nutrients (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  nutrient_definition_id uuid not null references public.nutrient_definitions (id) on delete restrict,
  amount_per_100g numeric not null check (amount_per_100g >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (food_id, nutrient_definition_id)
);

create table if not exists public.branded_products (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null unique references public.foods (id) on delete cascade,
  manufacturer text,
  product_name text not null,
  ingredients_text text,
  package_quantity numeric check (package_quantity is null or package_quantity > 0),
  package_unit text,
  image_url text,
  source_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.barcodes (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  normalized_barcode text not null unique check (normalized_barcode ~ '^[0-9A-Za-z._-]+$'),
  source public.food_source not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- A custom food has exactly one owner mapping. `private = false` permits
-- catalog discovery while private foods remain visible only to their owner.
create table if not exists public.user_custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid not null unique references public.foods (id) on delete cascade,
  private boolean not null default true,
  label_image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Recipes, templates, and performed meals
-- ---------------------------------------------------------------------------

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  serving_count numeric not null default 1 check (serving_count > 0),
  version integer not null default 1 check (version >= 1),
  energy_kcal numeric,
  protein_g numeric,
  carbohydrate_g numeric,
  fat_g numeric,
  fiber_g numeric,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  portion_id uuid references public.food_portions (id) on delete set null,
  quantity numeric not null check (quantity > 0),
  unit text not null default 'g',
  sort_order integer not null default 0 check (sort_order >= 0),
  nutrient_snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  meal_type public.meal_type not null default 'custom',
  notes text,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  meal_template_id uuid not null references public.meal_templates (id) on delete cascade,
  item_type public.meal_item_type not null,
  food_id uuid references public.foods (id) on delete restrict,
  recipe_id uuid references public.recipes (id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit text not null default 'g',
  sort_order integer not null default 0 check (sort_order >= 0),
  nutrient_snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (item_type = 'food' and food_id is not null and recipe_id is null)
    or (item_type = 'recipe' and recipe_id is not null and food_id is null)
  )
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_record_id uuid not null references public.daily_records (id) on delete restrict,
  meal_type public.meal_type not null default 'custom',
  label text,
  consumed_at timestamptz not null default timezone('utc', now()),
  energy_kcal numeric not null default 0 check (energy_kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbohydrate_g numeric not null default 0 check (carbohydrate_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  fiber_g numeric not null default 0 check (fiber_g >= 0),
  version integer not null default 1 check (version >= 1),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  item_type public.meal_item_type not null,
  food_id uuid references public.foods (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  display_name_snapshot text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  energy_kcal numeric not null default 0 check (energy_kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbohydrate_g numeric not null default 0 check (carbohydrate_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  fiber_g numeric not null default 0 check (fiber_g >= 0),
  nutrient_snapshot_json jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (item_type = 'food' and food_id is not null and recipe_id is null)
    or (item_type = 'recipe' and recipe_id is not null and food_id is null)
  )
);

create table if not exists public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  effective_from date not null,
  calorie_target numeric check (calorie_target is null or calorie_target >= 0),
  protein_g_target numeric check (protein_g_target is null or protein_g_target >= 0),
  carbohydrate_g_target numeric check (carbohydrate_g_target is null or carbohydrate_g_target >= 0),
  fat_g_target numeric check (fat_g_target is null or fat_g_target >= 0),
  fiber_g_target numeric check (fiber_g_target is null or fiber_g_target >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, effective_from)
);

-- This private helper lets the user-custom ownership policy validate a new
-- mapping without exposing unowned custom food rows through the API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_user_custom_food(p_food_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.foods
    where id = p_food_id and source = 'user_custom'
  );
$$;

create or replace function private.can_read_food(p_food_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_custom_foods
    where food_id = p_food_id
      and (user_id = p_user_id or private = false)
  );
$$;

revoke all on function private.is_user_custom_food(uuid) from public;
revoke all on function private.can_read_food(uuid, uuid) from public;
grant execute on function private.is_user_custom_food(uuid) to authenticated, service_role;
grant execute on function private.can_read_food(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists foods_normalized_name_idx on public.foods (normalized_name);
create index if not exists foods_source_source_id_idx on public.foods (source, source_id);
create index if not exists food_aliases_normalized_alias_idx on public.food_aliases (normalized_alias);
create index if not exists food_portions_food_id_idx on public.food_portions (food_id);
create index if not exists food_nutrients_food_id_idx on public.food_nutrients (food_id);
create index if not exists barcodes_normalized_barcode_idx on public.barcodes (normalized_barcode);
create index if not exists user_custom_foods_user_id_idx on public.user_custom_foods (user_id);
create index if not exists recipes_user_id_active_idx on public.recipes (user_id, updated_at desc) where deleted_at is null;
create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id, sort_order);
create index if not exists meal_templates_user_type_idx on public.meal_templates (user_id, meal_type);
create index if not exists meal_template_items_template_idx on public.meal_template_items (meal_template_id, sort_order);
create index if not exists meal_logs_user_date_type_idx on public.meal_logs (user_id, daily_record_id, meal_type) where deleted_at is null;
create index if not exists meal_logs_user_consumed_at_idx on public.meal_logs (user_id, consumed_at desc) where deleted_at is null;
create index if not exists meal_log_items_meal_log_id_idx on public.meal_log_items (meal_log_id);
create index if not exists nutrition_goals_user_effective_idx on public.nutrition_goals (user_id, effective_from desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'nutrient_definitions', 'foods', 'food_aliases', 'food_portions',
    'food_nutrients', 'branded_products', 'barcodes', 'user_custom_foods',
    'recipes', 'recipe_ingredients', 'meal_templates', 'meal_template_items',
    'meal_logs', 'meal_log_items', 'nutrition_goals'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed stable nutrient definitions; curated foods intentionally deferred.
-- ---------------------------------------------------------------------------

insert into public.nutrient_definitions (
  stable_key, display_name, unit, category, daily_value_basis, display_order, active
) values
  ('energy_kcal', 'Energy', 'kcal', 'macronutrient', 2000, 10, true),
  ('protein_g', 'Protein', 'g', 'macronutrient', 50, 20, true),
  ('carbohydrate_g', 'Carbohydrate', 'g', 'macronutrient', 275, 30, true),
  ('fat_g', 'Fat', 'g', 'macronutrient', 78, 40, true),
  ('fiber_g', 'Fiber', 'g', 'macronutrient', 28, 50, true),
  ('sugar_g', 'Sugar', 'g', 'macronutrient', null, 60, true),
  ('saturated_fat_g', 'Saturated fat', 'g', 'macronutrient', 20, 70, true),
  ('sodium_mg', 'Sodium', 'mg', 'mineral', 2300, 80, true),
  ('calcium_mg', 'Calcium', 'mg', 'mineral', 1300, 90, true),
  ('iron_mg', 'Iron', 'mg', 'mineral', 18, 100, true),
  ('magnesium_mg', 'Magnesium', 'mg', 'mineral', 420, 110, true),
  ('potassium_mg', 'Potassium', 'mg', 'mineral', 4700, 120, true),
  ('vitamin_d_mcg', 'Vitamin D', 'mcg', 'vitamin', 20, 130, true),
  ('vitamin_b12_mcg', 'Vitamin B12', 'mcg', 'vitamin', 2.4, 140, true),
  ('omega_3_g', 'Omega-3', 'g', 'fatty_acid', null, 150, true)
on conflict (stable_key) do update set
  display_name = excluded.display_name,
  unit = excluded.unit,
  category = excluded.category,
  daily_value_basis = excluded.daily_value_basis,
  display_order = excluded.display_order,
  active = excluded.active,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.nutrient_definitions enable row level security;
alter table public.foods enable row level security;
alter table public.food_aliases enable row level security;
alter table public.food_portions enable row level security;
alter table public.food_nutrients enable row level security;
alter table public.branded_products enable row level security;
alter table public.barcodes enable row level security;
alter table public.user_custom_foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_templates enable row level security;
alter table public.meal_template_items enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_log_items enable row level security;
alter table public.nutrition_goals enable row level security;

-- System catalog rows are authenticated-read only. A private custom food is
-- visible only to its owner; an explicitly non-private custom food is readable
-- as part of the shared catalog.
create policy nutrient_definitions_select_authenticated on public.nutrient_definitions
  for select to authenticated using (active);

create policy foods_select_catalog_or_visible_custom on public.foods
  for select to authenticated using (
    source <> 'user_custom'
    or private.can_read_food(id, auth.uid())
  );

create policy foods_insert_own_custom on public.foods
  for insert to authenticated
  with check (source = 'user_custom' and user_editable = true);

create policy foods_update_own_custom on public.foods
  for update to authenticated
  using (
    source = 'user_custom'
    and exists (
      select 1 from public.user_custom_foods ucf
      where ucf.food_id = foods.id and ucf.user_id = auth.uid()
    )
  )
  with check (source = 'user_custom' and user_editable = true);

create policy foods_delete_own_custom on public.foods
  for delete to authenticated
  using (
    source = 'user_custom'
    and exists (
      select 1 from public.user_custom_foods ucf
      where ucf.food_id = foods.id and ucf.user_id = auth.uid()
    )
  );

create policy food_aliases_select_visible_food on public.food_aliases
  for select to authenticated using (
    exists (select 1 from public.foods f where f.id = food_id)
  );
create policy food_aliases_write_own_custom_food on public.food_aliases
  for all to authenticated
  using (
    exists (
      select 1
      from public.foods f
      join public.user_custom_foods ucf on ucf.food_id = f.id
      where f.id = food_id and f.source = 'user_custom' and ucf.user_id = auth.uid()
    )
  )
  with check (
    source = 'user_custom'
    and exists (
      select 1
      from public.foods f
      join public.user_custom_foods ucf on ucf.food_id = f.id
      where f.id = food_id and f.source = 'user_custom' and ucf.user_id = auth.uid()
    )
  );
create policy food_portions_select_visible_food on public.food_portions
  for select to authenticated using (
    exists (select 1 from public.foods f where f.id = food_id)
  );
create policy food_portions_write_own_custom_food on public.food_portions
  for all to authenticated
  using (
    exists (
      select 1
      from public.foods f
      join public.user_custom_foods ucf on ucf.food_id = f.id
      where f.id = food_id and f.source = 'user_custom' and ucf.user_id = auth.uid()
    )
  )
  with check (
    source = 'user_custom'
    and exists (
      select 1
      from public.foods f
      join public.user_custom_foods ucf on ucf.food_id = f.id
      where f.id = food_id and f.source = 'user_custom' and ucf.user_id = auth.uid()
    )
  );
create policy food_nutrients_select_visible_food on public.food_nutrients
  for select to authenticated using (
    exists (select 1 from public.foods f where f.id = food_id)
  );
create policy food_nutrients_write_own_custom_food on public.food_nutrients
  for all to authenticated
  using (
    exists (
      select 1
      from public.foods f
      join public.user_custom_foods ucf on ucf.food_id = f.id
      where f.id = food_id and f.source = 'user_custom' and ucf.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.foods f
      join public.user_custom_foods ucf on ucf.food_id = f.id
      where f.id = food_id and f.source = 'user_custom' and ucf.user_id = auth.uid()
    )
  );
create policy branded_products_select_visible_food on public.branded_products
  for select to authenticated using (
    exists (select 1 from public.foods f where f.id = food_id)
  );
create policy barcodes_select_visible_food on public.barcodes
  for select to authenticated using (
    exists (select 1 from public.foods f where f.id = food_id)
  );

create policy user_custom_foods_select_own on public.user_custom_foods
  for select to authenticated using (user_id = auth.uid());
create policy user_custom_foods_insert_own on public.user_custom_foods
  for insert to authenticated with check (
    user_id = auth.uid() and private.is_user_custom_food(food_id)
  );
create policy user_custom_foods_update_own on public.user_custom_foods
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.is_user_custom_food(food_id));
create policy user_custom_foods_delete_own on public.user_custom_foods
  for delete to authenticated using (user_id = auth.uid());

create policy recipes_select_own on public.recipes
  for select to authenticated using (user_id = auth.uid());
create policy recipes_insert_own on public.recipes
  for insert to authenticated with check (user_id = auth.uid());
create policy recipes_update_own on public.recipes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recipes_delete_own on public.recipes
  for delete to authenticated using (user_id = auth.uid());

create policy recipe_ingredients_select_own on public.recipe_ingredients
  for select to authenticated using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );
create policy recipe_ingredients_insert_own on public.recipe_ingredients
  for insert to authenticated with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );
create policy recipe_ingredients_update_own on public.recipe_ingredients
  for update to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));
create policy recipe_ingredients_delete_own on public.recipe_ingredients
  for delete to authenticated using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

create policy meal_templates_select_own on public.meal_templates
  for select to authenticated using (user_id = auth.uid());
create policy meal_templates_insert_own on public.meal_templates
  for insert to authenticated with check (user_id = auth.uid());
create policy meal_templates_update_own on public.meal_templates
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy meal_templates_delete_own on public.meal_templates
  for delete to authenticated using (user_id = auth.uid());

create policy meal_template_items_select_own on public.meal_template_items
  for select to authenticated using (
    exists (select 1 from public.meal_templates mt where mt.id = meal_template_id and mt.user_id = auth.uid())
  );
create policy meal_template_items_insert_own on public.meal_template_items
  for insert to authenticated with check (
    exists (select 1 from public.meal_templates mt where mt.id = meal_template_id and mt.user_id = auth.uid())
  );
create policy meal_template_items_update_own on public.meal_template_items
  for update to authenticated
  using (exists (select 1 from public.meal_templates mt where mt.id = meal_template_id and mt.user_id = auth.uid()))
  with check (exists (select 1 from public.meal_templates mt where mt.id = meal_template_id and mt.user_id = auth.uid()));
create policy meal_template_items_delete_own on public.meal_template_items
  for delete to authenticated using (
    exists (select 1 from public.meal_templates mt where mt.id = meal_template_id and mt.user_id = auth.uid())
  );

create policy meal_logs_select_own on public.meal_logs
  for select to authenticated using (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy meal_logs_insert_own on public.meal_logs
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy meal_logs_update_own on public.meal_logs
  for update to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy meal_logs_delete_own on public.meal_logs
  for delete to authenticated using (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );

create policy meal_log_items_select_own on public.meal_log_items
  for select to authenticated using (
    exists (
      select 1 from public.meal_logs ml
      join public.daily_records dr on dr.id = ml.daily_record_id
      where ml.id = meal_log_id and ml.user_id = auth.uid() and dr.user_id = auth.uid()
    )
  );
create policy meal_log_items_insert_own on public.meal_log_items
  for insert to authenticated with check (
    exists (
      select 1 from public.meal_logs ml
      join public.daily_records dr on dr.id = ml.daily_record_id
      where ml.id = meal_log_id and ml.user_id = auth.uid() and dr.user_id = auth.uid()
    )
  );
create policy meal_log_items_update_own on public.meal_log_items
  for update to authenticated
  using (
    exists (
      select 1 from public.meal_logs ml
      join public.daily_records dr on dr.id = ml.daily_record_id
      where ml.id = meal_log_id and ml.user_id = auth.uid() and dr.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meal_logs ml
      join public.daily_records dr on dr.id = ml.daily_record_id
      where ml.id = meal_log_id and ml.user_id = auth.uid() and dr.user_id = auth.uid()
    )
  );
create policy meal_log_items_delete_own on public.meal_log_items
  for delete to authenticated using (
    exists (
      select 1 from public.meal_logs ml
      join public.daily_records dr on dr.id = ml.daily_record_id
      where ml.id = meal_log_id and ml.user_id = auth.uid() and dr.user_id = auth.uid()
    )
  );

create policy nutrition_goals_select_own on public.nutrition_goals
  for select to authenticated using (user_id = auth.uid());
create policy nutrition_goals_insert_own on public.nutrition_goals
  for insert to authenticated with check (user_id = auth.uid());
create policy nutrition_goals_update_own on public.nutrition_goals
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nutrition_goals_delete_own on public.nutrition_goals
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges. Cache writes are service-role-only; authenticated clients can
-- read the catalog but cannot mutate branded products or barcode cache rows.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on public.nutrient_definitions, public.foods, public.food_aliases,
  public.food_portions, public.food_nutrients, public.branded_products, public.barcodes
  to authenticated;
grant select, insert, update, delete on public.user_custom_foods, public.recipes,
  public.recipe_ingredients, public.meal_templates, public.meal_template_items,
  public.meal_logs, public.meal_log_items, public.nutrition_goals to authenticated;
grant insert, update, delete on public.foods to authenticated;
grant insert, update, delete on public.food_aliases, public.food_portions,
  public.food_nutrients to authenticated;

grant all on public.nutrient_definitions, public.foods, public.food_aliases,
  public.food_portions, public.food_nutrients, public.branded_products, public.barcodes,
  public.user_custom_foods, public.recipes, public.recipe_ingredients,
  public.meal_templates, public.meal_template_items, public.meal_logs,
  public.meal_log_items, public.nutrition_goals to service_role;
grant usage, select on all sequences in schema public to authenticated;
