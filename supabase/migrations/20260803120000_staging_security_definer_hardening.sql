-- Staging / production hardening (forward-only).
-- Addresses Supabase advisors for mutable search_path on set_updated_at and
-- overly broad EXECUTE on security-definer bootstrap helpers.
-- Does not change application call paths; authenticated + service_role retain
-- ensure_user_board_defaults. handle_new_user is trigger-only (revoke PUBLIC).

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;
-- Trigger functions execute as owner; no EXECUTE grant required for roles.

revoke all on function public.ensure_user_board_defaults(uuid) from public;
revoke all on function public.ensure_user_board_defaults(uuid) from anon;
grant execute on function public.ensure_user_board_defaults(uuid)
  to authenticated, service_role;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
-- Intentionally no EXECUTE grants: auth.users trigger only.

commit;
