-- Increment 6 catalog expansion: additional curated exercises required by the
-- Increment 6 brief. Descriptions are original MTFBWU prose
-- (source = mtfbwu_curated). free-exercise-db / wrkout naming inspiration only.

insert into public.equipment_types (stable_key, name) values
  ('swimming_pool', 'Swimming pool'),
  ('boxing_bag', 'Boxing bag'),
  ('other', 'Other')
on conflict (stable_key) do update set name = excluded.name;

insert into public.muscle_groups (stable_key, name) values
  ('front_delts', 'Front delts'),
  ('side_delts', 'Side delts'),
  ('rear_delts', 'Rear delts'),
  ('core', 'Core'),
  ('quads', 'Quads')
on conflict (stable_key) do update set name = excluded.name;

insert into public.movement_patterns (stable_key, name) values
  ('anti_rotation', 'Anti-rotation'),
  ('flexion', 'Flexion'),
  ('extension', 'Extension'),
  ('abduction', 'Abduction'),
  ('adduction', 'Adduction'),
  ('conditioning', 'Conditioning'),
  ('mobility', 'Mobility'),
  ('other', 'Other')
on conflict (stable_key) do update set name = excluded.name;

create temporary table _mtfbwu_curated_exercise_expand (
  stable_key text primary key,
  name text not null,
  description text not null,
  exercise_type public.exercise_type not null,
  movement_pattern_key text,
  primary_equipment_key text,
  unilateral boolean not null default false,
  bodyweight boolean not null default false,
  timed boolean not null default false,
  distance_based boolean not null default false,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  stabilizer_muscles text[] not null default '{}'
) on commit drop;

