-- Increment 9: curated tracker and supplement catalog seed.
-- Broad wellness supplements only — no prescription medicines.

insert into public.tracker_definitions (
  stable_key, display_name, description, tracker_type, value_type, default_unit,
  supports_target, supports_multiple_events, supports_duration, supports_streak,
  visual_variant, display_order, active
) values
  (
    'hydration', 'Hydration', 'Daily fluid intake logging.',
    'hydration', 'amount', 'ml',
    true, true, false, true, 'water', 0, true
  ),
  (
    'meditation', 'Meditation', 'Mindfulness and breathing sessions.',
    'meditation', 'duration', 'min',
    true, true, true, true, 'meditation', 10, true
  ),
  (
    'sleep', 'Sleep', 'Bedtime and wake tracking.',
    'sleep', 'time_range', null,
    false, false, true, false, 'sleep', 20, true
  ),
  (
    'supplements', 'Supplements', 'Daily supplement intake checklist.',
    'supplement', 'boolean', null,
    true, true, false, true, 'supplement', 30, true
  ),
  (
    'steps', 'Steps', 'Daily step count.',
    'count', 'count', 'steps',
    true, true, false, true, 'steps', 40, true
  ),
  (
    'mobility', 'Mobility', 'Stretching and mobility work.',
    'duration', 'duration', 'min',
    true, true, true, true, 'mobility', 50, true
  ),
  (
    'cardio', 'Cardio', 'Cardiovascular training minutes.',
    'duration', 'duration', 'min',
    true, true, true, true, 'cardio', 60, true
  ),
  (
    'swimming', 'Swimming', 'Swim session duration.',
    'duration', 'duration', 'min',
    true, true, true, true, 'swimming', 70, true
  ),
  (
    'boxing', 'Boxing', 'Boxing or bag work duration.',
    'duration', 'duration', 'min',
    true, true, true, true, 'boxing', 80, true
  ),
  (
    'smoking_free', 'Smoking-free day', 'Track smoke-free days.',
    'boolean', 'boolean', null,
    false, false, false, true, 'smoking_free', 90, false
  ),
  (
    'guitar_practice', 'Guitar practice', 'Instrument practice sessions.',
    'duration', 'duration', 'min',
    true, true, true, true, 'guitar', 100, true
  ),
  (
    'custom', 'Custom tracker', 'User-defined tracker.',
    'custom', 'text', null,
    false, true, false, false, 'custom', 999, true
  )
on conflict (stable_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  tracker_type = excluded.tracker_type,
  value_type = excluded.value_type,
  default_unit = excluded.default_unit,
  supports_target = excluded.supports_target,
  supports_multiple_events = excluded.supports_multiple_events,
  supports_duration = excluded.supports_duration,
  supports_streak = excluded.supports_streak,
  visual_variant = excluded.visual_variant,
  display_order = excluded.display_order,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.supplement_definitions (
  stable_key, display_name, form, default_unit, system_owned, active
) values
  ('protein_powder', 'Protein powder', 'powder', 'g', true, true),
  ('creatine', 'Creatine', 'powder', 'g', true, true),
  ('electrolyte', 'Electrolyte mix', 'sachet', 'sachet', true, true),
  ('multivitamin', 'Multivitamin', 'tablet', 'tablet', true, true),
  ('omega_3', 'Omega-3', 'capsule', 'capsule', true, true),
  ('vitamin_d', 'Vitamin D', 'capsule', 'IU', true, true),
  ('magnesium', 'Magnesium', 'tablet', 'mg', true, true),
  ('custom', 'Custom supplement', 'other', null, true, true)
on conflict (stable_key) do update set
  display_name = excluded.display_name,
  form = excluded.form,
  default_unit = excluded.default_unit,
  system_owned = excluded.system_owned,
  active = excluded.active,
  updated_at = timezone('utc', now());
