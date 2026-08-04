-- Forward-only privilege hardening for hosted Supabase.
-- Hosted projects often inherit ALTER DEFAULT PRIVILEGES that grant ALL on new
-- tables to anon/authenticated. Migrations grant intended privileges but do not
-- always revoke the broader defaults, so catalog UPDATE/DELETE remain possible
-- when RLS has no UPDATE policy but privilege checks still allow the command
-- (and some hosted runners may observe non-zero updates).
--
-- This migration:
-- 1) revokes table privileges from anon entirely (app uses authenticated JWT)
-- 2) revokes write privileges on system catalogs from authenticated
-- 3) restores append-only product_review_events (select+insert only)
-- 4) tightens default privileges for future tables created by this role
--
-- Apply after 20260803120000_staging_security_definer_hardening.sql.
-- Do not edit prior migrations.

begin;

-- ---------------------------------------------------------------------------
-- Anon: no direct table access in public schema
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- ---------------------------------------------------------------------------
-- System / curated catalogs: authenticated read-only
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate, references, trigger on table
  public.module_definitions,
  public.nutrient_definitions,
  public.exercise_definitions,
  public.exercise_aliases,
  public.exercise_muscle_groups,
  public.muscle_groups,
  public.movement_patterns,
  public.equipment_types,
  public.rehab_body_areas,
  public.rehab_movements,
  public.rehab_exercise_definitions,
  public.rehab_exercise_aliases,
  public.measurement_definitions,
  public.tracker_definitions,
  public.supplement_definitions
from authenticated, anon;

grant select on table
  public.module_definitions,
  public.nutrient_definitions,
  public.exercise_definitions,
  public.exercise_aliases,
  public.exercise_muscle_groups,
  public.muscle_groups,
  public.movement_patterns,
  public.equipment_types,
  public.rehab_body_areas,
  public.rehab_movements,
  public.rehab_exercise_definitions,
  public.rehab_exercise_aliases,
  public.measurement_definitions,
  public.tracker_definitions,
  public.supplement_definitions
to authenticated;

-- ---------------------------------------------------------------------------
-- product_review_events: append-only for authenticated
-- ---------------------------------------------------------------------------

revoke all on table public.product_review_events from anon;
revoke update, delete, truncate, references, trigger on table public.product_review_events
  from authenticated;
grant select, insert on table public.product_review_events to authenticated;

-- ---------------------------------------------------------------------------
-- Future objects created by this role: do not auto-grant ALL to anon/auth
-- ---------------------------------------------------------------------------

alter default privileges in schema public
  revoke all on tables from anon, authenticated;

alter default privileges in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges in schema public
  revoke all on functions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER execute surface (advisor follow-ups)
-- ---------------------------------------------------------------------------

-- Trigger-only helper: pin search_path (function_search_path_mutable)
create or replace function public.sync_personal_record_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'INSERT' then
    if new.status is distinct from 'pending' then
      new.confirmed := (new.status = 'confirmed');
      new.dismissed := (new.status = 'dismissed');
    elsif new.confirmed then
      new.status := 'confirmed';
    elsif new.dismissed then
      new.status := 'dismissed';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    new.confirmed := (new.status = 'confirmed');
    new.dismissed := (new.status = 'dismissed');
  elsif new.confirmed is distinct from old.confirmed or new.dismissed is distinct from old.dismissed then
    if new.confirmed then
      new.status := 'confirmed';
    elsif new.dismissed then
      new.status := 'dismissed';
    else
      new.status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

-- Account deletion: authenticated may request; anon must not
revoke all on function public.request_account_deletion() from public;
revoke all on function public.request_account_deletion() from anon;
grant execute on function public.request_account_deletion() to authenticated;

-- Domain purge: service_role only (never anon/authenticated via PostgREST)
revoke all on function public.execute_account_domain_purge(uuid) from public;
revoke all on function public.execute_account_domain_purge(uuid) from anon;
revoke all on function public.execute_account_domain_purge(uuid) from authenticated;
grant execute on function public.execute_account_domain_purge(uuid) to service_role;

-- Intentionally keep authenticated EXECUTE on:
--   public.ensure_user_board_defaults(uuid)
--   public.archive_rehab_plan(uuid, integer)
-- Those advisors are expected for app RPC; not revoked here.

commit;