insert into _mtfbwu_curated_exercise_expand values
  ('incline_barbell_bench_press', 'Incline Barbell Bench Press',
   'Press a barbell from the upper chest to lockout while lying on an inclined bench.',
   'strength', 'horizontal_push', 'incline_bench', false, false, false, false,
   array['chest'], array['triceps','shoulders'], array[]::text[]),
  ('dumbbell_fly', 'Dumbbell Fly',
   'Lower dumbbells in a wide arc with soft elbows while lying on a flat bench, then bring them together above the chest.',
   'strength', 'horizontal_push', 'dumbbell', false, false, false, false,
   array['chest'], array['shoulders'], array[]::text[]),
  ('parallel_bar_dip', 'Parallel-Bar Dip',
   'Lower the body between parallel bars by bending the elbows, then press back to lockout.',
   'strength', 'vertical_push', 'dip_bars', false, true, false, false,
   array['chest','triceps'], array['shoulders'], array[]::text[]),
  ('chin_up', 'Chin-Up',
   'Hang from an overhead bar with an underhand grip and pull the chin above the bar.',
   'strength', 'vertical_pull', 'pull_up_bar', false, true, false, false,
   array['lats','biceps'], array['upper_back'], array['abs']),
  ('upright_row', 'Upright Row',
   'Pull a barbell or dumbbells from a hang at the thighs up toward the collarbone, leading with the elbows.',
   'strength', 'vertical_pull', 'barbell', false, false, false, false,
   array['shoulders','traps'], array['biceps'], array[]::text[]),
  ('dumbbell_curl', 'Dumbbell Curl',
   'Curl a dumbbell from a hang at the side up to the shoulder, keeping the elbow fixed.',
   'strength', null, 'dumbbell', true, false, false, false,
   array['biceps'], array['forearms'], array[]::text[]),
  ('preacher_curl', 'Preacher Curl',
   'Curl a barbell or EZ-bar while the upper arms rest on a preacher bench pad.',
   'strength', null, 'ez_curl_bar', false, false, false, false,
   array['biceps'], array['forearms'], array[]::text[]),
  ('bulgarian_split_squat', 'Bulgarian Split Squat',
   'Lower into a rear-foot-elevated split squat, then drive through the front leg to stand.',
   'strength', 'lunge', 'dumbbell', true, false, false, false,
   array['quadriceps','glutes'], array['hamstrings'], array['abs']),
  ('hip_thrust', 'Hip Thrust',
   'Drive the hips upward against a loaded barbell while the upper back rests on a bench.',
   'strength', 'hinge', 'barbell', false, false, false, false,
   array['glutes'], array['hamstrings'], array['abs']),
  ('side_plank', 'Side Plank',
   'Hold a straight-body position supported on one forearm and the side of the bottom foot.',
   'isometric', 'isometric_hold', 'bodyweight', true, true, true, false,
   array['obliques','abs'], array['glutes'], array[]::text[]),
  ('hanging_knee_raise', 'Hanging Knee Raise',
   'Hang from an overhead bar and curl the knees toward the chest without swinging.',
   'strength', null, 'pull_up_bar', false, true, false, false,
   array['abs'], array['hip_flexors'], array['forearms']),
  ('cable_crunch', 'Cable Crunch',
   'Kneel facing a high cable and curl the torso downward against the rope attachment.',
   'strength', null, 'cable_machine', false, false, false, false,
   array['abs'], array[]::text[], array[]::text[]),
  ('dead_bug', 'Dead Bug',
   'Lie on the back and alternately extend opposite arm and leg while keeping the low back pressed into the floor.',
   'strength', null, 'bodyweight', true, true, false, false,
   array['abs'], array[]::text[], array[]::text[]),
  ('pallof_press', 'Pallof Press',
   'Press a cable or band straight out from the chest while resisting rotation from a side pull.',
   'strength', 'anti_rotation', 'cable_machine', false, false, false, false,
   array['abs','obliques'], array[]::text[], array[]::text[]),
  ('treadmill_walk', 'Treadmill Walk',
   'Walk on a treadmill at a controlled pace for the prescribed time or distance.',
   'cardio', 'locomotion', 'treadmill', false, true, true, true,
   array['full_body'], array[]::text[], array[]::text[]),
  ('treadmill_run', 'Treadmill Run',
   'Run on a treadmill for the prescribed time or distance.',
   'cardio', 'locomotion', 'treadmill', false, true, true, true,
   array['full_body'], array['quadriceps','calves'], array[]::text[]),
  ('stationary_bike', 'Stationary Bike',
   'Pedal a stationary bike for the prescribed time, distance, or interval.',
   'cardio', 'locomotion', 'stationary_bike', false, true, true, true,
   array['quadriceps'], array['hamstrings','glutes'], array[]::text[]),
  ('jump_rope', 'Jump Rope',
   'Skip rope continuously or in intervals for the prescribed duration.',
   'conditioning', 'locomotion', 'jump_rope', false, true, true, false,
   array['calves'], array['shoulders','forearms'], array[]::text[]),
  ('swimming', 'Swimming',
   'Swim continuous or interval lengths in a pool for the prescribed duration or distance.',
   'cardio', 'locomotion', 'swimming_pool', false, true, true, true,
   array['full_body'], array[]::text[], array[]::text[]),
  ('heavy_bag', 'Heavy Bag',
   'Strike a heavy bag with punches and/or kicks for the prescribed rounds.',
   'conditioning', null, 'boxing_bag', false, true, true, false,
   array['shoulders'], array['abs','forearms'], array[]::text[]),
  ('shadow_boxing', 'Shadow Boxing',
   'Practice punching combinations in the air for the prescribed rounds.',
   'conditioning', null, 'bodyweight', false, true, true, false,
   array['shoulders'], array['abs'], array[]::text[]),
  ('hamstring_stretch', 'Hamstring Stretch',
   'Stretch the back of the thigh by hinging at the hips with a nearly straight knee.',
   'mobility', 'mobility_flow', 'yoga_mat', true, true, true, false,
   array['hamstrings'], array[]::text[], array[]::text[]),
  ('thoracic_rotation', 'Thoracic Rotation',
   'Rotate the mid-back through a controlled range while keeping the hips stable.',
   'mobility', 'rotation', 'yoga_mat', true, true, false, false,
   array['upper_back'], array[]::text[], array[]::text[]),
  ('ankle_mobility', 'Ankle Mobility',
   'Drive the knee forward over the toes against a wall or band to improve ankle dorsiflexion.',
   'mobility', 'mobility_flow', 'yoga_mat', true, true, false, false,
   array['calves'], array[]::text[], array[]::text[]),
  ('shoulder_dislocate', 'Shoulder Dislocate',
   'Pass a light stick or band from the front of the body over the head to the back with wide arms.',
   'mobility', 'mobility_flow', 'resistance_band', false, true, false, false,
   array['shoulders'], array['chest'], array[]::text[])
