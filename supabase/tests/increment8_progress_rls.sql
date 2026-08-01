-- Increment 8 progress tracking RLS checks.
-- Run after migrations, for example:
--   Get-Content supabase/tests/increment8_progress_rls.sql -Raw |
--     docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
-- The transaction rolls back all fixture rows. A failing assertion raises an exception.
-- Assumes migrations 20260801120000_increment8_progress_tracking.sql and
-- 20260801120100_increment8_measurement_catalog_seed.sql have been applied.

begin;

do $$
begin
  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'measurement_definitions', 'user_measurement_definitions', 'body_weight_entries',
        'body_measurement_entries', 'body_measurement_values', 'progress_photo_sets',
        'progress_photos', 'progress_comparisons', 'progress_notes', 'progress_summary_preferences'
      ])
      and c.relrowsecurity
  ) <> 10 then
    raise exception 'every Increment 8 progress-tracking table must have RLS enabled';
  end if;

  if not exists (
    select 1 from public.measurement_definitions where stable_key = 'waist' and active
  ) then
    raise exception 'expected curated measurement_definitions seed row waist to exist and be active';
  end if;

  if not exists (
    select 1 from public.measurement_definitions
    where stable_key = 'body_fat_manual'
      and active
      and display_name ilike '%manual entry%'
  ) then
    raise exception 'body_fat_manual seed must be labeled as manual entry only';
  end if;

  if (select count(*) from public.measurement_definitions where active) < 13 then
    raise exception 'expected measurement_definitions seed data to exist';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'progress_photos_storage_%'
  ) < 4 then
    raise exception 'expected select/insert/update/delete policies on the progress-photos storage bucket';
  end if;

  if not exists (
    select 1 from storage.buckets where id = 'progress-photos' and public = false
  ) then
    raise exception 'progress-photos storage bucket must exist and be private';
  end if;
end $$;

