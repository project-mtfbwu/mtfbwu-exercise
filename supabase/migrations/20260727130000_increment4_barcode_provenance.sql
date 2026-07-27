-- Increment 4 correction: barcode → branded_product ownership, multi-brand
-- foods, and curated provenance metadata. Safe for local/dev resets.

-- ---------------------------------------------------------------------------
-- Provenance columns on foods (do not invent verification)
-- ---------------------------------------------------------------------------

alter table public.foods
  add column if not exists source_organization text;

alter table public.foods
  add column if not exists source_dataset text;

alter table public.foods
  add column if not exists source_reference text;

alter table public.foods
  add column if not exists reviewed_at date;

alter table public.foods
  add column if not exists provenance_notes text;

-- ---------------------------------------------------------------------------
-- branded_products: allow many brands per generic food; expand product fields
-- ---------------------------------------------------------------------------

alter table public.branded_products
  drop constraint if exists branded_products_food_id_key;

alter table public.branded_products
  add column if not exists brand_name text;

alter table public.branded_products
  add column if not exists serving_size numeric;

alter table public.branded_products
  add column if not exists serving_unit text;

alter table public.branded_products
  add column if not exists serving_grams numeric
  check (serving_grams is null or serving_grams > 0);

alter table public.branded_products
  add column if not exists source public.food_source;

alter table public.branded_products
  add column if not exists source_id text;

alter table public.branded_products
  add column if not exists country_codes text[] not null default '{}'::text[];

alter table public.branded_products
  add column if not exists allergens_text text;

alter table public.branded_products
  add column if not exists source_payload_hash text;

alter table public.branded_products
  add column if not exists last_fetched_at timestamptz;

update public.branded_products
set brand_name = coalesce(brand_name, manufacturer)
where brand_name is null and manufacturer is not null;

update public.branded_products
set source = 'branded_cache'
where source is null;

create index if not exists branded_products_food_id_idx
  on public.branded_products (food_id);

create unique index if not exists branded_products_source_source_id_uidx
  on public.branded_products (source, source_id)
  where source_id is not null;

-- ---------------------------------------------------------------------------
-- barcodes: identify one branded product (not a bare food)
-- ---------------------------------------------------------------------------

alter table public.barcodes
  add column if not exists branded_product_id uuid
  references public.branded_products (id) on delete cascade;

alter table public.barcodes
  add column if not exists barcode_type text;

-- Ensure every barcode's food has a branded_product row, then link.
insert into public.branded_products (food_id, product_name, brand_name, source, source_id)
select
  f.id,
  f.canonical_name,
  f.brand_name,
  coalesce(
    case when b.source = 'user_custom' then 'user_custom'::public.food_source else b.source end,
    'branded_cache'::public.food_source
  ),
  coalesce(f.source_id, b.normalized_barcode)
from public.barcodes b
join public.foods f on f.id = b.food_id
where b.branded_product_id is null
  and not exists (
    select 1 from public.branded_products bp where bp.food_id = f.id
  );

update public.barcodes b
set branded_product_id = bp.id
from public.branded_products bp
where b.branded_product_id is null
  and bp.food_id = b.food_id;

-- Orphans (should not exist after the insert/update above)
delete from public.barcodes where branded_product_id is null;

alter table public.barcodes
  alter column branded_product_id set not null;

-- Drop old policies before dropping food_id (they depend on the column).
drop policy if exists barcodes_select_visible_food on public.barcodes;
drop policy if exists branded_products_select_visible_food on public.branded_products;
drop trigger if exists barcodes_set_updated_at on public.barcodes;

alter table public.barcodes
  drop constraint if exists barcodes_food_id_fkey;

alter table public.barcodes
  drop column if exists food_id;

alter table public.barcodes
  drop column if exists source;

alter table public.barcodes
  drop column if exists source_updated_at;

alter table public.barcodes
  drop column if exists updated_at;

create index if not exists barcodes_branded_product_id_idx
  on public.barcodes (branded_product_id);

-- ---------------------------------------------------------------------------
-- RLS: barcode visibility via branded_product → food
-- ---------------------------------------------------------------------------

create policy barcodes_select_visible_food on public.barcodes
  for select to authenticated using (
    exists (
      select 1
      from public.branded_products bp
      join public.foods f on f.id = bp.food_id
      where bp.id = branded_product_id
        and (
          f.source <> 'user_custom'
          or private.can_read_food(f.id, auth.uid())
        )
    )
  );

create policy branded_products_select_visible_food on public.branded_products
  for select to authenticated using (
    exists (
      select 1
      from public.foods f
      where f.id = food_id
        and (
          f.source <> 'user_custom'
          or private.can_read_food(f.id, auth.uid())
        )
    )
  );

-- Authenticated users still may not insert/update/delete cache rows.
-- (No write policies = denied under RLS for authenticated.)

-- ---------------------------------------------------------------------------
-- Curated food provenance updates (explicit; no invented verification)
-- ---------------------------------------------------------------------------

update public.foods set
  source_organization = case
    when source_id like 'usda_fdc:%' then 'USDA FoodData Central'
    else 'MTFBWU curated (provisional)'
  end,
  source_dataset = case
    when source_id like 'usda_fdc:%' then 'FDC candidate (unverified snapshot)'
    else 'mtfbwu_curated provisional macros'
  end,
  source_reference = source_id,
  reviewed_at = null,
  provenance_notes = coalesce(
    provenance_notes,
    description
  ),
  verified = false
where source = 'mtfbwu_curated';
