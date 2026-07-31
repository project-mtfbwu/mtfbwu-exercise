-- Increment 6 exercise catalog + workout engine RLS checks.
-- Run after migrations, for example:
--   Get-Content supabase/tests/increment6_workout_rls.sql -Raw |
--     docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
-- The transaction rolls back all fixture rows. A failing assertion raises an exception.
-- Assumes migrations 20260730120000_increment6_workout_engine.sql and
-- 20260730120100_increment6_exercise_catalog_seed.sql have been applied.

begin;

do $$
begin
  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'muscle_groups', 'equipment_types', 'movement_patterns', 'exercise_definitions',
        'exercise_aliases', 'exercise_muscle_groups', 'user_exercises', 'workout_plans',
        'workout_plan_days', 'workout_blocks', 'workout_block_exercises',
        'workout_set_prescriptions', 'scheduled_workouts', 'workout_sessions',
        'workout_session_exercises', 'workout_sets', 'workout_session_notes', 'personal_records'
      ])
      and c.relrowsecurity
  ) <> 18 then
    raise exception 'every Increment 6 workout-engine table must have RLS enabled';
  end if;

  if not exists (
    select 1 from public.exercise_definitions where stable_key = 'barbell_bench_press' and active
  ) then
    raise exception 'expected curated exercise_definitions seed row barbell_bench_press to exist and be active';
  end if;

  if (select count(*) from public.muscle_groups) < 1 then
    raise exception 'expected muscle_groups seed data to exist';
  end if;
end $$;

