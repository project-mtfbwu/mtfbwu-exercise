-- Increment 7: curated rehab body areas, movements, and starter exercise catalog.
-- All descriptions are neutral general-reference text written for this project.
-- They are NOT treatment instructions, prescriptions, or clinical guidance.
-- See .cursor/rules/open-source-research.mdc: exercise names and movement facts
-- are not copyrightable, but instructional text is written fresh here.

-- ---------------------------------------------------------------------------
-- Body areas
-- ---------------------------------------------------------------------------

insert into public.rehab_body_areas (stable_key, name) values
  ('knee', 'Knee'),
  ('hip', 'Hip'),
  ('ankle', 'Ankle'),
  ('foot', 'Foot'),
  ('lower_back', 'Lower back'),
  ('upper_back', 'Upper back'),
  ('shoulder', 'Shoulder'),
  ('elbow', 'Elbow'),
  ('wrist', 'Wrist'),
  ('neck', 'Neck'),
  ('core', 'Core'),
  ('full_body', 'Full body'),
  ('other', 'Other')
on conflict (stable_key) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Movements
-- ---------------------------------------------------------------------------

insert into public.rehab_movements (stable_key, name) values
  ('flexion', 'Flexion'),
  ('extension', 'Extension'),
  ('rotation', 'Rotation'),
  ('abduction', 'Abduction'),
  ('adduction', 'Adduction'),
  ('internal_rotation', 'Internal rotation'),
  ('external_rotation', 'External rotation'),
  ('plantarflexion', 'Plantarflexion'),
  ('dorsiflexion', 'Dorsiflexion'),
  ('inversion', 'Inversion'),
  ('eversion', 'Eversion'),
  ('balance', 'Balance'),
  ('gait', 'Gait'),
  ('stabilization', 'Stabilization'),
  ('other', 'Other')
on conflict (stable_key) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Curated rehab exercise catalog
-- ---------------------------------------------------------------------------

create temporary table _mtfbwu_rehab_exercise_seed (
  stable_key text primary key,
  name text not null,
  description text not null,
  exercise_category public.rehab_exercise_category not null,
  body_area_key text,
  movement_key text,
  bilateral boolean not null default false,
  load_supported boolean not null default false,
  hold_supported boolean not null default false,
  duration_supported boolean not null default false,
  assistance_supported boolean not null default false,
  rom_tracking_supported boolean not null default false,
  verified boolean not null default false
) on commit drop;

