-- Increment 10 production readiness: onboarding version, account export/deletion.
-- Idempotent. Does not seed production test users.

begin;

alter table public.profiles
  add column if not exists onboarding_version integer not null default 0
    check (onboarding_version >= 0);

alter table public.profiles
  add column if not exists analytics_consent boolean not null default false;

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz;

-- Relax onboarding_step upper bound for expanded wizard (welcome..finish).
alter table public.profiles drop constraint if exists profiles_onboarding_step_check;
alter table public.profiles
  add constraint profiles_onboarding_step_check
  check (onboarding_step >= 0 and onboarding_step <= 12);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  confirmation_phrase text not null default 'DELETE',
  requested_at timestamptz not null default timezone('utc', now()),
  scheduled_purge_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create table if not exists public.account_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  storage_path text,
  expires_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_deletion_requests_user_id_idx
  on public.account_deletion_requests (user_id);
create index if not exists account_export_requests_user_id_idx
  on public.account_export_requests (user_id, created_at desc);

drop trigger if exists account_deletion_requests_set_updated_at on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
  before update on public.account_deletion_requests
  for each row execute function public.set_updated_at();

drop trigger if exists account_export_requests_set_updated_at on public.account_export_requests;
create trigger account_export_requests_set_updated_at
  before update on public.account_export_requests
  for each row execute function public.set_updated_at();

alter table public.account_deletion_requests enable row level security;
alter table public.account_export_requests enable row level security;

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own on public.account_deletion_requests
  for select to authenticated using (user_id = auth.uid());

drop policy if exists account_deletion_requests_insert_own on public.account_deletion_requests;
create policy account_deletion_requests_insert_own on public.account_deletion_requests
  for insert to authenticated with check (user_id = auth.uid());

-- Owner may cancel (or refresh) their own pending request; purge completion is service-role only.
drop policy if exists account_deletion_requests_update_own on public.account_deletion_requests;
create policy account_deletion_requests_update_own on public.account_deletion_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists account_export_requests_select_own on public.account_export_requests;
create policy account_export_requests_select_own on public.account_export_requests
  for select to authenticated using (user_id = auth.uid());

drop policy if exists account_export_requests_insert_own on public.account_export_requests;
create policy account_export_requests_insert_own on public.account_export_requests
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists account_export_requests_update_own on public.account_export_requests;
create policy account_export_requests_update_own on public.account_export_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.account_deletion_requests to authenticated;
grant select, insert, update on table public.account_export_requests to authenticated;

-- Owner-initiated deletion request. Does not delete auth.users — the Next.js
-- service-role path completes auth deletion after domain purge.
create or replace function public.request_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.account_deletion_requests;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.account_deletion_requests (user_id, status, scheduled_purge_at)
  values (uid, 'pending', timezone('utc', now()) + interval '15 minutes')
  on conflict (user_id) do update
    set status = 'pending',
        requested_at = timezone('utc', now()),
        scheduled_purge_at = timezone('utc', now()) + interval '15 minutes',
        last_error = null,
        updated_at = timezone('utc', now())
  returning * into row;

  update public.profiles
  set deletion_requested_at = timezone('utc', now())
  where id = uid;

  return row;
end;
$$;

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

-- Purge owner domain rows. System catalogs are untouched.
-- Storage object removal is performed by the application with the service role.
create or replace function public.execute_account_domain_purge(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  delete from public.hydration_entries where user_id = p_user_id;
  delete from public.meditation_sessions where user_id = p_user_id;
  delete from public.sleep_sessions where user_id = p_user_id;
  delete from public.supplement_intakes where user_id = p_user_id;
  delete from public.user_supplements where user_id = p_user_id;
  delete from public.tracker_events where user_id = p_user_id;
  delete from public.tracker_daily_summaries where user_id = p_user_id;
  delete from public.tracker_reminders where user_id = p_user_id;
  delete from public.tracker_streaks where user_id = p_user_id;
  -- tracker_targets cascade from user_trackers
  delete from public.user_trackers where user_id = p_user_id;
  delete from public.profile_preferences where user_id = p_user_id;
  delete from public.daily_overview_preferences where user_id = p_user_id;

  -- Progress (photos cascade from sets; measurement values cascade from entries)
  delete from public.progress_comparisons where user_id = p_user_id;
  delete from public.progress_notes where user_id = p_user_id;
  delete from public.progress_photo_sets where user_id = p_user_id;
  delete from public.body_measurement_entries where user_id = p_user_id;
  delete from public.body_weight_entries where user_id = p_user_id;
  delete from public.user_measurement_definitions where user_id = p_user_id;
  delete from public.progress_summary_preferences where user_id = p_user_id;

  -- Rehab / workout
  delete from public.rehab_alert_events where user_id = p_user_id;
  delete from public.rehab_sessions where user_id = p_user_id;
  delete from public.scheduled_rehab_sessions where user_id = p_user_id;
  delete from public.rehab_plans where user_id = p_user_id;
  delete from public.user_rehab_exercises where user_id = p_user_id;
  delete from public.rehab_clinician_sources where user_id = p_user_id;

  delete from public.personal_records where user_id = p_user_id;
  delete from public.workout_sessions where user_id = p_user_id;
  delete from public.scheduled_workouts where user_id = p_user_id;
  delete from public.workout_plans where user_id = p_user_id;
  delete from public.user_exercises where user_id = p_user_id;

  -- Nutrition user data
  delete from public.nutrition_label_captures where user_id = p_user_id;
  delete from public.meal_logs where user_id = p_user_id;
  delete from public.meal_templates where user_id = p_user_id;
  delete from public.recipes where user_id = p_user_id;
  delete from public.user_custom_foods where user_id = p_user_id;
  delete from public.nutrition_goals where user_id = p_user_id;

  -- Board / daily (statuses cascade from daily_records)
  delete from public.daily_records where user_id = p_user_id;
  delete from public.dashboard_layouts where user_id = p_user_id;
  delete from public.user_modules where user_id = p_user_id;

  delete from public.account_export_requests where user_id = p_user_id;
  update public.account_deletion_requests
    set status = 'completed', completed_at = timezone('utc', now()), last_error = null
    where user_id = p_user_id;

  -- Profile row is removed with auth.users cascade after service-role auth delete.
end;
$$;

revoke all on function public.execute_account_domain_purge(uuid) from public;
-- Executable only via service role / postgres (not granted to authenticated)

commit;