do $$
declare
  user_one uuid := '95000000-0000-0000-0000-000000000001';
  user_two uuid := '95000000-0000-0000-0000-000000000002';
  catalog_exercise uuid;
  user_exercise_one uuid := '95000002-0000-0000-0000-000000000001';
  user_exercise_two uuid := '95000002-0000-0000-0000-000000000002';
  plan_one uuid := '95000003-0000-0000-0000-000000000001';
  plan_one_deleted uuid := '95000003-0000-0000-0000-000000000002';
  plan_two uuid := '95000003-0000-0000-0000-000000000003';
  plan_day_one uuid := '95000004-0000-0000-0000-000000000001';
  plan_day_two uuid := '95000004-0000-0000-0000-000000000002';
  block_one uuid := '95000005-0000-0000-0000-000000000001';
  block_two uuid := '95000005-0000-0000-0000-000000000002';
  block_exercise_one uuid := '95000006-0000-0000-0000-000000000001';
  set_prescription_one uuid := '95000007-0000-0000-0000-000000000001';
  daily_record_one uuid := '95000008-0000-0000-0000-000000000001';
  daily_record_two uuid := '95000008-0000-0000-0000-000000000002';
  session_one uuid := '95000009-0000-0000-0000-000000000001';
  session_two uuid := '95000009-0000-0000-0000-000000000002';
  session_exercise_one uuid := '95000010-0000-0000-0000-000000000001';
  workout_set_one uuid := '95000011-0000-0000-0000-000000000001';
  session_note_one uuid := '95000012-0000-0000-0000-000000000001';
  personal_record_one uuid := '95000013-0000-0000-0000-000000000001';
  personal_record_two uuid := '95000013-0000-0000-0000-000000000002';
  scheduled_one uuid := '95000014-0000-0000-0000-000000000001';
  scheduled_two uuid := '95000014-0000-0000-0000-000000000002';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment6-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment6-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.profiles (id) values (user_one), (user_two)
  on conflict (id) do nothing;

  select id into catalog_exercise from public.exercise_definitions where stable_key = 'barbell_bench_press';

  insert into public.user_exercises (id, user_id, custom_name, private_notes)
  values
    (user_exercise_one, user_one, 'User one garage press', 'Private form cue'),
    (user_exercise_two, user_two, 'User two garage press', 'Private form cue')
  on conflict (id) do nothing;

  insert into public.workout_plans (id, user_id, name, active)
  values
    (plan_one, user_one, 'User one plan', true),
    (plan_one_deleted, user_one, 'User one archived plan', false),
    (plan_two, user_two, 'User two plan', true)
  on conflict (id) do nothing;

  update public.workout_plans set deleted_at = timezone('utc', now()) where id = plan_one_deleted;

  insert into public.workout_plan_days (id, workout_plan_id, name, sort_order)
  values
    (plan_day_one, plan_one, 'Day 1', 0),
    (plan_day_two, plan_two, 'Day 1', 0)
  on conflict (id) do nothing;

  insert into public.workout_blocks (id, workout_plan_day_id, block_type, sort_order)
  values
    (block_one, plan_day_one, 'straight_sets', 0),
    (block_two, plan_day_two, 'straight_sets', 0)
  on conflict (id) do nothing;

  insert into public.workout_block_exercises (id, workout_block_id, exercise_definition_id, sort_order)
  values (block_exercise_one, block_one, catalog_exercise, 0)
  on conflict (id) do nothing;

  insert into public.workout_set_prescriptions (
    id, workout_block_exercise_id, set_index, completion_rule, target_reps_min, target_reps_max
  )
  values (set_prescription_one, block_exercise_one, 1, 'rep_range', 5, 8)
  on conflict (id) do nothing;

  insert into public.scheduled_workouts (id, user_id, workout_plan_id, workout_plan_day_id, local_date, title)
  values
    (scheduled_one, user_one, plan_one, plan_day_one, date '2026-07-30', 'Push day'),
    (scheduled_two, user_two, plan_two, plan_day_two, date '2026-07-30', 'Push day')
  on conflict (id) do nothing;

  insert into public.daily_records (id, user_id, local_date)
  values
    (daily_record_one, user_one, date '2026-07-30'),
    (daily_record_two, user_two, date '2026-07-30')
  on conflict (id) do nothing;

  insert into public.workout_sessions (
    id, user_id, daily_record_id, workout_plan_id, workout_plan_day_id, status
  )
  values
    (session_one, user_one, daily_record_one, plan_one, plan_day_one, 'in_progress'),
    (session_two, user_two, daily_record_two, plan_two, plan_day_two, 'in_progress')
  on conflict (id) do nothing;

  insert into public.workout_session_exercises (
    id, workout_session_id, exercise_definition_id, display_name_snapshot, sort_order
  )
  values (session_exercise_one, session_one, catalog_exercise, 'Barbell Bench Press', 0)
  on conflict (id) do nothing;

  insert into public.workout_sets (id, workout_session_exercise_id, set_index, reps, weight_kg)
  values (workout_set_one, session_exercise_one, 1, 5, 60)
  on conflict (id) do nothing;

  insert into public.workout_session_notes (id, workout_session_id, user_id, body)
  values (session_note_one, session_one, user_one, 'Felt strong today')
  on conflict (id) do nothing;

  insert into public.personal_records (
    id, user_id, exercise_definition_id, exercise_label_snapshot, record_type, value, unit, workout_set_id
  )
  values
    (personal_record_one, user_one, catalog_exercise, 'Barbell Bench Press', '1rm', 100, 'kg', workout_set_one),
    (personal_record_two, user_two, catalog_exercise, 'Barbell Bench Press', '1rm', 80, 'kg', null)
  on conflict (id) do nothing;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-0000-0000-000000000001', true);

