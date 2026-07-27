-- Increment 4: small, explicitly reviewable curated starter catalog.
-- All nutrient values are per 100 g edible portion. These rows intentionally
-- remain unverified until an FDC/API import or product label review confirms
-- each record; see docs/data/MTFBWU_CURATED_FOODS.md.

create temporary table _mtfbwu_curated_food_seed (
  id uuid primary key,
  canonical_name text not null,
  normalized_name text not null,
  source_id text not null,
  food_state public.food_state not null,
  category text not null,
  brand_name text,
  description text not null,
  user_editable boolean not null,
  aliases text[] not null,
  energy_kcal numeric not null,
  protein_g numeric not null,
  carbohydrate_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric not null
) on commit drop;

insert into _mtfbwu_curated_food_seed values
  ('9e210001-0000-4000-8000-000000000001', 'Whole egg', 'whole egg', 'usda_fdc:748967', 'raw', 'protein', null, 'FDC ID recorded for future verification; provisional USDA-style raw whole egg values.', false, array['egg', 'anda'], 143, 12.6, 0.7, 9.5, 0),
  ('9e210001-0000-4000-8000-000000000002', 'Rolled oats', 'rolled oats', 'usda_fdc:234639', 'dry', 'grains', null, 'FDC ID recorded for future verification; provisional dry rolled oats values.', false, array['oats', 'rolled oats dry'], 379, 13.2, 67.7, 6.5, 10.1),
  ('9e210001-0000-4000-8000-000000000003', 'White rice', 'white rice raw', 'usda_fdc:168878', 'raw', 'grains', null, 'FDC ID recorded for future verification; dry/raw long-grain white rice values.', false, array['rice raw', 'chawal raw'], 365, 7.1, 80.0, 0.7, 1.3),
  ('9e210001-0000-4000-8000-000000000004', 'White rice', 'white rice cooked', 'usda_fdc:169756', 'cooked', 'grains', null, 'FDC ID recorded for future verification; plain cooked long-grain white rice, no added fat or salt.', false, array['rice cooked', 'cooked chawal'], 130, 2.4, 28.2, 0.3, 0.4),
  ('9e210001-0000-4000-8000-000000000005', 'Chicken breast, skinless boneless', 'chicken breast raw skinless boneless', 'usda_fdc:171077', 'raw', 'protein', null, 'FDC ID recorded for future verification; raw, skinless, boneless chicken breast.', false, array['chicken breast', 'raw chicken breast'], 120, 22.5, 0, 2.6, 0),
  ('9e210001-0000-4000-8000-000000000006', 'Chicken thigh, skinless boneless', 'chicken thigh raw skinless boneless', 'mtfbwu_curated:chicken-thigh-raw', 'raw', 'protein', null, 'Generic raw skinless, boneless thigh; verify cut-specific FDC record.', false, array['chicken thigh', 'raw chicken thigh'], 144, 19.7, 0, 7.0, 0),
  ('9e210001-0000-4000-8000-000000000007', 'Chicken, mixed bone-in', 'chicken mixed bone in', 'mtfbwu_curated:chicken-mixed-bone-in-placeholder', 'raw', 'protein', 'generic', 'UNVERIFIED placeholder: mixed bone-in chicken; edible yield and cut mix are unknown.', true, array['mixed chicken', 'bone in chicken'], 170, 18.0, 0, 10.0, 0),
  ('9e210001-0000-4000-8000-000000000008', 'Paneer, low-fat', 'paneer low fat generic', 'mtfbwu_curated:paneer-low-fat-generic', 'prepared', 'dairy', 'generic', 'Generic low-fat paneer; values vary materially by milk and draining method.', true, array['low fat paneer', 'paneer'], 180, 20.0, 6.0, 8.0, 0),
  ('9e210001-0000-4000-8000-000000000009', 'Greek yogurt, plain', 'greek yogurt plain generic', 'mtfbwu_curated:greek-yogurt-plain-generic', 'prepared', 'dairy', 'generic', 'Generic plain Greek yogurt; fat and protein vary by product.', true, array['greek yogurt', 'hung curd'], 73, 9.0, 4.0, 2.0, 0),
  ('9e210001-0000-4000-8000-000000000010', 'Whey protein powder', 'whey protein generic', 'mtfbwu_curated:whey-protein-generic', 'packaged', 'supplements', 'generic', 'Generic whey protein powder; use a product label for logged values.', true, array['whey', 'protein powder'], 400, 80.0, 8.0, 6.0, 0),
  ('9e210001-0000-4000-8000-000000000011', 'Banana', 'banana raw', 'usda_fdc:173944', 'raw', 'fruit', null, 'FDC ID recorded for future verification; raw banana, edible portion.', false, array['banana', 'kela'], 89, 1.1, 22.8, 0.3, 2.6),
  ('9e210001-0000-4000-8000-000000000012', 'Guava', 'guava raw', 'usda_fdc:168153', 'raw', 'fruit', null, 'FDC ID recorded for future verification; raw guava, edible portion.', false, array['guava', 'amrood'], 68, 2.6, 14.3, 1.0, 5.4),
  ('9e210001-0000-4000-8000-000000000013', 'Orange', 'orange raw', 'usda_fdc:169097', 'raw', 'fruit', null, 'FDC ID recorded for future verification; raw orange, edible portion.', false, array['orange', 'santra'], 47, 0.9, 11.8, 0.1, 2.4),
  ('9e210001-0000-4000-8000-000000000014', 'Flaxseed', 'flaxseed dry', 'usda_fdc:169414', 'dry', 'seeds', null, 'FDC ID recorded for future verification; dry whole flaxseed.', false, array['flax seeds', 'alsi'], 534, 18.3, 28.9, 42.2, 27.3),
  ('9e210001-0000-4000-8000-000000000015', 'Chia seed', 'chia seed dry', 'usda_fdc:170554', 'dry', 'seeds', null, 'FDC ID recorded for future verification; dry chia seed.', false, array['chia', 'chia seeds'], 486, 16.5, 42.1, 30.7, 34.4),
  ('9e210001-0000-4000-8000-000000000016', 'Psyllium husk', 'psyllium husk dry', 'mtfbwu_curated:psyllium-husk-generic', 'dry', 'fiber', 'generic', 'Generic psyllium husk; label-specific fiber and calories should replace this value.', true, array['isabgol', 'psyllium'], 200, 0, 0, 0, 80.0),
  ('9e210001-0000-4000-8000-000000000017', 'Tofu, firm', 'tofu firm generic', 'mtfbwu_curated:tofu-firm-generic', 'prepared', 'plant protein', 'generic', 'Generic firm tofu; coagulant and water content vary by product.', true, array['tofu', 'firm tofu'], 144, 17.3, 2.8, 8.7, 2.3),
  ('9e210001-0000-4000-8000-000000000018', 'Soy chunks', 'soy chunks dry', 'mtfbwu_curated:soy-chunks-dry-generic', 'dry', 'plant protein', 'generic', 'Generic dry soy chunks; use package label where available.', true, array['soy chunks dry', 'nutri nuggets dry'], 345, 52.0, 33.0, 0.5, 13.0),
  ('9e210001-0000-4000-8000-000000000019', 'Soy chunks', 'soy chunks hydrated', 'mtfbwu_curated:soy-chunks-hydrated-generic', 'prepared', 'plant protein', 'generic', 'Generic hydrated soy chunks; assumes roughly 2.5x water uptake and no added fat.', true, array['soy chunks cooked', 'nutri nuggets hydrated'], 138, 20.8, 13.2, 0.2, 5.2),
  ('9e210001-0000-4000-8000-000000000020', 'Moong dal', 'moong dal dry', 'mtfbwu_curated:moong-dal-dry', 'dry', 'legumes', null, 'Generic dry split mung dal; variety and polishing may vary.', false, array['mung dal', 'yellow moong dal'], 347, 24.0, 63.0, 1.2, 16.0),
  ('9e210001-0000-4000-8000-000000000021', 'Masoor dal', 'masoor dal dry', 'mtfbwu_curated:masoor-dal-dry', 'dry', 'legumes', null, 'Generic dry red lentil/masoor dal.', false, array['red lentils', 'masoor'], 352, 25.0, 63.0, 1.1, 11.0),
  ('9e210001-0000-4000-8000-000000000022', 'Toor dal', 'toor dal dry', 'mtfbwu_curated:toor-dal-dry', 'dry', 'legumes', null, 'Generic dry split pigeon pea/toor dal.', false, array['arhar dal', 'pigeon peas split'], 343, 22.0, 63.0, 1.5, 15.0),
  ('9e210001-0000-4000-8000-000000000023', 'Chana dal', 'chana dal dry', 'mtfbwu_curated:chana-dal-dry', 'dry', 'legumes', null, 'Generic dry split chickpea/chana dal.', false, array['split chickpeas', 'bengal gram dal'], 364, 20.0, 61.0, 6.0, 17.0),
  ('9e210001-0000-4000-8000-000000000024', 'Kidney beans', 'rajma dry', 'mtfbwu_curated:rajma-dry', 'dry', 'legumes', null, 'Generic dry kidney beans/rajma.', false, array['rajma', 'kidney beans dry'], 333, 23.6, 60.0, 0.8, 24.9),
  ('9e210001-0000-4000-8000-000000000025', 'Chickpeas', 'chickpeas dry', 'mtfbwu_curated:chickpeas-dry', 'dry', 'legumes', null, 'Generic dry chickpeas/kabuli chana.', false, array['chana', 'garbanzo beans dry'], 364, 19.3, 61.0, 6.0, 17.4),
  ('9e210001-0000-4000-8000-000000000026', 'Olive oil', 'olive oil', 'usda_fdc:171413', 'prepared', 'oils', null, 'FDC ID recorded for future verification; plain olive oil.', false, array['olive oil'], 884, 0, 0, 100.0, 0),
  ('9e210001-0000-4000-8000-000000000027', 'Mustard oil', 'mustard oil', 'mtfbwu_curated:mustard-oil-generic', 'prepared', 'oils', 'generic', 'Generic mustard oil; use label-specific values if needed.', true, array['sarson oil', 'mustard oil'], 884, 0, 0, 100.0, 0),
  ('9e210001-0000-4000-8000-000000000028', 'Groundnut oil', 'groundnut oil', 'mtfbwu_curated:groundnut-oil-generic', 'prepared', 'oils', 'generic', 'Generic groundnut/peanut oil.', true, array['peanut oil', 'groundnut oil'], 884, 0, 0, 100.0, 0),
  ('9e210001-0000-4000-8000-000000000029', 'Spinach', 'spinach raw', 'usda_fdc:168462', 'raw', 'vegetables', null, 'FDC ID recorded for future verification; raw spinach.', false, array['palak', 'spinach'], 23, 2.9, 3.6, 0.4, 2.2),
  ('9e210001-0000-4000-8000-000000000030', 'Tomato', 'tomato raw', 'usda_fdc:170457', 'raw', 'vegetables', null, 'FDC ID recorded for future verification; raw tomato.', false, array['tamatar', 'tomato'], 18, 0.9, 3.9, 0.2, 1.2),
  ('9e210001-0000-4000-8000-000000000031', 'Onion', 'onion raw', 'usda_fdc:170000', 'raw', 'vegetables', null, 'FDC ID recorded for future verification; raw onion.', false, array['pyaz', 'onion'], 40, 1.1, 9.3, 0.1, 1.7),
  ('9e210001-0000-4000-8000-000000000032', 'Cucumber', 'cucumber raw', 'usda_fdc:168409', 'raw', 'vegetables', null, 'FDC ID recorded for future verification; raw cucumber with peel.', false, array['kheera', 'cucumber'], 15, 0.7, 3.6, 0.1, 0.5),
  ('9e210001-0000-4000-8000-000000000033', 'Broccoli', 'broccoli raw', 'usda_fdc:170379', 'raw', 'vegetables', null, 'FDC ID recorded for future verification; raw broccoli.', false, array['broccoli'], 34, 2.8, 6.6, 0.4, 2.6),
  ('9e210001-0000-4000-8000-000000000034', 'Atlantic salmon', 'atlantic salmon raw', 'usda_fdc:175167', 'raw', 'fish', null, 'FDC ID recorded for future verification; raw Atlantic salmon. Do not use for other fish species.', false, array['salmon', 'raw salmon'], 208, 20.4, 0, 13.4, 0),
  ('9e210001-0000-4000-8000-000000000035', 'Rohu', 'rohu raw generic', 'mtfbwu_curated:rohu-raw-placeholder', 'raw', 'fish', 'generic', 'UNVERIFIED species placeholder for rohu; replace after a species-specific authoritative source is reviewed.', true, array['rohu fish', 'rohu'], 97, 17.0, 0, 2.0, 0);

