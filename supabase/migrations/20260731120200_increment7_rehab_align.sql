-- Increment 7 align: restriction display_order + harden archive_rehab_plan.
-- Soft-delete remains security-definer because authenticated UPDATE that sets
-- deleted_at fails when SELECT policies require deleted_at IS NULL (PostgREST
-- RETURNING / RLS interaction). This migration documents and tightens that RPC.

-- ---------------------------------------------------------------------------
-- rehab_restrictions.display_order for accessible Move up / Move down
-- ---------------------------------------------------------------------------

alter table public.rehab_restrictions
  add column if not exists display_order integer;

-- Backfill contiguous orders per plan (stable by created_at, then id).
with ranked as (
  select
    id,
    (row_number() over (
      partition by rehab_plan_id
      order by created_at asc, id asc
    ) - 1)::integer as rn
  from public.rehab_restrictions
)
update public.rehab_restrictions r
set display_order = ranked.rn
from ranked
where r.id = ranked.id
  and (r.display_order is null or r.display_order <> ranked.rn);

alter table public.rehab_restrictions
  alter column display_order set default 0;

alter table public.rehab_restrictions
  alter column display_order set not null;

alter table public.rehab_restrictions
  drop constraint if exists rehab_restrictions_plan_display_order_key;

alter table public.rehab_restrictions
  add constraint rehab_restrictions_plan_display_order_key
  unique (rehab_plan_id, display_order);

create index if not exists rehab_restrictions_plan_order_idx
  on public.rehab_restrictions (rehab_plan_id, display_order);

-- ---------------------------------------------------------------------------
-- Hardened archive_rehab_plan
-- ---------------------------------------------------------------------------

create or replace function public.archive_rehab_plan(
  p_plan_id uuid,
  p_expected_version integer
)
returns public.rehab_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_row public.rehab_plans;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_plan_id is null then
    raise exception 'plan id required' using errcode = '22023';
  end if;

  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'expected version must be a positive integer' using errcode = '22023';
  end if;

  select * into plan_row
  from public.rehab_plans
  where id = p_plan_id
    and user_id = caller
    and deleted_at is null
  for update;

  if not found then
    -- Idempotent: already archived by this owner returns the archived row.
    select * into plan_row
    from public.rehab_plans
    where id = p_plan_id
      and user_id = caller
      and deleted_at is not null;

    if found then
      return plan_row;
    end if;

    raise exception 'rehab plan not found' using errcode = 'P0002';
  end if;

  if plan_row.version is distinct from p_expected_version then
    raise exception 'stale rehab plan version' using errcode = 'P0001';
  end if;

  -- Only touch the owned plan row. No cascading writes to sessions/history.
  update public.rehab_plans
  set
    active = false,
    deleted_at = timezone('utc', now()),
    version = plan_row.version + 1,
    updated_at = timezone('utc', now())
  where id = plan_row.id
    and user_id = caller
    and deleted_at is null
  returning * into plan_row;

  return plan_row;
end;
$$;

revoke all on function public.archive_rehab_plan(uuid, integer) from public;
revoke all on function public.archive_rehab_plan(uuid, integer) from anon;
grant execute on function public.archive_rehab_plan(uuid, integer) to authenticated;
