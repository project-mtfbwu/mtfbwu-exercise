-- Assertions for staging_privilege_hardening.
-- Expect: catalogs read-only for authenticated; anon has no catalog/table access;
-- product_review_events append-only; purge RPC service_role-only; intentional
-- authenticated RPCs for deletion request, board defaults, and rehab archive remain.

do $$
declare
  search_path_setting text;
begin
  if has_table_privilege('authenticated', 'public.exercise_definitions', 'update') then
    raise exception 'assert_failed: authenticated can UPDATE exercise_definitions';
  end if;
  if has_table_privilege('authenticated', 'public.rehab_exercise_definitions', 'update') then
    raise exception 'assert_failed: authenticated can UPDATE rehab_exercise_definitions';
  end if;
  if has_table_privilege('authenticated', 'public.measurement_definitions', 'update') then
    raise exception 'assert_failed: authenticated can UPDATE measurement_definitions';
  end if;
  if has_table_privilege('authenticated', 'public.tracker_definitions', 'update') then
    raise exception 'assert_failed: authenticated can UPDATE tracker_definitions';
  end if;
  if has_table_privilege('anon', 'public.exercise_definitions', 'select') then
    raise exception 'assert_failed: anon can SELECT exercise_definitions';
  end if;
  if has_table_privilege('anon', 'public.profiles', 'select') then
    raise exception 'assert_failed: anon can SELECT profiles';
  end if;
  if has_table_privilege('authenticated', 'public.product_review_events', 'update') then
    raise exception 'assert_failed: authenticated can UPDATE product_review_events';
  end if;
  if has_table_privilege('authenticated', 'public.product_review_events', 'delete') then
    raise exception 'assert_failed: authenticated can DELETE product_review_events';
  end if;
  if not has_table_privilege('authenticated', 'public.product_review_events', 'insert') then
    raise exception 'assert_failed: authenticated cannot INSERT product_review_events';
  end if;
  if not has_table_privilege('authenticated', 'public.exercise_definitions', 'select') then
    raise exception 'assert_failed: authenticated cannot SELECT exercise_definitions';
  end if;
  -- Owner-controlled tables must remain writable at the privilege layer (RLS isolates).
  if not has_table_privilege('authenticated', 'public.profiles', 'update') then
    raise exception 'assert_failed: authenticated cannot UPDATE profiles';
  end if;
  if not has_table_privilege('authenticated', 'public.nutrition_label_captures', 'insert') then
    raise exception 'assert_failed: authenticated cannot INSERT nutrition_label_captures';
  end if;

  if has_function_privilege('anon', 'public.request_account_deletion()', 'execute') then
    raise exception 'assert_failed: anon can EXECUTE request_account_deletion';
  end if;
  if has_function_privilege('anon', 'public.execute_account_domain_purge(uuid)', 'execute') then
    raise exception 'assert_failed: anon can EXECUTE execute_account_domain_purge';
  end if;
  if has_function_privilege('authenticated', 'public.execute_account_domain_purge(uuid)', 'execute') then
    raise exception 'assert_failed: authenticated can EXECUTE execute_account_domain_purge';
  end if;
  if not has_function_privilege('service_role', 'public.execute_account_domain_purge(uuid)', 'execute') then
    raise exception 'assert_failed: service_role cannot EXECUTE execute_account_domain_purge';
  end if;
  if not has_function_privilege('authenticated', 'public.request_account_deletion()', 'execute') then
    raise exception 'assert_failed: authenticated cannot EXECUTE request_account_deletion';
  end if;
  if not has_function_privilege('authenticated', 'public.ensure_user_board_defaults(uuid)', 'execute') then
    raise exception 'assert_failed: authenticated cannot EXECUTE ensure_user_board_defaults';
  end if;
  if not has_function_privilege('authenticated', 'public.archive_rehab_plan(uuid, integer)', 'execute') then
    raise exception 'assert_failed: authenticated cannot EXECUTE archive_rehab_plan';
  end if;
  if has_function_privilege('anon', 'public.ensure_user_board_defaults(uuid)', 'execute') then
    raise exception 'assert_failed: anon can EXECUTE ensure_user_board_defaults';
  end if;
  if has_function_privilege('anon', 'public.archive_rehab_plan(uuid, integer)', 'execute') then
    raise exception 'assert_failed: anon can EXECUTE archive_rehab_plan';
  end if;

  select pg_get_functiondef('public.sync_personal_record_status()'::regprocedure)
    into search_path_setting;
  if search_path_setting is null
     or (
       position('SET search_path TO' in search_path_setting) = 0
       and position('SET search_path =' in search_path_setting) = 0
     ) then
    raise exception 'assert_failed: sync_personal_record_status missing search_path';
  end if;

  raise notice 'staging_privilege_hardening assertions passed';
end $$;
