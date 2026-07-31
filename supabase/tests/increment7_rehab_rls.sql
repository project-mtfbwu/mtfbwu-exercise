-- Increment 7 rehab engine RLS checks.
-- Run after migrations, for example:
--   Get-Content supabase/tests/increment7_rehab_rls.sql -Raw |
--     docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
-- The transaction rolls back all fixture rows. A failing assertion raises an exception.
-- Assumes migrations 20260731120000_increment7_rehab_engine.sql and
-- 20260731120100_increment7_rehab_catalog_seed.sql have been applied.

begin;

do $$
begin
  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'rehab_body_areas', 'rehab_movements', 'rehab_exercise_definitions',
        'rehab_exercise_aliases', 'user_rehab_exercises', 'rehab_clinician_sources',
        'rehab_plans', 'rehab_plan_phases', 'rehab_plan_days', 'rehab_plan_exercises',
        'rehab_set_prescriptions', 'rehab_restrictions', 'scheduled_rehab_sessions',
        'rehab_sessions', 'rehab_session_exercises', 'rehab_sets',
        'rehab_session_observations', 'rehab_alert_events'
      ])
      and c.relrowsecurity
  ) <> 18 then
    raise exception 'every Increment 7 rehab-engine table must have RLS enabled';
  end if;

  if not exists (
    select 1 from public.rehab_exercise_definitions where stable_key = 'quad_set' and active
  ) then
    raise exception 'expected curated rehab_exercise_definitions seed row quad_set to exist and be active';
  end if;

  if (select count(*) from public.rehab_body_areas) < 13 then
    raise exception 'expected rehab_body_areas seed data to exist';
  end if;

  if (select count(*) from public.rehab_movements) < 15 then
    raise exception 'expected rehab_movements seed data to exist';
  end if;
end $$;