on conflict (stable_key) do update set
  name = excluded.name,
  description = excluded.description,
  exercise_type = excluded.exercise_type,
  movement_pattern_key = excluded.movement_pattern_key,
  primary_equipment_key = excluded.primary_equipment_key,
  unilateral = excluded.unilateral,
  bodyweight = excluded.bodyweight,
  timed = excluded.timed,
  distance_based = excluded.distance_based,
  primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  stabilizer_muscles = excluded.stabilizer_muscles;

insert into public.exercise_definitions (
  stable_key, name, normalized_name, description, exercise_type,
  movement_pattern_id, primary_equipment_id, unilateral, bodyweight, timed, distance_based,
  source, source_id, verified, active
)
select
  s.stable_key,
  s.name,
  lower(s.name),
  s.description,
  s.exercise_type,
  mp.id,
  eq.id,
  s.unilateral,
  s.bodyweight,
  s.timed,
  s.distance_based,
  'mtfbwu_curated',
  'mtfbwu_curated:' || s.stable_key,
  true,
  true
from _mtfbwu_curated_exercise_expand s
left join public.movement_patterns mp on mp.stable_key = s.movement_pattern_key
left join public.equipment_types eq on eq.stable_key = s.primary_equipment_key
on conflict (stable_key) do update set
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  description = excluded.description,
  exercise_type = excluded.exercise_type,
  movement_pattern_id = excluded.movement_pattern_id,
  primary_equipment_id = excluded.primary_equipment_id,
  unilateral = excluded.unilateral,
  bodyweight = excluded.bodyweight,
  timed = excluded.timed,
  distance_based = excluded.distance_based,
  verified = true,
  active = true,
  updated_at = timezone('utc', now());

insert into public.exercise_muscle_groups (exercise_definition_id, muscle_group_id, role)
select ed.id, mg.id, roles.role
from _mtfbwu_curated_exercise_expand s
join public.exercise_definitions ed on ed.stable_key = s.stable_key
cross join lateral (
  values
    ('primary'::public.exercise_muscle_role, s.primary_muscles),
    ('secondary'::public.exercise_muscle_role, s.secondary_muscles),
    ('stabilizer'::public.exercise_muscle_role, s.stabilizer_muscles)
) as roles(role, muscle_keys)
cross join lateral unnest(roles.muscle_keys) as muscle_key
join public.muscle_groups mg on mg.stable_key = muscle_key
on conflict (exercise_definition_id, muscle_group_id, role) do nothing;

insert into public.exercise_aliases (exercise_definition_id, alias, normalized_alias)
select ed.id, 'Conventional Deadlift', 'conventional deadlift'
from public.exercise_definitions ed
where ed.stable_key = 'barbell_deadlift'
  and not exists (
    select 1 from public.exercise_aliases ea
    where ea.exercise_definition_id = ed.id and ea.normalized_alias = 'conventional deadlift'
  );

insert into public.exercise_aliases (exercise_definition_id, alias, normalized_alias)
select ed.id, 'Dips', 'dips'
from public.exercise_definitions ed
where ed.stable_key = 'parallel_bar_dip'
  and not exists (
    select 1 from public.exercise_aliases ea
    where ea.exercise_definition_id = ed.id and ea.normalized_alias = 'dips'
  );