do $$
declare
  changed_rows integer;
  user_one uuid := '95000000-0000-0000-0000-000000000001';
  user_two uuid := '95000000-0000-0000-0000-000000000002';
  catalog_exercise uuid;
  user_exercise_one uuid := '95000002-0000-0000-0000-000000000001';
  user_exercise_two uuid := '95000002-0000-0000-0000-000000000002';
  plan_one uuid := '95000003-0000-0000-0000-000000000001';
  plan_one_deleted uuid := '95000003-0000-0000-0000-000000000002';
  plan_two uuid := '95000003-0000-0000-0000-000000000003';
  plan_day_one uuid := '95000004-0000-0000-0000-000000000001';
  plan_day_two uuid := '95000004-0000-0000-0000-000000000002';
  block_one uuid := '95000005-0000-0000-0000-000000000001';
  block_two uuid := '95000005-0000-0000-0000-000000000002';
  block_exercise_one uuid := '95000006-0000-0000-0000-000000000001';
  set_prescription_one uuid := '95000007-0000-0000-0000-000000000001';
  session_one uuid := '95000009-0000-0000-0000-000000000001';
  session_two uuid := '95000009-0000-0000-0000-000000000002';
  session_exercise_one uuid := '95000010-0000-0000-0000-000000000001';
  workout_set_one uuid := '95000011-0000-0000-0000-000000000001';
  personal_record_one uuid := '95000013-0000-0000-0000-000000000001';
  personal_record_two uuid := '95000013-0000-0000-0000-000000000002';
  scheduled_one uuid := '95000014-0000-0000-0000-000000000001';
  scheduled_two uuid := '95000014-0000-0000-0000-000000000002';