do $$
declare
  user_one uuid := '96000000-0000-0000-0000-000000000001';
  user_two uuid := '96000000-0000-0000-0000-000000000002';
  catalog_exercise uuid;
  user_rehab_exercise_one uuid := '96000002-0000-0000-0000-000000000001';
  user_rehab_exercise_two uuid := '96000002-0000-0000-0000-000000000002';
  clinician_source_one uuid := '96000003-0000-0000-0000-000000000001';
  clinician_source_two uuid := '96000003-0000-0000-0000-000000000002';
  plan_one uuid := '96000004-0000-0000-0000-000000000001';
  plan_one_deleted uuid := '96000004-0000-0000-0000-000000000002';
  plan_two uuid := '96000004-0000-0000-0000-000000000003';
  phase_one uuid := '96000005-0000-0000-0000-000000000001';
  phase_two uuid := '96000005-0000-0000-0000-000000000002';
  plan_day_one uuid := '96000006-0000-0000-0000-000000000001';
  plan_day_two uuid := '96000006-0000-0000-0000-000000000002';
  plan_exercise_one uuid := '96000007-0000-0000-0000-000000000001';
  set_prescription_one uuid := '96000008-0000-0000-0000-000000000001';
  restriction_one uuid := '96000009-0000-0000-0000-000000000001';
  restriction_two uuid := '96000009-0000-0000-0000-000000000002';
  scheduled_one uuid := '96000010-0000-0000-0000-000000000001';
  scheduled_two uuid := '96000010-0000-0000-0000-000000000002';
  daily_record_one uuid := '96000011-0000-0000-0000-000000000001';
  daily_record_two uuid := '96000011-0000-0000-0000-000000000002';
  session_one uuid := '96000012-0000-0000-0000-000000000001';
  session_two uuid := '96000012-0000-0000-0000-000000000002';
  session_exercise_one uuid := '96000013-0000-0000-0000-000000000001';
  rehab_set_one uuid := '96000014-0000-0000-0000-000000000001';
  observation_one uuid := '96000015-0000-0000-0000-000000000001';
  alert_one uuid := '96000016-0000-0000-0000-000000000001';
  alert_two uuid := '96000016-0000-0000-0000-000000000002';
  knee_body_area uuid;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment7-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment7-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.profiles (id) values (user_one), (user_two)
  on conflict (id) do nothing;

  select id into catalog_exercise from public.rehab_exercise_definitions where stable_key = 'quad_set';
  select id into knee_body_area from public.rehab_body_areas where stable_key = 'knee';

  insert into public.user_rehab_exercises (id, user_id, custom_name, instructions)
  values
    (user_rehab_exercise_one, user_one, 'User one custom heel slide variant', 'Private cue'),
    (user_rehab_exercise_two, user_two, 'User two custom heel slide variant', 'Private cue')
  on conflict (id) do nothing;

  insert into public.rehab_clinician_sources (
    id, user_id, source_type, clinician_name, confirmed_by_user
  )
  values
    (clinician_source_one, user_one, 'physiotherapist', 'Dr. Example One', true),
    (clinician_source_two, user_two, 'physiotherapist', 'Dr. Example Two', true)
  on conflict (id) do nothing;

  insert into public.rehab_plans (id, user_id, name, body_area_id, side, clinician_source_id, active)
  values
    (plan_one, user_one, 'User one rehab plan', knee_body_area, 'left', clinician_source_one, true),
    (plan_one_deleted, user_one, 'User one archived rehab plan', knee_body_area, 'left', null, false),
    (plan_two, user_two, 'User two rehab plan', knee_body_area, 'right', clinician_source_two, true)
  on conflict (id) do nothing;

  update public.rehab_plans set deleted_at = timezone('utc', now()) where id = plan_one_deleted;

  insert into public.rehab_plan_phases (id, rehab_plan_id, name, phase_type, display_order)
  values
    (phase_one, plan_one, 'Mobility phase', 'mobility', 0),
    (phase_two, plan_two, 'Mobility phase', 'mobility', 0)
  on conflict (id) do nothing;

  insert into public.rehab_plan_days (id, rehab_plan_phase_id, name, day_index)
  values
    (plan_day_one, phase_one, 'Day 1', 0),
    (plan_day_two, phase_two, 'Day 1', 0)
  on conflict (id) do nothing;

  insert into public.rehab_plan_exercises (
    id, rehab_plan_day_id, rehab_exercise_definition_id, display_order, side,
    instructions_snapshot, stop_conditions_snapshot
  )
  values (
    plan_exercise_one, plan_day_one, catalog_exercise, 0, 'left',
    'Clinician: gentle quad set', 'Stop if sharp pain'
  )
  on conflict (id) do nothing;

  insert into public.rehab_set_prescriptions (
    id, rehab_plan_exercise_id, set_index, target_reps, completion_rule, pain_limit
  )
  values (set_prescription_one, plan_exercise_one, 1, 10, 'exact', 4)
  on conflict (id) do nothing;

  insert into public.rehab_restrictions (
    id, rehab_plan_id, restriction_type, side, value_text, severity
  )
  values
    (restriction_one, plan_one, 'stop_condition', 'left', 'Stop if knee gives way', 'stop'),
    (restriction_two, plan_two, 'stop_condition', 'right', 'Stop if instability increases', 'stop')
  on conflict (id) do nothing;

  insert into public.scheduled_rehab_sessions (
    id, user_id, rehab_plan_day_id, local_date, timezone, title
  )
  values
    (scheduled_one, user_one, plan_day_one, date '2026-07-31', 'UTC', 'Rehab day 1'),
    (scheduled_two, user_two, plan_day_two, date '2026-07-31', 'UTC', 'Rehab day 1')
  on conflict (id) do nothing;

  insert into public.daily_records (id, user_id, local_date)
  values
    (daily_record_one, user_one, date '2026-07-31'),
    (daily_record_two, user_two, date '2026-07-31')
  on conflict (id) do nothing;

  insert into public.rehab_sessions (
    id, user_id, daily_record_id, source_plan_id, source_plan_version, source_plan_day_id,
    title, side, status,
    clinician_source_snapshot, restriction_snapshot_json, session_snapshot_json
  )
  values
    (
      session_one, user_one, daily_record_one, plan_one, 1, plan_day_one,
      'User one rehab session', 'left', 'completed',
      '{"clinician_name":"Dr. Example One"}'::jsonb,
      '[{"value_text":"Stop if knee gives way"}]'::jsonb,
      '{"exercises":[{"name":"Quad Set"}]}'::jsonb
    ),
    (
      session_two, user_two, daily_record_two, plan_two, 1, plan_day_two,
      'User two rehab session', 'right', 'completed',
      '{"clinician_name":"Dr. Example Two"}'::jsonb,
      '[]'::jsonb,
      '{"exercises":[{"name":"Quad Set"}]}'::jsonb
    )
  on conflict (id) do nothing;

  insert into public.rehab_session_exercises (
    id, rehab_session_id, source_exercise_id, exercise_name_snapshot, side, exercise_order,
    instructions_snapshot, stop_conditions_snapshot
  )
  values (
    session_exercise_one, session_one, catalog_exercise, 'Quad Set', 'left', 0,
    'Clinician: gentle quad set', 'Stop if sharp pain'
  )
  on conflict (id) do nothing;

  insert into public.rehab_sets (
    id, rehab_session_exercise_id, set_index, status, side, reps,
    pain_before, pain_during, pain_after, confidence
  )
  values (rehab_set_one, session_exercise_one, 1, 'completed', 'left', 10, 2, 3, 2, 7)
  on conflict (id) do nothing;

  insert into public.rehab_session_observations (
    id, rehab_session_id, observation_type, body_area, side, value_numeric, severity
  )
  values (observation_one, session_one, 'pain', 'knee', 'left', 3, 'informational')
  on conflict (id) do nothing;

  insert into public.rehab_alert_events (
    id, user_id, rehab_session_id, rehab_set_id, alert_type, severity, message_snapshot
  )
  values
    (alert_one, user_one, session_one, rehab_set_one, 'pain_threshold', 'caution', 'Pain exceeded plan limit'),
    (alert_two, user_two, session_two, null, 'other', 'informational', 'Other user alert')
  on conflict (id) do nothing;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-0000-0000-000000000001', true);