insert into public.foods (
  id, canonical_name, normalized_name, source, source_id, food_state, category,
  brand_name, description, edible_portion_percent, verified, user_editable
)
select
  id, canonical_name, normalized_name, 'mtfbwu_curated', source_id, food_state,
  category, brand_name, description, 100, false, user_editable
from _mtfbwu_curated_food_seed
on conflict (id) do update set
  canonical_name = excluded.canonical_name,
  normalized_name = excluded.normalized_name,
  source = excluded.source,
  source_id = excluded.source_id,
  food_state = excluded.food_state,
  category = excluded.category,
  brand_name = excluded.brand_name,
  description = excluded.description,
  edible_portion_percent = excluded.edible_portion_percent,
  verified = excluded.verified,
  user_editable = excluded.user_editable,
  updated_at = timezone('utc', now());

insert into public.food_aliases (food_id, alias, normalized_alias, source)
select
  s.id,
  alias,
  btrim(regexp_replace(lower(alias), '[^a-z0-9]+', ' ', 'g')),
  'mtfbwu_curated'
from _mtfbwu_curated_food_seed s
cross join lateral unnest(s.aliases) as alias
on conflict (food_id, normalized_alias) do update set
  alias = excluded.alias,
  source = excluded.source,
  updated_at = timezone('utc', now());