begin
  select id into catalog_exercise from public.exercise_definitions where stable_key = 'barbell_bench_press';

  -- System catalog: readable by any authenticated user, active only.
  if not exists (select 1 from public.exercise_definitions where id = catalog_exercise) then
    raise exception 'authenticated user cannot read an active system exercise_definitions row';
  end if;
  if not exists (select 1 from public.muscle_groups where stable_key = 'chest') then
    raise exception 'authenticated user cannot read system muscle_groups catalog';
  end if;
  if not exists (select 1 from public.equipment_types where stable_key = 'barbell') then
    raise exception 'authenticated user cannot read system equipment_types catalog';
  end if;
  if not exists (select 1 from public.movement_patterns where stable_key = 'horizontal_push') then
    raise exception 'authenticated user cannot read system movement_patterns catalog';
  end if;
  if not exists (
    select 1 from public.exercise_muscle_groups where exercise_definition_id = catalog_exercise
  ) then
    raise exception 'authenticated user cannot read system exercise_muscle_groups catalog';
  end if;

  -- System catalog: writes are denied outright (no grant, no policy).
  begin
    insert into public.muscle_groups (stable_key, name) values ('increment6-hack', 'Hack');
    raise exception 'authenticated user inserted a system muscle_groups row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.exercise_definitions set verified = false where id = catalog_exercise;
    raise exception 'authenticated user updated a system exercise_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.equipment_types where stable_key = 'barbell';
    raise exception 'authenticated user deleted a system equipment_types row';
  exception
    when insufficient_privilege then null;
  end;

  -- user_exercises: private, owner-only isolation.
  if not exists (select 1 from public.user_exercises where id = user_exercise_one) then
    raise exception 'owner cannot read their own user_exercises row';
  end if;
  if exists (select 1 from public.user_exercises where id = user_exercise_two) then
    raise exception 'authenticated user can read another user''s private user_exercises row';
  end if;

  begin
    insert into public.user_exercises (user_id, custom_name) values (user_two, 'Hijacked custom exercise');
    raise exception 'authenticated user inserted a user_exercises row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- workout_plans: ownership + soft-delete filtering.
  if not exists (select 1 from public.workout_plans where id = plan_one) then
    raise exception 'owner cannot read their own active workout_plans row';
  end if;
  if exists (select 1 from public.workout_plans where id = plan_one_deleted) then
    raise exception 'soft-deleted workout_plans row is still selectable by its owner';
  end if;
  if exists (select 1 from public.workout_plans where id = plan_two) then
    raise exception 'authenticated user can read another user''s workout_plans row';
  end if;

  update public.workout_plans set name = 'renamed' where id = plan_two;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'authenticated user updated another user''s workout_plans row';
  end if;

  -- workout_plan_days / workout_blocks / workout_block_exercises / workout_set_prescriptions:
  -- ownership flows through the plan chain.
  if not exists (select 1 from public.workout_plan_days where id = plan_day_one) then
    raise exception 'owner cannot read their own workout_plan_days row via plan ownership';
  end if;
  if exists (select 1 from public.workout_plan_days where id = plan_day_two) then
    raise exception 'authenticated user can read another user''s workout_plan_days row';
  end if;

  if not exists (select 1 from public.workout_blocks where id = block_one) then
    raise exception 'owner cannot read their own workout_blocks row via plan ownership';
  end if;
  if exists (select 1 from public.workout_blocks where id = block_two) then
    raise exception 'authenticated user can read another user''s workout_blocks row';
  end if;

  if not exists (select 1 from public.workout_block_exercises where id = block_exercise_one) then
    raise exception 'owner cannot read their own workout_block_exercises row via plan ownership';
  end if;

  if not exists (select 1 from public.workout_set_prescriptions where id = set_prescription_one) then
    raise exception 'owner cannot read their own workout_set_prescriptions row via plan ownership';
  end if;

  begin
    insert into public.workout_blocks (workout_plan_day_id, block_type, sort_order)
    values (plan_day_two, 'straight_sets', 1);
    raise exception 'authenticated user inserted a workout_blocks row under another user''s plan day';
  exception
    when insufficient_privilege then null;
  end;

  -- scheduled_workouts: cross-user denial.
  if not exists (select 1 from public.scheduled_workouts where id = scheduled_one) then
    raise exception 'owner cannot read their own scheduled_workouts row';
  end if;
  if exists (select 1 from public.scheduled_workouts where id = scheduled_two) then
    raise exception 'authenticated user can read another user''s scheduled_workouts row';
  end if;

  begin
    insert into public.scheduled_workouts (user_id, local_date, title)
    values (user_two, date '2026-07-31', 'Hijacked schedule');
    raise exception 'authenticated user inserted a scheduled_workouts row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- workout_sessions / workout_session_exercises / workout_sets / workout_session_notes:
  -- ownership flows through the session chain.
  if not exists (select 1 from public.workout_sessions where id = session_one) then
    raise exception 'owner cannot read their own workout_sessions row';
  end if;
  if exists (select 1 from public.workout_sessions where id = session_two) then
    raise exception 'authenticated user can read another user''s workout_sessions row';
  end if;

  if not exists (select 1 from public.workout_session_exercises where id = session_exercise_one) then
    raise exception 'owner cannot read their own workout_session_exercises row via session ownership';
  end if;

  if not exists (select 1 from public.workout_sets where id = workout_set_one) then
    raise exception 'owner cannot read their own workout_sets row via session ownership';
  end if;

  if not exists (
    select 1 from public.workout_session_notes
    where id = '95000012-0000-0000-0000-000000000001' and user_id = user_one
  ) then
    raise exception 'owner cannot read their own workout_session_notes row';
  end if;

  begin
    insert into public.workout_sets (workout_session_exercise_id, set_index, reps)
    values (session_exercise_one, 2, 999);
    -- Allowed: owner may add a set to their own session exercise.
  exception
    when insufficient_privilege then
      raise exception 'owner could not insert a workout_sets row on their own session exercise';
  end;

  update public.workout_sessions set notes = 'tampered' where id = session_two;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'authenticated user updated another user''s workout_sessions row';
  end if;

  -- personal_records: owner-only.
  if not exists (select 1 from public.personal_records where id = personal_record_one) then
    raise exception 'owner cannot read their own personal_records row';
  end if;
  if exists (select 1 from public.personal_records where id = personal_record_two) then
    raise exception 'authenticated user can read another user''s personal_records row';
  end if;

  begin
    insert into public.personal_records (user_id, exercise_label_snapshot, record_type, value, unit)
    values (user_two, 'Hijacked PR', '1rm', 999, 'kg');
    raise exception 'authenticated user inserted a personal_records row for another user';
  exception
    when insufficient_privilege then null;
  end;
end $$;

rollback;
