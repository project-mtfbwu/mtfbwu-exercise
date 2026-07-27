-- Increment 3 auth/board/daily schema and RLS checks.
-- Run after migrations, for example:
--   Get-Content supabase/tests/increment3_auth_board_rls.sql -Raw |
--     docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
-- The transaction rolls back all fixture rows. A failing assertion raises an exception.

begin;

do $$
begin
  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'profiles', 'module_definitions', 'user_modules', 'dashboard_layouts',
        'dashboard_cards', 'daily_records', 'daily_module_statuses'
      ])
      and c.relrowsecurity
  ) <> 7 then
    raise exception 'every Increment 3 board table must have RLS enabled';
  end if;
end $$;

do $$
declare
  user_one uuid := 'a0000000-0000-0000-0000-000000000001';
  user_two uuid := 'a0000000-0000-0000-0000-000000000002';
  record_one uuid := 'b0000000-0000-0000-0000-000000000001';
  record_two uuid := 'b0000000-0000-0000-0000-000000000002';
  user_module_one uuid;
  user_module_two uuid;
begin
  -- Inserting into auth.users fires handle_new_user() -> ensure_user_board_defaults(),
  -- which creates the profile, all active user_modules, an active dashboard_layout,
  -- and dashboard_cards for that layout -- exercising the real onboarding path.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment3-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment3-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  select um.id into user_module_one
  from public.user_modules um
  join public.module_definitions md on md.id = um.module_definition_id
  where um.user_id = user_one and md.key = 'nutrition'
  limit 1;

  select um.id into user_module_two
  from public.user_modules um
  join public.module_definitions md on md.id = um.module_definition_id
  where um.user_id = user_two and md.key = 'nutrition'
  limit 1;

  if user_module_one is null or user_module_two is null then
    raise exception 'ensure_user_board_defaults did not create expected nutrition user_module rows';
  end if;

  insert into public.daily_records (id, user_id, local_date)
  values
    (record_one, user_one, date '2026-07-27'),
    (record_two, user_two, date '2026-07-27')
  on conflict (id) do nothing;

  insert into public.daily_module_statuses (daily_record_id, user_module_id, status)
  values
    (record_one, user_module_one, 'in_progress'),
    (record_two, user_module_two, 'in_progress')
  on conflict (daily_record_id, user_module_id) do nothing;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);

do $$
declare
  changed_rows integer;
  user_one uuid := 'a0000000-0000-0000-0000-000000000001';
  user_two uuid := 'a0000000-0000-0000-0000-000000000002';
  record_one uuid := 'b0000000-0000-0000-0000-000000000001';
  record_two uuid := 'b0000000-0000-0000-0000-000000000002';
begin
  -- profiles: user can read own profile, cannot read another user's profile
  if not exists (select 1 from public.profiles where id = user_one) then
    raise exception 'authenticated user cannot read own profile';
  end if;

  if exists (select 1 from public.profiles where id = user_two) then
    raise exception 'authenticated user can read another user profile';
  end if;

  -- module_definitions: authenticated can read active modules but never update them
  if not exists (select 1 from public.module_definitions where key = 'nutrition') then
    raise exception 'authenticated user cannot read active module_definitions';
  end if;

  begin
    update public.module_definitions
    set display_name = 'Unauthorized module rename'
    where key = 'nutrition';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 0 then
      raise exception 'authenticated user modified a module_definitions row';
    end if;
  exception
    when insufficient_privilege then null;
  end;

  -- user_modules: cross-user denial
  if not exists (select 1 from public.user_modules where user_id = user_one) then
    raise exception 'authenticated user cannot read own user_modules';
  end if;

  if exists (select 1 from public.user_modules where user_id = user_two) then
    raise exception 'authenticated user can read another user user_modules';
  end if;

  -- dashboard_layouts: cross-user denial
  if not exists (select 1 from public.dashboard_layouts where user_id = user_one) then
    raise exception 'authenticated user cannot read own dashboard_layouts';
  end if;

  if exists (select 1 from public.dashboard_layouts where user_id = user_two) then
    raise exception 'authenticated user can read another user dashboard_layouts';
  end if;

  -- dashboard_cards: only visible via an owned layout
  if not exists (
    select 1
    from public.dashboard_cards dc
    join public.dashboard_layouts dl on dl.id = dc.dashboard_layout_id
    where dl.user_id = user_one
  ) then
    raise exception 'authenticated user cannot read own dashboard_cards';
  end if;

  if exists (
    select 1
    from public.dashboard_cards dc
    join public.dashboard_layouts dl on dl.id = dc.dashboard_layout_id
    where dl.user_id = user_two
  ) then
    raise exception 'authenticated user can read another user dashboard_cards';
  end if;

  -- daily_records: cross-user denial
  if not exists (select 1 from public.daily_records where id = record_one) then
    raise exception 'authenticated user cannot read own daily_records';
  end if;

  if exists (select 1 from public.daily_records where id = record_two) then
    raise exception 'authenticated user can read another user daily_records';
  end if;

  -- daily_module_statuses: only visible via an owned daily_record
  if not exists (
    select 1 from public.daily_module_statuses where daily_record_id = record_one
  ) then
    raise exception 'authenticated user cannot read own daily_module_statuses';
  end if;

  if exists (
    select 1 from public.daily_module_statuses where daily_record_id = record_two
  ) then
    raise exception 'authenticated user can read another user daily_module_statuses';
  end if;
end $$;

rollback;
