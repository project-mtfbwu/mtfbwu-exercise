-- Increment 10 account lifecycle RLS checks.
begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarding_version'
  ) then
    raise exception 'profiles.onboarding_version missing';
  end if;

  if (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('account_deletion_requests', 'account_export_requests')
      and c.relrowsecurity
  ) <> 2 then
    raise exception 'account lifecycle tables must have RLS enabled';
  end if;

  if not exists (
    select 1 from pg_proc where proname = 'request_account_deletion'
  ) then
    raise exception 'request_account_deletion function missing';
  end if;

  if not exists (
    select 1 from pg_proc where proname = 'execute_account_domain_purge'
  ) then
    raise exception 'execute_account_domain_purge function missing';
  end if;
end $$;

do $$
declare
  user_one uuid := '99000000-0000-0000-0000-000000000001';
  user_two uuid := '99000000-0000-0000-0000-000000000002';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment10-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment10-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name)
  values (user_one, 'One'), (user_two, 'Two')
  on conflict (id) do nothing;

  perform set_config('request.jwt.claim.sub', user_one::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);

  insert into public.account_export_requests (user_id, status)
  values (user_one, 'pending');

  if (
    select count(*) from public.account_export_requests where user_id = user_one
  ) < 1 then
    raise exception 'owner cannot insert their own export request';
  end if;

  begin
    insert into public.account_export_requests (user_id, status)
    values (user_two, 'pending');
    raise exception 'authenticated user inserted export request for another user';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like '%inserted export request for another user%' then
        raise;
      end if;
  end;

  -- Prefer the security-definer RPC (production path); also prove direct insert.
  perform public.request_account_deletion();

  if (
    select count(*) from public.account_deletion_requests where user_id = user_one and status = 'pending'
  ) < 1 then
    raise exception 'owner cannot request account deletion';
  end if;

  if (
    select count(*) from public.account_deletion_requests where user_id = user_two
  ) <> 0 then
    raise exception 'authenticated user can read another user deletion request';
  end if;

  -- Cross-user insert must fail under RLS / with-check.
  begin
    insert into public.account_deletion_requests (user_id, status)
    values (user_two, 'pending');
    raise exception 'authenticated user inserted deletion request for another user';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like '%inserted deletion request for another user%' then
        raise;
      end if;
  end;
end $$;

rollback;
