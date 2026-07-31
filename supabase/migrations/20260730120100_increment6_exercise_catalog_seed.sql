-- Increment 6: curated exercise taxonomy + starter catalog seed.
-- All descriptions below are original one-sentence summaries written for this
-- project; none are copied from free-exercise-db or any other dataset.
-- See .cursor/rules/open-source-research.mdc: exercise names/movement facts
-- are not copyrightable, but instructional text is written fresh here.

-- ---------------------------------------------------------------------------
-- Muscle groups
-- ---------------------------------------------------------------------------

insert into public.muscle_groups (stable_key, name) values
  ('chest', 'Chest'),
  ('upper_back', 'Upper back'),
  ('lats', 'Lats'),
  ('traps', 'Traps'),
  ('shoulders', 'Shoulders'),
  ('biceps', 'Biceps'),
  ('triceps', 'Triceps'),
  ('forearms', 'Forearms'),
  ('abs', 'Abs'),
  ('obliques', 'Obliques'),
  ('lower_back', 'Lower back'),
  ('glutes', 'Glutes'),
  ('quadriceps', 'Quadriceps'),
  ('hamstrings', 'Hamstrings'),
  ('calves', 'Calves'),
  ('adductors', 'Adductors'),
  ('abductors', 'Abductors'),
  ('hip_flexors', 'Hip flexors'),
  ('neck', 'Neck'),
  ('full_body', 'Full body')
on conflict (stable_key) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Equipment types
-- ---------------------------------------------------------------------------

insert into public.equipment_types (stable_key, name) values
  ('barbell', 'Barbell'),
  ('dumbbell', 'Dumbbell'),
  ('kettlebell', 'Kettlebell'),
  ('cable_machine', 'Cable machine'),
  ('selectorized_machine', 'Selectorized machine'),
  ('smith_machine', 'Smith machine'),
  ('ez_curl_bar', 'EZ curl bar'),
  ('trap_bar', 'Trap bar'),
  ('resistance_band', 'Resistance band'),
  ('pull_up_bar', 'Pull-up bar'),
  ('dip_bars', 'Dip bars'),
  ('bench', 'Flat bench'),
  ('incline_bench', 'Incline bench'),
  ('bodyweight', 'Bodyweight'),
  ('medicine_ball', 'Medicine ball'),
  ('box', 'Plyo box'),
  ('sled', 'Sled'),
  ('battle_rope', 'Battle rope'),
  ('jump_rope', 'Jump rope'),
  ('stationary_bike', 'Stationary bike'),
  ('rowing_machine', 'Rowing machine'),
  ('treadmill', 'Treadmill'),
  ('foam_roller', 'Foam roller'),
  ('yoga_mat', 'Yoga mat'),
  ('plate', 'Weight plate')
on conflict (stable_key) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Movement patterns
-- ---------------------------------------------------------------------------

insert into public.movement_patterns (stable_key, name) values
  ('horizontal_push', 'Horizontal push'),
  ('horizontal_pull', 'Horizontal pull'),
  ('vertical_push', 'Vertical push'),
  ('vertical_pull', 'Vertical pull'),
  ('squat', 'Squat'),
  ('hinge', 'Hinge'),
  ('lunge', 'Lunge'),
  ('carry', 'Carry'),
  ('rotation', 'Rotation / anti-rotation'),
  ('isometric_hold', 'Isometric hold'),
  ('locomotion', 'Locomotion / conditioning'),
  ('mobility_flow', 'Mobility flow')
on conflict (stable_key) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Curated exercise catalog
-- ---------------------------------------------------------------------------

