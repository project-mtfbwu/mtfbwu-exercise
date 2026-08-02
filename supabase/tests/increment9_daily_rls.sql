-- Increment 9 daily system RLS checks.
-- Run after migrations, for example:
--   Get-Content supabase/tests/increment9_daily_rls.sql -Raw |
--     docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
-- The transaction rolls back all fixture rows. A failing assertion raises an exception.
-- Assumes migrations 20260801130000_increment9_daily_system.sql and
-- 20260801130100_increment9_tracker_catalog_seed.sql have been applied.

begin;

do $$
begin
  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'tracker_definitions', 'user_trackers', 'tracker_targets', 'tracker_events',
        'tracker_daily_summaries', 'hydration_entries', 'meditation_sessions',
        'sleep_sessions', 'supplement_definitions', 'user_supplements',
        'supplement_intakes', 'tracker_reminders', 'tracker_streaks',
        'profile_preferences', 'daily_overview_preferences'
      ])
      and c.relrowsecurity
  ) <> 15 then
    raise exception 'every Increment 9 daily-system table must have RLS enabled';
  end if;

  if not exists (
    select 1 from public.tracker_definitions where stable_key = 'hydration' and active
  ) then
    raise exception 'expected curated tracker_definitions seed row hydration to exist and be active';
  end if;

  if exists (
    select 1 from public.tracker_definitions where stable_key = 'smoking_free' and active
  ) then
    raise exception 'smoking_free tracker_definitions seed must remain inactive';
  end if;

  if (select count(*) from public.tracker_definitions where active) < 11 then
    raise exception 'expected active tracker_definitions seed data to exist';
  end if;

  if not exists (
    select 1 from public.supplement_definitions where stable_key = 'protein_powder' and active
  ) then
    raise exception 'expected curated supplement_definitions seed row protein_powder to exist and be active';
  end if;

  if (select count(*) from public.supplement_definitions where active and system_owned) < 8 then
    raise exception 'expected supplement_definitions wellness seed data to exist';
  end if;
end $$;