do $$
declare
  user_one uuid := '97000000-0000-0000-0000-000000000001';
  user_two uuid := '97000000-0000-0000-0000-000000000002';
  waist_definition uuid;
  user_measurement_one uuid := '97000002-0000-0000-0000-000000000001';
  user_measurement_two uuid := '97000002-0000-0000-0000-000000000002';
  weight_one uuid := '97000003-0000-0000-0000-000000000001';
  weight_one_deleted uuid := '97000003-0000-0000-0000-000000000002';
  weight_two uuid := '97000003-0000-0000-0000-000000000003';
  measurement_entry_one uuid := '97000004-0000-0000-0000-000000000001';
  measurement_entry_two uuid := '97000004-0000-0000-0000-000000000002';
  measurement_value_one uuid := '97000005-0000-0000-0000-000000000001';
  photo_set_one uuid := '97000006-0000-0000-0000-000000000001';
  photo_set_one_deleted uuid := '97000006-0000-0000-0000-000000000002';
  photo_set_two uuid := '97000006-0000-0000-0000-000000000003';
  photo_one uuid := '97000007-0000-0000-0000-000000000001';
  photo_two uuid := '97000007-0000-0000-0000-000000000002';
  comparison_one uuid := '97000008-0000-0000-0000-000000000001';
  comparison_two uuid := '97000008-0000-0000-0000-000000000002';
  note_one uuid := '97000009-0000-0000-0000-000000000001';
  note_two uuid := '97000009-0000-0000-0000-000000000002';
  preferences_one uuid := '97000010-0000-0000-0000-000000000001';
  preferences_two uuid := '97000010-0000-0000-0000-000000000002';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment8-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment8-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.profiles (id) values (user_one), (user_two)
  on conflict (id) do nothing;

  select id into waist_definition from public.measurement_definitions where stable_key = 'waist';

  insert into public.user_measurement_definitions (
    id, user_id, measurement_definition_id, unit, side_mode, enabled, display_order
  )
  values
    (user_measurement_one, user_one, waist_definition, 'cm', 'single_value', true, 0),
    (user_measurement_two, user_two, waist_definition, 'cm', 'single_value', true, 0)
  on conflict (id) do nothing;

  insert into public.body_weight_entries (
    id, user_id, local_date, recorded_at, timezone, weight_value, weight_unit, normalized_kg, note
  )
  values
    (weight_one, user_one, date '2026-08-01', timezone('utc', now()), 'UTC', 72.5, 'kg', 72.5, 'Morning'),
    (weight_one_deleted, user_one, date '2026-07-30', timezone('utc', now()), 'UTC', 73.0, 'kg', 73.0, null),
    (weight_two, user_two, date '2026-08-01', timezone('utc', now()), 'UTC', 68.0, 'kg', 68.0, null)
  on conflict (id) do nothing;

  update public.body_weight_entries
  set deleted_at = timezone('utc', now())
  where id = weight_one_deleted;

  insert into public.body_measurement_entries (
    id, user_id, local_date, recorded_at, timezone, title, note
  )
  values
    (measurement_entry_one, user_one, date '2026-08-01', timezone('utc', now()), 'UTC', 'August check-in', null),
    (measurement_entry_two, user_two, date '2026-08-01', timezone('utc', now()), 'UTC', 'August check-in', null)
  on conflict (id) do nothing;

  insert into public.body_measurement_values (
    id, body_measurement_entry_id, user_measurement_definition_id, side, value, unit, normalized_value
  )
  values (measurement_value_one, measurement_entry_one, user_measurement_one, 'not_applicable', 82.0, 'cm', 82.0)
  on conflict (id) do nothing;

  insert into public.progress_photo_sets (
    id, user_id, local_date, captured_at, timezone, title, retained
  )
  values
    (photo_set_one, user_one, date '2026-08-01', timezone('utc', now()), 'UTC', 'August set', true),
    (photo_set_one_deleted, user_one, date '2026-07-15', timezone('utc', now()), 'UTC', 'Old set', true),
    (photo_set_two, user_two, date '2026-08-01', timezone('utc', now()), 'UTC', 'August set', true)
  on conflict (id) do nothing;

  update public.progress_photo_sets
  set deleted_at = timezone('utc', now())
  where id = photo_set_one_deleted;

  insert into public.progress_photos (
    id, progress_photo_set_id, slot, private_storage_path, mime_type, width, height,
    file_size_bytes, checksum, processed, captured_at
  )
  values
    (
      photo_one, photo_set_one, 'front',
      user_one::text || '/progress/' || photo_set_one::text || '/front-' || photo_one::text || '.jpg',
      'image/jpeg', 1080, 1920, 512000, 'checksum-one-front', true, timezone('utc', now())
    ),
    (
      photo_two, photo_set_two, 'front',
      user_two::text || '/progress/' || photo_set_two::text || '/front-' || photo_two::text || '.jpg',
      'image/jpeg', 1080, 1920, 512000, 'checksum-two-front', true, timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.progress_comparisons (
    id, user_id, comparison_type, left_photo_set_id, right_photo_set_id, left_date, right_date, title
  )
  values
    (
      comparison_one, user_one, 'photo', photo_set_one, photo_set_one,
      date '2026-07-01', date '2026-08-01', 'August front compare'
    ),
    (
      comparison_two, user_two, 'weight', null, null,
      date '2026-07-01', date '2026-08-01', 'Weight compare'
    )
  on conflict (id) do nothing;

  insert into public.progress_notes (id, user_id, local_date, note_type, value_text)
  values
    (note_one, user_one, date '2026-08-01', 'milestone', 'First August check-in'),
    (note_two, user_two, date '2026-08-01', 'general', 'Private note')
  on conflict (id) do nothing;

  insert into public.progress_summary_preferences (
    id, user_id, default_date_range, show_weight, show_measurements, show_photos,
    selected_measurement_keys
  )
  values
    (preferences_one, user_one, '30d', true, true, true, array['waist']),
    (preferences_two, user_two, '90d', true, true, false, array['waist'])
  on conflict (id) do nothing;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);