do $$
declare
  changed_rows integer;
  user_one uuid := '96000000-0000-0000-0000-000000000001';
  user_two uuid := '96000000-0000-0000-0000-000000000002';
  catalog_exercise uuid;
  user_rehab_exercise_one uuid := '96000002-0000-0000-0000-000000000001';
  user_rehab_exercise_two uuid := '96000002-0000-0000-0000-000000000002';
  clinician_source_one uuid := '96000003-0000-0000-0000-000000000001';
  clinician_source_two uuid := '96000003-0000-0000-0000-000000000002';
  plan_one uuid := '96000004-0000-0000-0000-000000000001';
  plan_one_deleted uuid := '96000004-0000-0000-0000-000000000002';
  plan_two uuid := '96000004-0000-0000-0000-000000000003';
  phase_one uuid := '96000005-0000-0000-0000-000000000001';
  phase_two uuid := '96000005-0000-0000-0000-000000000002';
  plan_day_one uuid := '96000006-0000-0000-0000-000000000001';
  plan_day_two uuid := '96000006-0000-0000-0000-000000000002';
  plan_exercise_one uuid := '96000007-0000-0000-0000-000000000001';
  set_prescription_one uuid := '96000008-0000-0000-0000-000000000001';
  restriction_one uuid := '96000009-0000-0000-0000-000000000001';
  restriction_two uuid := '96000009-0000-0000-0000-000000000002';
  scheduled_one uuid := '96000010-0000-0000-0000-000000000001';
  scheduled_two uuid := '96000010-0000-0000-0000-000000000002';
  session_one uuid := '96000012-0000-0000-0000-000000000001';
  session_two uuid := '96000012-0000-0000-0000-000000000002';
  session_exercise_one uuid := '96000013-0000-0000-0000-000000000001';
  rehab_set_one uuid := '96000014-0000-0000-0000-000000000001';
  observation_one uuid := '96000015-0000-0000-0000-000000000001';
  alert_one uuid := '96000016-0000-0000-0000-000000000001';
  alert_two uuid := '96000016-0000-0000-0000-000000000002';