do $$
declare
  user_one uuid := '98000000-0000-0000-0000-000000000001';
  user_two uuid := '98000000-0000-0000-0000-000000000002';
  hydration_definition uuid;
  protein_definition uuid;
  user_tracker_one uuid := '98000001-0000-0000-0000-000000000001';
  user_tracker_two uuid := '98000001-0000-0000-0000-000000000002';
  tracker_target_one uuid := '98000002-0000-0000-0000-000000000001';
  tracker_target_two uuid := '98000002-0000-0000-0000-000000000002';
  tracker_event_one uuid := '98000003-0000-0000-0000-000000000001';
  tracker_event_one_deleted uuid := '98000003-0000-0000-0000-000000000002';
  tracker_event_two uuid := '98000003-0000-0000-0000-000000000003';
  tracker_summary_one uuid := '98000004-0000-0000-0000-000000000001';
  tracker_summary_two uuid := '98000004-0000-0000-0000-000000000002';
  hydration_one uuid := '98000005-0000-0000-0000-000000000001';
  hydration_one_deleted uuid := '98000005-0000-0000-0000-000000000002';
  hydration_two uuid := '98000005-0000-0000-0000-000000000003';
  meditation_one uuid := '98000006-0000-0000-0000-000000000001';
  meditation_one_deleted uuid := '98000006-0000-0000-0000-000000000002';
  meditation_two uuid := '98000006-0000-0000-0000-000000000003';
  sleep_one uuid := '98000007-0000-0000-0000-000000000001';
  sleep_one_deleted uuid := '98000007-0000-0000-0000-000000000002';
  sleep_two uuid := '98000007-0000-0000-0000-000000000003';
  user_supplement_one uuid := '98000008-0000-0000-0000-000000000001';
  user_supplement_two uuid := '98000008-0000-0000-0000-000000000002';
  supplement_intake_one uuid := '98000009-0000-0000-0000-000000000001';
  supplement_intake_one_deleted uuid := '98000009-0000-0000-0000-000000000002';
  supplement_intake_two uuid := '98000009-0000-0000-0000-000000000003';
  tracker_reminder_one uuid := '98000010-0000-0000-0000-000000000001';
  tracker_reminder_two uuid := '98000010-0000-0000-0000-000000000002';
  tracker_streak_one uuid := '98000011-0000-0000-0000-000000000001';
  tracker_streak_two uuid := '98000011-0000-0000-0000-000000000002';
  profile_prefs_one uuid := '98000012-0000-0000-0000-000000000001';
  profile_prefs_two uuid := '98000012-0000-0000-0000-000000000002';
  daily_overview_one uuid := '98000013-0000-0000-0000-000000000001';
  daily_overview_two uuid := '98000013-0000-0000-0000-000000000002';
  daily_record_one uuid := '98000014-0000-0000-0000-000000000001';
  daily_record_two uuid := '98000014-0000-0000-0000-000000000002';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment9-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment9-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.profiles (id) values (user_one), (user_two)
  on conflict (id) do nothing;

  select id into hydration_definition
  from public.tracker_definitions where stable_key = 'hydration';

  select id into protein_definition
  from public.supplement_definitions where stable_key = 'protein_powder';

  insert into public.daily_records (id, user_id, local_date)
  values
    (daily_record_one, user_one, date '2026-08-01'),
    (daily_record_two, user_two, date '2026-08-01')
  on conflict (id) do nothing;

  insert into public.user_trackers (
    id, user_id, tracker_definition_id, enabled, unit, display_order
  )
  values
    (user_tracker_one, user_one, hydration_definition, true, 'ml', 0),
    (user_tracker_two, user_two, hydration_definition, true, 'ml', 0)
  on conflict (id) do nothing;

  insert into public.tracker_targets (
    id, user_tracker_id, effective_from, target_value, target_unit, target_frequency
  )
  values
    (tracker_target_one, user_tracker_one, date '2026-08-01', 2500, 'ml', 'daily'),
    (tracker_target_two, user_tracker_two, date '2026-08-01', 2000, 'ml', 'daily')
  on conflict (id) do nothing;

  insert into public.tracker_events (
    id, user_id, user_tracker_id, daily_record_id, local_date, occurred_at,
    value_numeric, unit, note
  )
  values
    (
      tracker_event_one, user_one, user_tracker_one, daily_record_one, date '2026-08-01',
      timezone('utc', now()), 500, 'ml', 'Morning glass'
    ),
    (
      tracker_event_one_deleted, user_one, user_tracker_one, daily_record_one, date '2026-07-30',
      timezone('utc', now()), 250, 'ml', null
    ),
    (
      tracker_event_two, user_two, user_tracker_two, daily_record_two, date '2026-08-01',
      timezone('utc', now()), 300, 'ml', null
    )
  on conflict (id) do nothing;

  update public.tracker_events
  set deleted_at = timezone('utc', now())
  where id = tracker_event_one_deleted;

  insert into public.tracker_daily_summaries (
    id, user_id, user_tracker_id, local_date, total_numeric, event_count
  )
  values
    (tracker_summary_one, user_one, user_tracker_one, date '2026-08-01', 500, 1),
    (tracker_summary_two, user_two, user_tracker_two, date '2026-08-01', 300, 1)
  on conflict (id) do nothing;

  insert into public.hydration_entries (
    id, user_id, daily_record_id, local_date, occurred_at, amount_ml, vessel_label
  )
  values
    (hydration_one, user_one, daily_record_one, date '2026-08-01', timezone('utc', now()), 500, 'Glass'),
    (hydration_one_deleted, user_one, daily_record_one, date '2026-07-30', timezone('utc', now()), 250, null),
    (hydration_two, user_two, daily_record_two, date '2026-08-01', timezone('utc', now()), 300, null)
  on conflict (id) do nothing;

  update public.hydration_entries
  set deleted_at = timezone('utc', now())
  where id = hydration_one_deleted;

  insert into public.meditation_sessions (
    id, user_id, daily_record_id, local_date, started_at, duration_seconds, meditation_type, completed
  )
  values
    (
      meditation_one, user_one, daily_record_one, date '2026-08-01',
      timezone('utc', now()) - interval '10 minutes', 600, 'mindfulness', true
    ),
    (
      meditation_one_deleted, user_one, daily_record_one, date '2026-07-30',
      timezone('utc', now()) - interval '5 minutes', 300, 'breathing', true
    ),
    (
      meditation_two, user_two, daily_record_two, date '2026-08-01',
      timezone('utc', now()) - interval '8 minutes', 480, 'guided', true
    )
  on conflict (id) do nothing;

  update public.meditation_sessions
  set deleted_at = timezone('utc', now())
  where id = meditation_one_deleted;

  insert into public.sleep_sessions (
    id, user_id, sleep_date, bedtime_at, wake_at, duration_seconds, quality, nap
  )
  values
    (
      sleep_one, user_one, date '2026-08-01',
      timestamptz '2026-08-01 22:30:00+00', timestamptz '2026-08-02 06:30:00+00',
      28800, 'good', false
    ),
    (
      sleep_one_deleted, user_one, date '2026-07-30',
      timestamptz '2026-07-30 23:00:00+00', timestamptz '2026-07-31 07:00:00+00',
      28800, 'fair', false
    ),
    (
      sleep_two, user_two, date '2026-08-01',
      timestamptz '2026-08-01 23:00:00+00', timestamptz '2026-08-02 07:00:00+00',
      28800, 'good', false
    )
  on conflict (id) do nothing;

  update public.sleep_sessions
  set deleted_at = timezone('utc', now())
  where id = sleep_one_deleted;

  insert into public.user_supplements (
    id, user_id, supplement_definition_id, serving_amount, serving_unit, active
  )
  values
    (user_supplement_one, user_one, protein_definition, 30, 'g', true),
    (user_supplement_two, user_two, protein_definition, 25, 'g', true)
  on conflict (id) do nothing;

  insert into public.supplement_intakes (
    id, user_id, user_supplement_id, daily_record_id, local_date, taken_at, amount, unit, status
  )
  values
    (
      supplement_intake_one, user_one, user_supplement_one, daily_record_one,
      date '2026-08-01', timezone('utc', now()), 30, 'g', 'taken'
    ),
    (
      supplement_intake_one_deleted, user_one, user_supplement_one, daily_record_one,
      date '2026-07-30', timezone('utc', now()), 30, 'g', 'taken'
    ),
    (
      supplement_intake_two, user_two, user_supplement_two, daily_record_two,
      date '2026-08-01', timezone('utc', now()), 25, 'g', 'taken'
    )
  on conflict (id) do nothing;

  update public.supplement_intakes
  set deleted_at = timezone('utc', now())
  where id = supplement_intake_one_deleted;

  insert into public.tracker_reminders (
    id, user_id, user_tracker_id, local_time, timezone, days_of_week, reminder_type
  )
  values
    (
      tracker_reminder_one, user_one, user_tracker_one, time '09:00', 'UTC',
      array[1, 2, 3, 4, 5], 'tracker'
    ),
    (
      tracker_reminder_two, user_two, user_tracker_two, time '10:00', 'UTC',
      array[1, 2, 3, 4, 5], 'tracker'
    )
  on conflict (id) do nothing;

  insert into public.tracker_streaks (
    id, user_id, user_tracker_id, current_streak, longest_streak, last_completed_date
  )
  values
    (tracker_streak_one, user_one, user_tracker_one, 3, 7, date '2026-07-31'),
    (tracker_streak_two, user_two, user_tracker_two, 1, 5, date '2026-07-31')
  on conflict (id) do nothing;

  insert into public.profile_preferences (id, user_id, preferred_name, volume_unit)
  values
    (profile_prefs_one, user_one, 'Alex', 'ml'),
    (profile_prefs_two, user_two, 'Jordan', 'ml')
  on conflict (id) do nothing;

  insert into public.daily_overview_preferences (
    id, user_id, visible_sections, summary_order
  )
  values
    (daily_overview_one, user_one, '["hydration","meditation"]'::jsonb, '["hydration"]'::jsonb),
    (daily_overview_two, user_two, '["sleep"]'::jsonb, '["sleep"]'::jsonb)
  on conflict (id) do nothing;

  -- sleep_sessions CHECK: wake_at must be after bedtime_at
  begin
    insert into public.sleep_sessions (
      user_id, sleep_date, bedtime_at, wake_at, duration_seconds
    )
    values (
      user_one, date '2026-08-02',
      timestamptz '2026-08-02 07:00:00+00', timestamptz '2026-08-02 06:00:00+00', 0
    );
    raise exception 'sleep_sessions accepted wake_at before bedtime_at';
  exception
    when check_violation then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', true);