do $$
declare
  changed_rows integer;
  user_one uuid := '97000000-0000-0000-0000-000000000001';
  user_two uuid := '97000000-0000-0000-0000-000000000002';
  waist_definition uuid;
  user_measurement_one uuid := '97000002-0000-0000-0000-000000000001';
  user_measurement_two uuid := '97000002-0000-0000-0000-000000000002';
  weight_one uuid := '97000003-0000-0000-0000-000000000001';
  weight_one_deleted uuid := '97000003-0000-0000-0000-000000000002';
  weight_two uuid := '97000003-0000-0000-0000-000000000003';
  measurement_entry_one uuid := '97000004-0000-0000-0000-000000000001';
  measurement_entry_two uuid := '97000004-0000-0000-0000-000000000002';
  measurement_value_one uuid := '97000005-0000-0000-0000-000000000001';
  photo_set_one uuid := '97000006-0000-0000-0000-000000000001';
  photo_set_one_deleted uuid := '97000006-0000-0000-0000-000000000002';
  photo_set_two uuid := '97000006-0000-0000-0000-000000000003';
  photo_one uuid := '97000007-0000-0000-0000-000000000001';
  photo_two uuid := '97000007-0000-0000-0000-000000000002';
  comparison_one uuid := '97000008-0000-0000-0000-000000000001';
  comparison_two uuid := '97000008-0000-0000-0000-000000000002';
  note_one uuid := '97000009-0000-0000-0000-000000000001';
  note_two uuid := '97000009-0000-0000-0000-000000000002';
  preferences_one uuid := '97000010-0000-0000-0000-000000000001';
  preferences_two uuid := '97000010-0000-0000-0000-000000000002';
