-- Increment 8: curated body measurement catalog seed.
-- Neutral display names only. body_fat_manual is user-entered manual entry — not calculated.

insert into public.measurement_definitions (
  stable_key, display_name, category, default_unit, supports_side, display_order, active
) values
  ('body_weight', 'Body weight', 'weight', 'kg', false, 0, true),
  ('waist', 'Waist', 'circumference', 'cm', false, 10, true),
  ('abdomen', 'Abdomen', 'circumference', 'cm', false, 20, true),
  ('chest', 'Chest', 'circumference', 'cm', false, 30, true),
  ('hips', 'Hips', 'circumference', 'cm', false, 40, true),
  ('neck', 'Neck', 'circumference', 'cm', false, 50, true),
  ('upper_arm', 'Upper arm', 'circumference', 'cm', true, 60, true),
  ('forearm', 'Forearm', 'circumference', 'cm', true, 70, true),
  ('thigh', 'Thigh', 'circumference', 'cm', true, 80, true),
  ('calf', 'Calf', 'circumference', 'cm', true, 90, true),
  ('shoulder_width', 'Shoulder width', 'width', 'cm', false, 100, true),
  (
    'body_fat_manual',
    'Body fat (manual entry only)',
    'composition',
    'percent',
    false,
    110,
    true
  ),
  ('custom', 'Custom measurement', 'custom', 'cm', false, 999, true)
on conflict (stable_key) do update set
  display_name = excluded.display_name,
  category = excluded.category,
  default_unit = excluded.default_unit,
  supports_side = excluded.supports_side,
  display_order = excluded.display_order,
  active = excluded.active,
  updated_at = timezone('utc', now());