do $$
declare
  changed_rows integer;
  user_one uuid := '98000000-0000-0000-0000-000000000001';
  user_two uuid := '98000000-0000-0000-0000-000000000002';
  hydration_definition uuid;
  protein_definition uuid;
  user_tracker_one uuid := '98000001-0000-0000-0000-000000000001';
  user_tracker_two uuid := '98000001-0000-0000-0000-000000000002';
  tracker_target_one uuid := '98000002-0000-0000-0000-000000000001';
  tracker_target_two uuid := '98000002-0000-0000-0000-000000000002';
  tracker_event_one uuid := '98000003-0000-0000-0000-000000000001';
  tracker_event_one_deleted uuid := '98000003-0000-0000-0000-000000000002';
  tracker_event_two uuid := '98000003-0000-0000-0000-000000000003';
  tracker_summary_one uuid := '98000004-0000-0000-0000-000000000001';
  tracker_summary_two uuid := '98000004-0000-0000-0000-000000000002';
  hydration_one uuid := '98000005-0000-0000-0000-000000000001';
  hydration_one_deleted uuid := '98000005-0000-0000-0000-000000000002';
  hydration_two uuid := '98000005-0000-0000-0000-000000000003';
  meditation_one uuid := '98000006-0000-0000-0000-000000000001';
  meditation_one_deleted uuid := '98000006-0000-0000-0000-000000000002';
  meditation_two uuid := '98000006-0000-0000-0000-000000000003';
  sleep_one uuid := '98000007-0000-0000-0000-000000000001';
  sleep_one_deleted uuid := '98000007-0000-0000-0000-000000000002';
  sleep_two uuid := '98000007-0000-0000-0000-000000000003';
  user_supplement_one uuid := '98000008-0000-0000-0000-000000000001';
  user_supplement_two uuid := '98000008-0000-0000-0000-000000000002';
  supplement_intake_one uuid := '98000009-0000-0000-0000-000000000001';
  supplement_intake_one_deleted uuid := '98000009-0000-0000-0000-000000000002';
  supplement_intake_two uuid := '98000009-0000-0000-0000-000000000003';
  tracker_reminder_one uuid := '98000010-0000-0000-0000-000000000001';
  tracker_reminder_two uuid := '98000010-0000-0000-0000-000000000002';
  tracker_streak_one uuid := '98000011-0000-0000-0000-000000000001';
  tracker_streak_two uuid := '98000011-0000-0000-0000-000000000002';
  profile_prefs_one uuid := '98000012-0000-0000-0000-000000000001';
  profile_prefs_two uuid := '98000012-0000-0000-0000-000000000002';
  daily_overview_one uuid := '98000013-0000-0000-0000-000000000001';
  daily_overview_two uuid := '98000013-0000-0000-0000-000000000002';
  summary_event_count integer;