create temporary table _mtfbwu_curated_exercise_seed (
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

insert into _mtfbwu_curated_exercise_seed values
  -- Chest
  ('barbell_bench_press', 'Barbell Bench Press', 'Lower a loaded barbell to the mid-chest on a flat bench and press it back to lockout.', 'strength', 'horizontal_push', 'barbell', false, false, false, false, array['chest'], array['triceps','shoulders'], array[]::text[]),
  ('dumbbell_bench_press', 'Dumbbell Bench Press', 'Press a dumbbell in each hand from chest level to lockout while lying on a flat bench.', 'strength', 'horizontal_push', 'dumbbell', false, false, false, false, array['chest'], array['triceps','shoulders'], array[]::text[]),
  ('incline_dumbbell_press', 'Incline Dumbbell Press', 'Press dumbbells upward from shoulder level while lying back on an inclined bench to bias the upper chest.', 'strength', 'horizontal_push', 'incline_bench', false, false, false, false, array['chest'], array['shoulders','triceps'], array[]::text[]),
  ('push_up', 'Push-Up', 'Lower the body toward the floor with hands under the shoulders and press back up while keeping the torso rigid.', 'strength', 'horizontal_push', 'bodyweight', false, true, false, false, array['chest'], array['triceps','shoulders'], array['abs']),
  ('cable_chest_fly', 'Cable Chest Fly', 'Draw two cable handles together in a wide arc in front of the chest with a slight elbow bend.', 'strength', 'horizontal_push', 'cable_machine', false, false, false, false, array['chest'], array[]::text[], array['shoulders']),
  ('bench_dip', 'Bench Dip', 'Lower the hips toward the floor by bending the elbows while hands stay on a bench behind the body, then press back up.', 'strength', 'vertical_push', 'bench', false, true, false, false, array['triceps'], array['chest','shoulders'], array[]::text[]),

  -- Back
  ('barbell_deadlift', 'Barbell Deadlift', 'Hinge at the hips to lift a loaded barbell from the floor to standing while keeping the spine neutral.', 'strength', 'hinge', 'barbell', false, false, false, false, array['lower_back','glutes','hamstrings'], array['traps','forearms'], array['abs']),
  ('barbell_row', 'Barbell Row', 'Hinge forward with a flat back and pull a loaded barbell from a hang toward the lower ribs.', 'strength', 'horizontal_pull', 'barbell', false, false, false, false, array['upper_back','lats'], array['biceps','forearms'], array['lower_back']),
  ('pull_up', 'Pull-Up', 'Hang from an overhead bar and pull the chin above the bar using an overhand grip.', 'strength', 'vertical_pull', 'pull_up_bar', false, true, false, false, array['lats'], array['biceps','upper_back'], array['abs']),
  ('lat_pulldown', 'Lat Pulldown', 'Pull a cable bar down from overhead to the upper chest while seated, then control it back up.', 'strength', 'vertical_pull', 'cable_machine', false, false, false, false, array['lats'], array['biceps','upper_back'], array[]::text[]),
  ('seated_cable_row', 'Seated Cable Row', 'Pull a cable handle toward the torso while seated with knees slightly bent, squeezing the shoulder blades together.', 'strength', 'horizontal_pull', 'cable_machine', false, false, false, false, array['upper_back','lats'], array['biceps','forearms'], array[]::text[]),
  ('single_arm_dumbbell_row', 'Single-Arm Dumbbell Row', 'Support one hand and knee on a bench and row a dumbbell from a hang toward the hip with the opposite arm.', 'strength', 'horizontal_pull', 'dumbbell', true, false, false, false, array['upper_back','lats'], array['biceps'], array['abs']),

  -- Shoulders
  ('barbell_overhead_press', 'Barbell Overhead Press', 'Press a loaded barbell from the front of the shoulders to full overhead lockout while standing.', 'strength', 'vertical_push', 'barbell', false, false, false, false, array['shoulders'], array['triceps'], array['abs']),
  ('dumbbell_shoulder_press', 'Dumbbell Shoulder Press', 'Press a dumbbell in each hand from shoulder height to overhead lockout while seated or standing.', 'strength', 'vertical_push', 'dumbbell', false, false, false, false, array['shoulders'], array['triceps'], array[]::text[]),
  ('dumbbell_lateral_raise', 'Dumbbell Lateral Raise', 'Raise dumbbells out to the sides to shoulder height with a soft bend in the elbows.', 'strength', null, 'dumbbell', false, false, false, false, array['shoulders'], array[]::text[], array['traps']),
  ('cable_face_pull', 'Cable Face Pull', 'Pull a rope attachment toward the face at eye level, leading with the elbows and externally rotating the shoulders.', 'strength', 'horizontal_pull', 'cable_machine', false, false, false, false, array['shoulders','upper_back'], array['traps'], array[]::text[]),
  ('dumbbell_rear_delt_fly', 'Dumbbell Rear-Delt Fly', 'Hinge forward and raise dumbbells out to the sides to target the rear shoulder with a slight elbow bend.', 'strength', null, 'dumbbell', false, false, false, false, array['shoulders'], array['upper_back'], array[]::text[]),

  -- Arms
  ('barbell_curl', 'Barbell Curl', 'Curl a loaded barbell from a hang at the hips up to the shoulders, keeping the elbows fixed at the sides.', 'strength', null, 'barbell', false, false, false, false, array['biceps'], array['forearms'], array[]::text[]),
  ('dumbbell_hammer_curl', 'Dumbbell Hammer Curl', 'Curl dumbbells with a neutral palms-facing grip from a hang up to the shoulders.', 'strength', null, 'dumbbell', false, false, false, false, array['biceps','forearms'], array[]::text[], array[]::text[]),
  ('cable_triceps_pushdown', 'Cable Triceps Pushdown', 'Extend the elbows to push a cable attachment down from chest height while keeping the upper arms fixed.', 'strength', 'vertical_push', 'cable_machine', false, false, false, false, array['triceps'], array[]::text[], array[]::text[]),
  ('ez_bar_skull_crusher', 'EZ-Bar Skull Crusher', 'Lower an EZ-bar toward the forehead by bending only the elbows while lying on a bench, then extend back up.', 'strength', null, 'ez_curl_bar', false, false, false, false, array['triceps'], array[]::text[], array[]::text[]),
  ('close_grip_bench_press', 'Close-Grip Bench Press', 'Press a barbell from the chest to lockout using a shoulder-width or narrower grip to emphasize the triceps.', 'strength', 'horizontal_push', 'barbell', false, false, false, false, array['triceps'], array['chest','shoulders'], array[]::text[]),

  -- Legs
  ('barbell_back_squat', 'Barbell Back Squat', 'Bend the hips and knees to lower a barbell racked across the upper back, then stand back to full extension.', 'strength', 'squat', 'barbell', false, false, false, false, array['quadriceps','glutes'], array['hamstrings'], array['abs','lower_back']),
  ('barbell_front_squat', 'Barbell Front Squat', 'Squat with a loaded barbell racked across the front of the shoulders, keeping the torso upright.', 'strength', 'squat', 'barbell', false, false, false, false, array['quadriceps'], array['glutes'], array['abs']),
  ('romanian_deadlift', 'Romanian Deadlift', 'Hinge at the hips with a slight knee bend to lower a barbell along the legs, then drive the hips forward to stand.', 'strength', 'hinge', 'barbell', false, false, false, false, array['hamstrings','glutes'], array['lower_back'], array[]::text[]),
  ('leg_press', 'Leg Press', 'Push a weighted sled away from the body by extending the knees and hips while seated in a leg press machine.', 'strength', 'squat', 'selectorized_machine', false, false, false, false, array['quadriceps','glutes'], array['hamstrings'], array[]::text[]),
  ('dumbbell_walking_lunge', 'Dumbbell Walking Lunge', 'Step forward into a lunge holding dumbbells at the sides, then bring the trailing leg through to the next step.', 'strength', 'lunge', 'dumbbell', true, false, false, false, array['quadriceps','glutes'], array['hamstrings'], array['abs']),
  ('machine_leg_curl', 'Machine Leg Curl', 'Curl the heels toward the glutes against a padded lever while lying face down or seated on a leg curl machine.', 'strength', null, 'selectorized_machine', false, false, false, false, array['hamstrings'], array[]::text[], array[]::text[]),
  ('machine_leg_extension', 'Machine Leg Extension', 'Extend the knees against a padded lever while seated on a leg extension machine.', 'strength', null, 'selectorized_machine', false, false, false, false, array['quadriceps'], array[]::text[], array[]::text[]),
  ('standing_calf_raise', 'Standing Calf Raise', 'Rise onto the toes against resistance, then lower the heels below the platform under control.', 'strength', null, 'selectorized_machine', false, false, false, false, array['calves'], array[]::text[], array[]::text[]),

  -- Core
  ('plank', 'Plank', 'Hold a straight-body position supported on the forearms and toes while bracing the abs.', 'isometric', 'isometric_hold', 'bodyweight', false, true, true, false, array['abs'], array['lower_back'], array['glutes']),
  ('hanging_leg_raise', 'Hanging Leg Raise', 'Hang from an overhead bar and raise the legs toward the torso by curling the pelvis without swinging.', 'strength', null, 'pull_up_bar', false, true, false, false, array['abs'], array['hip_flexors'], array['forearms']),
  ('cable_woodchopper', 'Cable Woodchopper', 'Rotate the torso to pull a high cable diagonally across the body down to the opposite hip.', 'strength', 'rotation', 'cable_machine', true, false, false, false, array['obliques'], array['abs'], array[]::text[]),
  ('russian_twist', 'Russian Twist', 'Rotate a weight from side to side while seated with the torso leaned back and feet lifted.', 'strength', 'rotation', 'medicine_ball', false, false, false, false, array['obliques'], array['abs'], array[]::text[]),

  -- Conditioning
  ('kettlebell_swing', 'Kettlebell Swing', 'Hinge at the hips to hike a kettlebell back, then drive the hips forward to swing it to chest height.', 'conditioning', 'hinge', 'kettlebell', false, false, false, false, array['glutes','hamstrings'], array['lower_back','shoulders'], array['abs']),
  ('rowing_machine_intervals', 'Rowing Machine Intervals', 'Alternate hard and easy efforts on a rowing machine, driving with the legs before finishing the pull with the arms.', 'conditioning', 'locomotion', 'rowing_machine', false, false, true, true, array['full_body'], array['upper_back','quadriceps'], array[]::text[]),
  ('battle_rope_wave', 'Battle Rope Wave', 'Alternate driving each arm up and down to send continuous waves through a pair of anchored battle ropes.', 'conditioning', null, 'battle_rope', false, false, true, false, array['shoulders'], array['abs','forearms'], array[]::text[]),
  ('box_jump', 'Box Jump', 'Swing the arms and hips to jump both feet onto a raised box, landing softly with bent knees.', 'plyometric', 'squat', 'box', false, true, false, false, array['quadriceps','glutes'], array['calves'], array['abs']),

  -- Mobility
  ('foam_roll_thoracic_spine', 'Foam Roll Thoracic Spine', 'Roll the upper back slowly over a foam roller to release tension through the mid-back.', 'mobility', 'mobility_flow', 'foam_roller', false, true, true, false, array['upper_back'], array[]::text[], array[]::text[]),
  ('worlds_greatest_stretch', 'World''s Greatest Stretch', 'Step into a deep lunge and rotate the trailing-side arm toward the ceiling to open the hip and thoracic spine together.', 'mobility', 'mobility_flow', 'bodyweight', true, true, false, false, array['hip_flexors'], array['adductors','upper_back'], array[]::text[]),
  ('kneeling_hip_flexor_stretch', 'Kneeling Hip Flexor Stretch', 'Kneel in a half-lunge position and shift the hips forward to stretch the front of the rear hip.', 'mobility', 'mobility_flow', 'yoga_mat', true, true, true, false, array['hip_flexors'], array['quadriceps'], array[]::text[])
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
from _mtfbwu_curated_exercise_seed s
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
  source = excluded.source,
  source_id = excluded.source_id,
  verified = excluded.verified,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.exercise_muscle_groups (exercise_definition_id, muscle_group_id, role)
select ed.id, mg.id, roles.role
from _mtfbwu_curated_exercise_seed s
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