insert into _mtfbwu_rehab_exercise_seed values
  -- Knee / lower body
  ('quad_set', 'Quad Set', 'General reference: gently tighten the front thigh muscles while keeping the leg still. Not individual treatment advice.', 'isometric', 'knee', 'extension', false, false, true, false, false, false, true),
  ('straight_leg_raise', 'Straight-Leg Raise', 'General reference: lift a straight leg a short distance from a supported lying position. Not individual treatment advice.', 'activation', 'hip', 'flexion', false, false, false, true, false, false, true),
  ('heel_slide', 'Heel Slide', 'General reference: slide the heel toward the body while lying down to encourage knee bending. Not individual treatment advice.', 'mobility', 'knee', 'flexion', false, false, false, true, false, true, true),
  ('terminal_knee_extension', 'Terminal Knee Extension', 'General reference: straighten the knee through the final range from a partially bent position. Not individual treatment advice.', 'activation', 'knee', 'extension', false, false, false, true, false, true, true),
  ('glute_bridge', 'Glute Bridge', 'General reference: lift the hips from a lying position while keeping feet flat. Not individual treatment advice.', 'activation', 'hip', 'extension', false, false, true, true, false, false, true),
  ('clamshell', 'Clamshell', 'General reference: open the top knee while lying on the side with hips and knees bent. Not individual treatment advice.', 'activation', 'hip', 'abduction', false, false, true, true, false, false, true),
  ('side_lying_hip_abduction', 'Side-Lying Hip Abduction', 'General reference: raise the top leg while lying on the side with the body aligned. Not individual treatment advice.', 'activation', 'hip', 'abduction', false, false, false, true, false, false, true),
  ('seated_knee_extension_no_load', 'Seated Knee Extension (No External Load)', 'General reference: extend the knee from a seated position without added resistance. Not individual treatment advice.', 'activation', 'knee', 'extension', false, false, false, true, false, true, true),
  ('supported_mini_squat', 'Supported Mini Squat', 'General reference: perform a shallow squat while holding a stable support for balance. Not individual treatment advice.', 'strength', 'knee', 'flexion', false, true, false, true, true, true, true),
  ('sit_to_stand', 'Sit-to-Stand', 'General reference: rise from a chair to standing and lower back under control. Not individual treatment advice.', 'strength', 'knee', 'extension', false, true, false, true, true, false, true),
  ('calf_raise', 'Calf Raise', 'General reference: rise onto the toes and lower the heels under control while standing. Not individual treatment advice.', 'strength', 'ankle', 'plantarflexion', false, true, false, true, false, false, true),
  ('hamstring_curl_no_load', 'Hamstring Curl (No External Load)', 'General reference: bend the knee to bring the heel toward the body without added resistance. Not individual treatment advice.', 'activation', 'knee', 'flexion', false, false, false, true, false, true, true),
  ('step_up', 'Step-Up', 'General reference: step onto a low stable platform and return under control. Not individual treatment advice.', 'strength', 'knee', 'extension', false, true, false, true, true, false, true),
  ('step_down', 'Step-Down', 'General reference: lower from a low platform with control on the supporting leg. Not individual treatment advice.', 'control', 'knee', 'flexion', false, true, false, true, true, false, true),
  ('single_leg_balance', 'Single-Leg Balance', 'General reference: stand on one leg while maintaining steady posture near a support if needed. Not individual treatment advice.', 'balance', 'ankle', 'balance', false, false, true, true, true, false, true),
  ('tandem_stance', 'Tandem Stance', 'General reference: stand with one foot directly in front of the other to practice narrow-base balance. Not individual treatment advice.', 'balance', 'full_body', 'balance', false, false, true, true, true, false, true),
  ('ankle_pumps', 'Ankle Pumps', 'General reference: alternately point and flex the foot through a comfortable range while seated or lying. Not individual treatment advice.', 'mobility', 'ankle', 'dorsiflexion', false, false, false, true, false, false, true),
  ('wall_sit', 'Wall Sit', 'General reference: hold a partial squat position with the back supported against a wall. Not individual treatment advice.', 'isometric', 'knee', 'flexion', false, false, true, true, false, false, true),
  ('split_stance_weight_shift', 'Split-Stance Weight Shift', 'General reference: shift body weight forward and back between front and back feet in a staggered stance. Not individual treatment advice.', 'control', 'full_body', 'stabilization', false, false, false, true, true, false, true),

  -- Upper body
  ('scapular_retraction', 'Scapular Retraction', 'General reference: gently squeeze the shoulder blades together without shrugging. Not individual treatment advice.', 'activation', 'shoulder', 'stabilization', false, false, true, true, false, false, true),
  ('wall_slide', 'Wall Slide', 'General reference: slide the forearms upward along a wall while keeping contact and an upright posture. Not individual treatment advice.', 'mobility', 'shoulder', 'flexion', false, false, false, true, false, true, true),
  ('shoulder_pendulum', 'Shoulder Pendulum', 'General reference: let the arm swing gently in small arcs while the torso stays relaxed and supported. Not individual treatment advice.', 'mobility', 'shoulder', 'flexion', false, false, false, true, false, false, true),
  ('band_external_rotation', 'Band External Rotation', 'General reference: rotate the forearm outward against light band resistance with the elbow at the side. Not individual treatment advice.', 'activation', 'shoulder', 'external_rotation', false, true, false, true, false, false, true),
  ('band_internal_rotation', 'Band Internal Rotation', 'General reference: rotate the forearm inward against light band resistance with the elbow at the side. Not individual treatment advice.', 'activation', 'shoulder', 'internal_rotation', false, true, false, true, false, false, true),
  ('isometric_shoulder_flexion', 'Isometric Shoulder Flexion', 'General reference: press the arm forward into a fixed object without moving through range. Not individual treatment advice.', 'isometric', 'shoulder', 'flexion', false, false, true, true, false, false, true),
  ('isometric_shoulder_abduction', 'Isometric Shoulder Abduction', 'General reference: press the arm outward into a fixed object without moving through range. Not individual treatment advice.', 'isometric', 'shoulder', 'abduction', false, false, true, true, false, false, true),
  ('wrist_flexion_extension_mobility', 'Wrist Flexion/Extension Mobility', 'General reference: move the wrist through comfortable flexion and extension ranges without force. Not individual treatment advice.', 'mobility', 'wrist', 'flexion', false, false, false, true, false, true, true),
  ('elbow_flexion_extension_mobility', 'Elbow Flexion/Extension Mobility', 'General reference: bend and straighten the elbow through a comfortable range without added load. Not individual treatment advice.', 'mobility', 'elbow', 'flexion', false, false, false, true, false, true, true),

  -- Mobility / control
  ('ankle_dorsiflexion_mobility', 'Ankle Dorsiflexion Mobility', 'General reference: bring the knee forward over the toes in a controlled stretch position. Not individual treatment advice.', 'mobility', 'ankle', 'dorsiflexion', false, false, false, true, false, true, true),
  ('hip_flexor_stretch', 'Hip Flexor Stretch', 'General reference: hold a gentle stretch at the front of the hip in a half-kneeling or standing lunge position. Not individual treatment advice.', 'stretching', 'hip', 'extension', false, false, true, true, false, false, true),
  ('hamstring_stretch', 'Hamstring Stretch', 'General reference: hold a gentle stretch along the back of the thigh in a supported position. Not individual treatment advice.', 'stretching', 'hip', 'flexion', false, false, true, true, false, false, true),
  ('thoracic_rotation', 'Thoracic Rotation', 'General reference: rotate the upper back gently while keeping the pelvis relatively stable. Not individual treatment advice.', 'mobility', 'upper_back', 'rotation', false, false, false, true, false, true, true),
  ('pelvic_tilt', 'Pelvic Tilt', 'General reference: alternate flattening and arching the lower back while lying with knees bent. Not individual treatment advice.', 'control', 'core', 'stabilization', false, false, false, true, false, false, true),
  ('dead_bug', 'Dead Bug', 'General reference: lie on the back and alternately extend opposite arm and leg while keeping the trunk stable. Not individual treatment advice.', 'control', 'core', 'stabilization', false, false, false, true, false, false, true),
  ('bird_dog', 'Bird Dog', 'General reference: from hands and knees, extend opposite arm and leg while keeping the trunk level. Not individual treatment advice.', 'control', 'core', 'stabilization', false, false, false, true, false, false, true);