begin
  select id into hydration_definition
  from public.tracker_definitions where stable_key = 'hydration';

  select id into protein_definition
  from public.supplement_definitions where stable_key = 'protein_powder';

  -- tracker_definitions: readable active rows only.
  if not exists (select 1 from public.tracker_definitions where id = hydration_definition) then
    raise exception 'authenticated user cannot read an active tracker_definitions row';
  end if;

  if exists (select 1 from public.tracker_definitions where stable_key = 'smoking_free') then
    raise exception 'inactive tracker_definitions row is visible to authenticated user';
  end if;

  begin
    insert into public.tracker_definitions (stable_key, display_name, tracker_type, value_type)
    values ('increment9-hack', 'Hack', 'custom', 'text');
    raise exception 'authenticated user inserted a system tracker_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.tracker_definitions set active = false where id = hydration_definition;
    raise exception 'authenticated user updated a system tracker_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.tracker_definitions where id = hydration_definition;
    raise exception 'authenticated user deleted a system tracker_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  -- supplement_definitions: readable active rows only.
  if not exists (select 1 from public.supplement_definitions where id = protein_definition) then
    raise exception 'authenticated user cannot read an active supplement_definitions row';
  end if;

  begin
    insert into public.supplement_definitions (display_name, form)
    values ('Hack pill', 'tablet');
    raise exception 'authenticated user inserted a system supplement_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.supplement_definitions set active = false where id = protein_definition;
    raise exception 'authenticated user updated a system supplement_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.supplement_definitions where id = protein_definition;
    raise exception 'authenticated user deleted a system supplement_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  -- user_trackers: owner-only isolation.
  if not exists (select 1 from public.user_trackers where id = user_tracker_one) then
    raise exception 'owner cannot read their own user_trackers row';
  end if;
  if exists (select 1 from public.user_trackers where id = user_tracker_two) then
    raise exception 'authenticated user can read another user''s user_trackers row';
  end if;

  begin
    insert into public.user_trackers (user_id, tracker_definition_id, unit)
    values (user_two, hydration_definition, 'ml');
    raise exception 'authenticated user inserted a user_trackers row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- tracker_targets: ownership via parent user_tracker.
  if not exists (select 1 from public.tracker_targets where id = tracker_target_one) then
    raise exception 'owner cannot read their own tracker_targets row via user_tracker ownership';
  end if;
  if exists (select 1 from public.tracker_targets where id = tracker_target_two) then
    raise exception 'authenticated user can read another user''s tracker_targets row';
  end if;

  begin
    insert into public.tracker_targets (user_tracker_id, effective_from, target_value, target_unit)
    values (user_tracker_two, date '2026-08-02', 2000, 'ml');
    raise exception 'authenticated user inserted a tracker_targets row under another user''s tracker';
  exception
    when insufficient_privilege then null;
  end;

  -- tracker_events: owner-only + soft-delete filtering.
  if not exists (select 1 from public.tracker_events where id = tracker_event_one) then
    raise exception 'owner cannot read their own active tracker_events row';
  end if;
  if exists (select 1 from public.tracker_events where id = tracker_event_one_deleted) then
    raise exception 'soft-deleted tracker_events row is still selectable by its owner';
  end if;
  if exists (select 1 from public.tracker_events where id = tracker_event_two) then
    raise exception 'authenticated user can read another user''s tracker_events row';
  end if;

  update public.tracker_events set note = 'Updated note' where id = tracker_event_one;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'owner could not update their own active tracker_events row';
  end if;

  update public.tracker_events set note = 'tampered' where id = tracker_event_two;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'authenticated user updated another user''s tracker_events row';
  end if;

  begin
    insert into public.tracker_events (
      user_id, user_tracker_id, local_date, value_numeric, unit
    )
    values (user_two, user_tracker_two, date '2026-08-02', 100, 'ml');
    raise exception 'authenticated user inserted a tracker_events row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- tracker_daily_summaries: owner-only isolation.
  if not exists (select 1 from public.tracker_daily_summaries where id = tracker_summary_one) then
    raise exception 'owner cannot read their own tracker_daily_summaries row';
  end if;
  if exists (select 1 from public.tracker_daily_summaries where id = tracker_summary_two) then
    raise exception 'authenticated user can read another user''s tracker_daily_summaries row';
  end if;

  begin
    insert into public.tracker_daily_summaries (
      user_id, user_tracker_id, local_date, event_count
    )
    values (user_two, user_tracker_two, date '2026-08-02', 0);
    raise exception 'authenticated user inserted a tracker_daily_summaries row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- recalculate_tracker_daily_summary: owner can refresh own tracker cache.
  perform public.recalculate_tracker_daily_summary(user_tracker_one, date '2026-08-01');
  select event_count into summary_event_count
  from public.tracker_daily_summaries
  where user_tracker_id = user_tracker_one and local_date = date '2026-08-01';
  if summary_event_count <> 1 then
    raise exception 'recalculate_tracker_daily_summary did not aggregate owner tracker_events';
  end if;

  -- hydration_entries: owner-only + soft-delete filtering.
  if not exists (select 1 from public.hydration_entries where id = hydration_one) then
    raise exception 'owner cannot read their own active hydration_entries row';
  end if;
  if exists (select 1 from public.hydration_entries where id = hydration_one_deleted) then
    raise exception 'soft-deleted hydration_entries row is still selectable by its owner';
  end if;
  if exists (select 1 from public.hydration_entries where id = hydration_two) then
    raise exception 'authenticated user can read another user''s hydration_entries row';
  end if;

  begin
    insert into public.hydration_entries (user_id, local_date, amount_ml)
    values (user_two, date '2026-08-02', 250);
    raise exception 'authenticated user inserted a hydration_entries row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- meditation_sessions: owner-only + soft-delete filtering.
  if not exists (select 1 from public.meditation_sessions where id = meditation_one) then
    raise exception 'owner cannot read their own active meditation_sessions row';
  end if;
  if exists (select 1 from public.meditation_sessions where id = meditation_one_deleted) then
    raise exception 'soft-deleted meditation_sessions row is still selectable by its owner';
  end if;
  if exists (select 1 from public.meditation_sessions where id = meditation_two) then
    raise exception 'authenticated user can read another user''s meditation_sessions row';
  end if;

  begin
    insert into public.meditation_sessions (user_id, local_date, duration_seconds)
    values (user_two, date '2026-08-02', 600);
    raise exception 'authenticated user inserted a meditation_sessions row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- sleep_sessions: owner-only + soft-delete filtering.
  if not exists (select 1 from public.sleep_sessions where id = sleep_one) then
    raise exception 'owner cannot read their own active sleep_sessions row';
  end if;
  if exists (select 1 from public.sleep_sessions where id = sleep_one_deleted) then
    raise exception 'soft-deleted sleep_sessions row is still selectable by its owner';
  end if;
  if exists (select 1 from public.sleep_sessions where id = sleep_two) then
    raise exception 'authenticated user can read another user''s sleep_sessions row';
  end if;

  begin
    insert into public.sleep_sessions (
      user_id, sleep_date, bedtime_at, wake_at, duration_seconds
    )
    values (
      user_two, date '2026-08-02',
      timestamptz '2026-08-02 22:00:00+00', timestamptz '2026-08-03 06:00:00+00', 28800
    );
    raise exception 'authenticated user inserted a sleep_sessions row for another user';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.sleep_sessions (
      user_id, sleep_date, bedtime_at, wake_at, duration_seconds
    )
    values (
      user_one, date '2026-08-03',
      timestamptz '2026-08-03 07:00:00+00', timestamptz '2026-08-03 06:00:00+00', 0
    );
    raise exception 'authenticated user inserted sleep_sessions with wake_at before bedtime_at';
  exception
    when check_violation then null;
  end;

  -- user_supplements: owner-only isolation.
  if not exists (select 1 from public.user_supplements where id = user_supplement_one) then
    raise exception 'owner cannot read their own user_supplements row';
  end if;
  if exists (select 1 from public.user_supplements where id = user_supplement_two) then
    raise exception 'authenticated user can read another user''s user_supplements row';
  end if;

  begin
    insert into public.user_supplements (user_id, supplement_definition_id)
    values (user_two, protein_definition);
    raise exception 'authenticated user inserted a user_supplements row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- supplement_intakes: owner-only + soft-delete filtering.
  if not exists (select 1 from public.supplement_intakes where id = supplement_intake_one) then
    raise exception 'owner cannot read their own active supplement_intakes row';
  end if;
  if exists (select 1 from public.supplement_intakes where id = supplement_intake_one_deleted) then
    raise exception 'soft-deleted supplement_intakes row is still selectable by its owner';
  end if;
  if exists (select 1 from public.supplement_intakes where id = supplement_intake_two) then
    raise exception 'authenticated user can read another user''s supplement_intakes row';
  end if;

  begin
    insert into public.supplement_intakes (
      user_id, user_supplement_id, local_date, status
    )
    values (user_two, user_supplement_two, date '2026-08-02', 'taken');
    raise exception 'authenticated user inserted a supplement_intakes row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- tracker_reminders: owner-only isolation.
  if not exists (select 1 from public.tracker_reminders where id = tracker_reminder_one) then
    raise exception 'owner cannot read their own tracker_reminders row';
  end if;
  if exists (select 1 from public.tracker_reminders where id = tracker_reminder_two) then
    raise exception 'authenticated user can read another user''s tracker_reminders row';
  end if;

  begin
    insert into public.tracker_reminders (
      user_id, user_tracker_id, local_time, reminder_type
    )
    values (user_two, user_tracker_two, time '08:00', 'tracker');
    raise exception 'authenticated user inserted a tracker_reminders row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- tracker_streaks: owner-only isolation.
  if not exists (select 1 from public.tracker_streaks where id = tracker_streak_one) then
    raise exception 'owner cannot read their own tracker_streaks row';
  end if;
  if exists (select 1 from public.tracker_streaks where id = tracker_streak_two) then
    raise exception 'authenticated user can read another user''s tracker_streaks row';
  end if;

  begin
    insert into public.tracker_streaks (user_id, user_tracker_id)
    values (user_two, user_tracker_two);
    raise exception 'authenticated user inserted a tracker_streaks row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- profile_preferences: owner-only isolation.
  if not exists (select 1 from public.profile_preferences where id = profile_prefs_one) then
    raise exception 'owner cannot read their own profile_preferences row';
  end if;
  if exists (select 1 from public.profile_preferences where id = profile_prefs_two) then
    raise exception 'authenticated user can read another user''s profile_preferences row';
  end if;

  begin
    insert into public.profile_preferences (user_id)
    values (user_two);
    raise exception 'authenticated user inserted profile_preferences for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- daily_overview_preferences: owner-only isolation.
  if not exists (select 1 from public.daily_overview_preferences where id = daily_overview_one) then
    raise exception 'owner cannot read their own daily_overview_preferences row';
  end if;
  if exists (select 1 from public.daily_overview_preferences where id = daily_overview_two) then
    raise exception 'authenticated user can read another user''s daily_overview_preferences row';
  end if;

  begin
    insert into public.daily_overview_preferences (user_id)
    values (user_two);
    raise exception 'authenticated user inserted daily_overview_preferences for another user';
  exception
    when insufficient_privilege then null;
  end;
end $$;

rollback;