begin
  select id into catalog_exercise from public.rehab_exercise_definitions where stable_key = 'quad_set';

  -- System catalog: readable by any authenticated user, active only.
  if not exists (select 1 from public.rehab_exercise_definitions where id = catalog_exercise) then
    raise exception 'authenticated user cannot read an active system rehab_exercise_definitions row';
  end if;
  if not exists (select 1 from public.rehab_body_areas where stable_key = 'knee') then
    raise exception 'authenticated user cannot read system rehab_body_areas catalog';
  end if;
  if not exists (select 1 from public.rehab_movements where stable_key = 'flexion') then
    raise exception 'authenticated user cannot read system rehab_movements catalog';
  end if;

  -- System catalog: writes are denied outright (no grant, no policy).
  begin
    insert into public.rehab_body_areas (stable_key, name) values ('increment7-hack', 'Hack');
    raise exception 'authenticated user inserted a system rehab_body_areas row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.rehab_exercise_definitions set verified = false where id = catalog_exercise;
    raise exception 'authenticated user updated a system rehab_exercise_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.rehab_movements where stable_key = 'flexion';
    raise exception 'authenticated user deleted a system rehab_movements row';
  exception
    when insufficient_privilege then null;
  end;

  -- user_rehab_exercises: private, owner-only isolation.
  if not exists (select 1 from public.user_rehab_exercises where id = user_rehab_exercise_one) then
    raise exception 'owner cannot read their own user_rehab_exercises row';
  end if;
  if exists (select 1 from public.user_rehab_exercises where id = user_rehab_exercise_two) then
    raise exception 'authenticated user can read another user''s private user_rehab_exercises row';
  end if;

  begin
    insert into public.user_rehab_exercises (user_id, custom_name) values (user_two, 'Hijacked custom exercise');
    raise exception 'authenticated user inserted a user_rehab_exercises row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- rehab_clinician_sources: owner-only isolation.
  if not exists (select 1 from public.rehab_clinician_sources where id = clinician_source_one) then
    raise exception 'owner cannot read their own rehab_clinician_sources row';
  end if;
  if exists (select 1 from public.rehab_clinician_sources where id = clinician_source_two) then
    raise exception 'authenticated user can read another user''s rehab_clinician_sources row';
  end if;

  begin
    insert into public.rehab_clinician_sources (user_id, source_type, clinician_name)
    values (user_two, 'other', 'Hijacked clinician');
    raise exception 'authenticated user inserted a rehab_clinician_sources row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- rehab_plans: ownership + soft-delete filtering.
  if not exists (select 1 from public.rehab_plans where id = plan_one) then
    raise exception 'owner cannot read their own active rehab_plans row';
  end if;
  if exists (select 1 from public.rehab_plans where id = plan_one_deleted) then
    raise exception 'soft-deleted rehab_plans row is still selectable by its owner';
  end if;
  if exists (select 1 from public.rehab_plans where id = plan_two) then
    raise exception 'authenticated user can read another user''s rehab_plans row';
  end if;

  update public.rehab_plans set name = 'renamed' where id = plan_two;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'authenticated user updated another user''s rehab_plans row';
  end if;

  -- rehab_plan_phases / rehab_plan_days / rehab_plan_exercises / rehab_set_prescriptions:
  -- ownership flows through the plan chain.
  if not exists (select 1 from public.rehab_plan_phases where id = phase_one) then
    raise exception 'owner cannot read their own rehab_plan_phases row via plan ownership';
  end if;
  if exists (select 1 from public.rehab_plan_phases where id = phase_two) then
    raise exception 'authenticated user can read another user''s rehab_plan_phases row';
  end if;

  if not exists (select 1 from public.rehab_plan_days where id = plan_day_one) then
    raise exception 'owner cannot read their own rehab_plan_days row via plan ownership';
  end if;
  if exists (select 1 from public.rehab_plan_days where id = plan_day_two) then
    raise exception 'authenticated user can read another user''s rehab_plan_days row';
  end if;

  if not exists (select 1 from public.rehab_plan_exercises where id = plan_exercise_one) then
    raise exception 'owner cannot read their own rehab_plan_exercises row via plan ownership';
  end if;

  if not exists (select 1 from public.rehab_set_prescriptions where id = set_prescription_one) then
    raise exception 'owner cannot read their own rehab_set_prescriptions row via plan ownership';
  end if;

  begin
    insert into public.rehab_plan_days (rehab_plan_phase_id, name, day_index)
    values (phase_two, 'Hijacked day', 1);
    raise exception 'authenticated user inserted a rehab_plan_days row under another user''s phase';
  exception
    when insufficient_privilege then null;
  end;

  -- rehab_restrictions: ownership via plan.
  if not exists (select 1 from public.rehab_restrictions where id = restriction_one) then
    raise exception 'owner cannot read their own rehab_restrictions row via plan ownership';
  end if;
  if exists (select 1 from public.rehab_restrictions where id = restriction_two) then
    raise exception 'authenticated user can read another user''s rehab_restrictions row';
  end if;

  begin
    insert into public.rehab_restrictions (rehab_plan_id, restriction_type, value_text)
    values (plan_two, 'custom', 'Hijacked restriction');
    raise exception 'authenticated user inserted a rehab_restrictions row under another user''s plan';
  exception
    when insufficient_privilege then null;
  end;

  -- scheduled_rehab_sessions: cross-user denial.
  if not exists (select 1 from public.scheduled_rehab_sessions where id = scheduled_one) then
    raise exception 'owner cannot read their own scheduled_rehab_sessions row';
  end if;
  if exists (select 1 from public.scheduled_rehab_sessions where id = scheduled_two) then
    raise exception 'authenticated user can read another user''s scheduled_rehab_sessions row';
  end if;

  begin
    insert into public.scheduled_rehab_sessions (user_id, local_date, timezone, title)
    values (user_two, date '2026-08-01', 'UTC', 'Hijacked schedule');
    raise exception 'authenticated user inserted a scheduled_rehab_sessions row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- rehab_sessions / rehab_session_exercises / rehab_sets / rehab_session_observations:
  -- ownership flows through the session chain.
  if not exists (select 1 from public.rehab_sessions where id = session_one) then
    raise exception 'owner cannot read their own rehab_sessions row';
  end if;
  if exists (select 1 from public.rehab_sessions where id = session_two) then
    raise exception 'authenticated user can read another user''s rehab_sessions row';
  end if;

  if not exists (select 1 from public.rehab_session_exercises where id = session_exercise_one) then
    raise exception 'owner cannot read their own rehab_session_exercises row via session ownership';
  end if;

  if not exists (select 1 from public.rehab_sets where id = rehab_set_one) then
    raise exception 'owner cannot read their own rehab_sets row via session ownership';
  end if;

  if not exists (select 1 from public.rehab_session_observations where id = observation_one) then
    raise exception 'owner cannot read their own rehab_session_observations row via session ownership';
  end if;

  begin
    insert into public.rehab_sets (rehab_session_exercise_id, set_index, reps)
    values (session_exercise_one, 2, 5);
    -- Allowed: owner may add a set to their own session exercise.
  exception
    when insufficient_privilege then
      raise exception 'owner could not insert a rehab_sets row on their own session exercise';
  end;

  update public.rehab_sessions set title = 'tampered' where id = session_two;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'authenticated user updated another user''s rehab_sessions row';
  end if;

  -- rehab_alert_events: owner-only.
  if not exists (select 1 from public.rehab_alert_events where id = alert_one) then
    raise exception 'owner cannot read their own rehab_alert_events row';
  end if;
  if exists (select 1 from public.rehab_alert_events where id = alert_two) then
    raise exception 'authenticated user can read another user''s rehab_alert_events row';
  end if;

  begin
    insert into public.rehab_alert_events (user_id, rehab_session_id, alert_type, message_snapshot)
    values (user_two, session_two, 'other', 'Hijacked alert');
    raise exception 'authenticated user inserted a rehab_alert_events row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- Historical snapshot isolation: completed session snapshots remain readable after
  -- the source plan is soft-deleted. Soft-delete itself is performed as the table
  -- owner (postgres) because authenticated UPDATE + SELECT(deleted_at is null)
  -- cannot RETURN/accept the transition under RLS — app archive uses
  -- public.archive_rehab_plan() (security definer). See migration align note.