begin
  select id into waist_definition from public.measurement_definitions where stable_key = 'waist';

  -- System catalog: readable by authenticated user, active only.
  if not exists (select 1 from public.measurement_definitions where id = waist_definition) then
    raise exception 'authenticated user cannot read an active system measurement_definitions row';
  end if;

  -- System catalog: writes denied (no grant, no policy).
  begin
    insert into public.measurement_definitions (stable_key, display_name, category, default_unit)
    values ('increment8-hack', 'Hack', 'custom', 'cm');
    raise exception 'authenticated user inserted a system measurement_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.measurement_definitions set active = false where id = waist_definition;
    raise exception 'authenticated user updated a system measurement_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.measurement_definitions where id = waist_definition;
    raise exception 'authenticated user deleted a system measurement_definitions row';
  exception
    when insufficient_privilege then null;
  end;

  -- user_measurement_definitions: owner-only isolation.
  if not exists (select 1 from public.user_measurement_definitions where id = user_measurement_one) then
    raise exception 'owner cannot read their own user_measurement_definitions row';
  end if;
  if exists (select 1 from public.user_measurement_definitions where id = user_measurement_two) then
    raise exception 'authenticated user can read another user''s user_measurement_definitions row';
  end if;

  begin
    insert into public.user_measurement_definitions (user_id, measurement_definition_id, unit)
    values (user_two, waist_definition, 'cm');
    raise exception 'authenticated user inserted a user_measurement_definitions row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- body_weight_entries: owner-only + soft-delete filtering.
  if not exists (select 1 from public.body_weight_entries where id = weight_one) then
    raise exception 'owner cannot read their own active body_weight_entries row';
  end if;
  if exists (select 1 from public.body_weight_entries where id = weight_one_deleted) then
    raise exception 'soft-deleted body_weight_entries row is still selectable by its owner';
  end if;
  if exists (select 1 from public.body_weight_entries where id = weight_two) then
    raise exception 'authenticated user can read another user''s body_weight_entries row';
  end if;

  update public.body_weight_entries set note = 'Updated morning note' where id = weight_one;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'owner could not update their own active body_weight_entries row';
  end if;

  update public.body_weight_entries set note = 'tampered' where id = weight_two;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'authenticated user updated another user''s body_weight_entries row';
  end if;

  begin
    insert into public.body_weight_entries (
      user_id, local_date, weight_value, weight_unit, normalized_kg
    )
    values (user_two, date '2026-08-02', 70.0, 'kg', 70.0);
    raise exception 'authenticated user inserted a body_weight_entries row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- body_measurement_entries: owner-only isolation.
  if not exists (select 1 from public.body_measurement_entries where id = measurement_entry_one) then
    raise exception 'owner cannot read their own body_measurement_entries row';
  end if;
  if exists (select 1 from public.body_measurement_entries where id = measurement_entry_two) then
    raise exception 'authenticated user can read another user''s body_measurement_entries row';
  end if;

  begin
    insert into public.body_measurement_entries (user_id, local_date)
    values (user_two, date '2026-08-02');
    raise exception 'authenticated user inserted a body_measurement_entries row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- body_measurement_values: ownership through parent entry.
  if not exists (select 1 from public.body_measurement_values where id = measurement_value_one) then
    raise exception 'owner cannot read their own body_measurement_values row via parent entry';
  end if;

  begin
    insert into public.body_measurement_values (
      body_measurement_entry_id, user_measurement_definition_id, side, value, unit, normalized_value
    )
    values (measurement_entry_two, user_measurement_two, 'not_applicable', 80.0, 'cm', 80.0);
    raise exception 'authenticated user inserted a body_measurement_values row under another user''s entry';
  exception
    when insufficient_privilege then null;
  end;

  -- progress_photo_sets: owner-only + soft-delete filtering.
  if not exists (select 1 from public.progress_photo_sets where id = photo_set_one) then
    raise exception 'owner cannot read their own active progress_photo_sets row';
  end if;
  if exists (select 1 from public.progress_photo_sets where id = photo_set_one_deleted) then
    raise exception 'soft-deleted progress_photo_sets row is still selectable by its owner';
  end if;
  if exists (select 1 from public.progress_photo_sets where id = photo_set_two) then
    raise exception 'authenticated user can read another user''s progress_photo_sets row';
  end if;

  begin
    insert into public.progress_photo_sets (user_id, local_date)
    values (user_two, date '2026-08-02');
    raise exception 'authenticated user inserted a progress_photo_sets row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- progress_photos: ownership through parent photo set.
  if not exists (select 1 from public.progress_photos where id = photo_one) then
    raise exception 'owner cannot read their own progress_photos row via photo set ownership';
  end if;
  if exists (select 1 from public.progress_photos where id = photo_two) then
    raise exception 'authenticated user can read another user''s progress_photos row';
  end if;

  begin
    insert into public.progress_photos (
      progress_photo_set_id, slot, private_storage_path, mime_type, processed
    )
    values (photo_set_two, 'front', 'hijacked/path.jpg', 'image/jpeg', true);
    raise exception 'authenticated user inserted a progress_photos row under another user''s photo set';
  exception
    when insufficient_privilege then null;
  end;

  -- progress_comparisons: owner-only isolation.
  if not exists (select 1 from public.progress_comparisons where id = comparison_one) then
    raise exception 'owner cannot read their own progress_comparisons row';
  end if;
  if exists (select 1 from public.progress_comparisons where id = comparison_two) then
    raise exception 'authenticated user can read another user''s progress_comparisons row';
  end if;

  begin
    insert into public.progress_comparisons (user_id, comparison_type, title)
    values (user_two, 'mixed', 'Hijacked comparison');
    raise exception 'authenticated user inserted a progress_comparisons row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- progress_notes: owner-only isolation.
  if not exists (select 1 from public.progress_notes where id = note_one) then
    raise exception 'owner cannot read their own progress_notes row';
  end if;
  if exists (select 1 from public.progress_notes where id = note_two) then
    raise exception 'authenticated user can read another user''s progress_notes row';
  end if;

  begin
    insert into public.progress_notes (user_id, local_date, note_type, value_text)
    values (user_two, date '2026-08-02', 'general', 'Hijacked note');
    raise exception 'authenticated user inserted a progress_notes row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- progress_summary_preferences: owner-only isolation.
  if not exists (select 1 from public.progress_summary_preferences where id = preferences_one) then
    raise exception 'owner cannot read their own progress_summary_preferences row';
  end if;
  if exists (select 1 from public.progress_summary_preferences where id = preferences_two) then
    raise exception 'authenticated user can read another user''s progress_summary_preferences row';
  end if;

  begin
    insert into public.progress_summary_preferences (user_id)
    values (user_two);
    raise exception 'authenticated user inserted progress_summary_preferences for another user';
  exception
    when insufficient_privilege then null;
  end;
end $$;

rollback;