-- The schema has a partial unique index only for defaults, so guard the
-- descriptive 100 g portion explicitly rather than relying on a conflict key.
insert into public.food_portions (food_id, label, gram_weight, source, is_default)
select s.id, '100 g', 100, 'mtfbwu_curated', true
from _mtfbwu_curated_food_seed s
where not exists (
  select 1
  from public.food_portions p
  where p.food_id = s.id and p.label = '100 g' and p.gram_weight = 100
);

insert into public.food_nutrients (food_id, nutrient_definition_id, amount_per_100g)
select s.id, d.id, values_by_key.amount
from _mtfbwu_curated_food_seed s
cross join lateral (
  values
    ('energy_kcal', s.energy_kcal),
    ('protein_g', s.protein_g),
    ('carbohydrate_g', s.carbohydrate_g),
    ('fat_g', s.fat_g),
    ('fiber_g', s.fiber_g)
) as values_by_key(stable_key, amount)
join public.nutrient_definitions d on d.stable_key = values_by_key.stable_key
on conflict (food_id, nutrient_definition_id) do update set
  amount_per_100g = excluded.amount_per_100g,
  updated_at = timezone('utc', now());

-- Expected result: 35 foods, >=35 aliases, 35 default 100 g portions, and
-- 175 core nutrient rows. All 35 foods are deliberately verified = false.