insert into public.rehab_exercise_definitions (
  stable_key,
  name,
  normalized_name,
  description,
  body_area_id,
  movement_id,
  exercise_category,
  bilateral,
  load_supported,
  hold_supported,
  duration_supported,
  assistance_supported,
  rom_tracking_supported,
  source,
  verified,
  active
)
select
  s.stable_key,
  s.name,
  lower(regexp_replace(s.name, '[^a-zA-Z0-9]+', '_', 'g')),
  s.description,
  ba.id,
  mv.id,
  s.exercise_category,
  s.bilateral,
  s.load_supported,
  s.hold_supported,
  s.duration_supported,
  s.assistance_supported,
  s.rom_tracking_supported,
  'mtfbwu_curated'::public.rehab_exercise_source,
  s.verified,
  true
from _mtfbwu_rehab_exercise_seed s
left join public.rehab_body_areas ba on ba.stable_key = s.body_area_key
left join public.rehab_movements mv on mv.stable_key = s.movement_key
on conflict (stable_key) do update set
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  description = excluded.description,
  body_area_id = excluded.body_area_id,
  movement_id = excluded.movement_id,
  exercise_category = excluded.exercise_category,
  bilateral = excluded.bilateral,
  load_supported = excluded.load_supported,
  hold_supported = excluded.hold_supported,
  duration_supported = excluded.duration_supported,
  assistance_supported = excluded.assistance_supported,
  rom_tracking_supported = excluded.rom_tracking_supported,
  source = excluded.source,
  verified = excluded.verified,
  active = excluded.active,
  updated_at = timezone('utc', now());
