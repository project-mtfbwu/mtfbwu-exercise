-- Regression assertions for staging_security_definer_hardening migration.
-- Run against local or hosted staging after the hardening migration applies.
-- Uses DO blocks with RAISE EXCEPTION so psql -v ON_ERROR_STOP=1 fails closed.

do $$
declare
  cfg text[];
begin
  select proconfig into cfg
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'set_updated_at' and pg_get_function_identity_arguments(p.oid) = '';

  if cfg is null or not ('search_path=public, pg_temp' = any (cfg) or 'search_path=public,pg_temp' = any (cfg)) then
    -- accept either spacing
    if cfg is null or not exists (
      select 1 from unnest(cfg) c where c like 'search_path=%public%'
    ) then
      raise exception 'assert_failed: set_updated_at missing search_path config: %', cfg;
    end if;
  end if;
end $$;

do $$
begin
  if has_function_privilege('anon', 'public.ensure_user_board_defaults(uuid)', 'execute') then
    raise exception 'assert_failed: anon can execute ensure_user_board_defaults';
  end if;
  if not has_function_privilege('authenticated', 'public.ensure_user_board_defaults(uuid)', 'execute') then
    raise exception 'assert_failed: authenticated cannot execute ensure_user_board_defaults';
  end if;
  if has_function_privilege('anon', 'public.handle_new_user()', 'execute') then
    raise exception 'assert_failed: anon can execute handle_new_user';
  end if;
  if has_function_privilege('authenticated', 'public.handle_new_user()', 'execute') then
    raise exception 'assert_failed: authenticated can execute handle_new_user via RPC';
  end if;
end $$;

do $$
begin
  raise notice 'staging_security_definer_hardening assertions passed';
end $$;