end $$;

reset role;
update public.rehab_plans
set deleted_at = timezone('utc', now()), active = false
where id = '96000004-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-0000-0000-000000000001', true);

do $$
declare
  snapshot_name text;
  snapshot_clinician jsonb;
  snapshot_restrictions jsonb;
  session_one uuid := '96000012-0000-0000-0000-000000000001';
  session_exercise_one uuid := '96000013-0000-0000-0000-000000000001';
  plan_one uuid := '96000004-0000-0000-0000-000000000001';
begin
  if exists (select 1 from public.rehab_plans where id = plan_one) then
    raise exception 'soft-deleted rehab_plans row is still selectable by its owner after archive';
  end if;

  select exercise_name_snapshot into snapshot_name
  from public.rehab_session_exercises where id = session_exercise_one;
  if snapshot_name is distinct from 'Quad Set' then
    raise exception 'historical rehab_session_exercises snapshot was lost after plan soft-delete';
  end if;

  select clinician_source_snapshot, restriction_snapshot_json
  into snapshot_clinician, snapshot_restrictions
  from public.rehab_sessions where id = session_one;

  if snapshot_clinician->>'clinician_name' is distinct from 'Dr. Example One' then
    raise exception 'historical rehab_sessions clinician_source_snapshot was lost after plan soft-delete';
  end if;

  if jsonb_array_length(snapshot_restrictions) < 1 then
    raise exception 'historical rehab_sessions restriction_snapshot_json was lost after plan soft-delete';
  end if;

  if not exists (select 1 from public.rehab_sessions where id = session_one) then
    raise exception 'owner cannot read completed rehab_sessions row after source plan soft-delete';
  end if;
end $$;

-- archive_rehab_plan RPC: ownership, search_path, grants, idempotency, history.
set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-0000-0000-000000000001', true);

do $$
declare
  archive_plan uuid := '96000004-0000-0000-0000-000000000099';
  archive_version integer := 1;
  archived_row public.rehab_plans;
  proc_config text[];
begin
  insert into public.rehab_plans (id, user_id, name, version, active)
  values (archive_plan, '96000000-0000-0000-0000-000000000001', 'Archive RPC test plan', archive_version, true)
  on conflict (id) do update set deleted_at = null, active = true, version = archive_version;

  -- Owner can archive via RPC.
  select * into archived_row
  from public.archive_rehab_plan(archive_plan, archive_version);
  if archived_row.deleted_at is null or archived_row.active then
    raise exception 'archive_rehab_plan did not soft-delete the plan';
  end if;

  -- Idempotent re-archive returns the same archived row.
  select * into archived_row
  from public.archive_rehab_plan(archive_plan, archive_version + 1);
  if archived_row.id is distinct from archive_plan then
    raise exception 'idempotent re-archive returned unexpected plan id';
  end if;

  -- Archived plan not in active select.
  if exists (select 1 from public.rehab_plans where id = archive_plan) then
    raise exception 'archived rehab_plans row is still selectable by owner';
  end if;

  -- Historical session still readable after archive (session_one fixture).
  if not exists (
    select 1 from public.rehab_sessions where id = '96000012-0000-0000-0000-000000000001'
  ) then
    raise exception 'historical rehab_sessions row not readable after plan archive';
  end if;
end $$;

-- Other user cannot archive owner plan.
select set_config('request.jwt.claim.sub', '96000000-0000-0000-0000-000000000002', true);

do $$
begin
  begin
    perform public.archive_rehab_plan('96000004-0000-0000-0000-000000000099', 2);
    raise exception 'user_two archived user_one plan via archive_rehab_plan';
  exception
    when others then
      if sqlstate = 'P0002' then null;
      else raise;
      end if;
  end;
end $$;

reset role;

do $$
declare
  proc_config text[];
begin
  select proconfig into proc_config
  from pg_proc
  where proname = 'archive_rehab_plan'
    and pronamespace = 'public'::regnamespace;

  if proc_config is null or not ('search_path=public' = any (proc_config)) then
    raise exception 'archive_rehab_plan search_path is not fixed to public';
  end if;

  if has_function_privilege('anon', 'public.archive_rehab_plan(uuid, integer)', 'EXECUTE') then
    raise exception 'archive_rehab_plan execute granted to anon';
  end if;

  if not has_function_privilege('authenticated', 'public.archive_rehab_plan(uuid, integer)', 'EXECUTE') then
    raise exception 'archive_rehab_plan execute not granted to authenticated';
  end if;
end $$;

rollback;
