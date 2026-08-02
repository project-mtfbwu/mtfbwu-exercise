-- Increment 9: hydration, meditation, sleep, supplements, configurable trackers,
-- daily summaries, reminders, streaks, and profile/daily-overview preferences.
-- Curated tracker_definitions and supplement_definitions seed data belong in a
-- separate migration.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.tracker_type as enum (
    'hydration', 'meditation', 'sleep', 'supplement', 'numeric', 'duration',
    'boolean', 'count', 'text', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tracker_value_type as enum (
    'amount', 'duration', 'count', 'boolean', 'time_range', 'text'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tracker_target_frequency as enum (
    'daily', 'weekly', 'selected_days', 'as_needed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tracker_event_source as enum (
    'manual', 'imported_future', 'device_future'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.meditation_type as enum (
    'breathing', 'mindfulness', 'body_scan', 'guided', 'mantra',
    'visualization', 'walking', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sleep_quality as enum (
    'very_poor', 'poor', 'fair', 'good', 'very_good'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.supplement_form as enum (
    'tablet', 'capsule', 'powder', 'liquid', 'sachet', 'gummy', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.supplement_intake_status as enum (
    'taken', 'skipped', 'partial'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tracker_reminder_type as enum (
    'tracker', 'supplement', 'bedtime', 'wake', 'custom'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- System tracker catalog (read-only for authenticated)
-- ---------------------------------------------------------------------------

create table if not exists public.tracker_definitions (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  display_name text not null,
  description text,
  tracker_type public.tracker_type not null,
  value_type public.tracker_value_type not null,
  default_unit text,
  supports_target boolean not null default false,
  supports_multiple_events boolean not null default false,
  supports_duration boolean not null default false,
  supports_streak boolean not null default false,
  visual_variant text not null default 'default',
  active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- User tracker configuration (catalog wrapper OR custom_name)
-- ---------------------------------------------------------------------------

create table if not exists public.user_trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tracker_definition_id uuid references public.tracker_definitions (id) on delete restrict,
  custom_name text,
  custom_description text,
  enabled boolean not null default true,
  unit text,
  color_token text,
  icon_key text,
  display_order integer not null default 0 check (display_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    tracker_definition_id is not null
    or (custom_name is not null and length(trim(custom_name)) > 0)
  )
);

create unique index if not exists user_trackers_one_active_system_per_user
  on public.user_trackers (user_id, tracker_definition_id)
  where tracker_definition_id is not null and archived_at is null;

-- ---------------------------------------------------------------------------
-- Tracker targets (effective-dated goals)
-- ---------------------------------------------------------------------------

create table if not exists public.tracker_targets (
  id uuid primary key default gen_random_uuid(),
  user_tracker_id uuid not null references public.user_trackers (id) on delete cascade,
  effective_from date not null,
  effective_until date,
  target_value numeric,
  target_unit text,
  target_min numeric,
  target_max numeric,
  target_frequency public.tracker_target_frequency not null default 'daily',
  days_of_week integer[],
  confirmed_by_user boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_until is null or effective_until >= effective_from)
);

-- ---------------------------------------------------------------------------
-- Tracker events (performed log entries)
-- ---------------------------------------------------------------------------

create table if not exists public.tracker_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_tracker_id uuid not null references public.user_trackers (id) on delete cascade,
  daily_record_id uuid references public.daily_records (id) on delete set null,
  local_date date not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  timezone text not null default 'UTC',
  value_numeric numeric,
  value_boolean boolean,
  value_text text,
  duration_seconds integer,
  unit text,
  source public.tracker_event_source not null default 'manual',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (duration_seconds is null or duration_seconds >= 0),
  check (value_numeric is null or value_numeric >= 0)
);

-- ---------------------------------------------------------------------------
-- Tracker daily summaries (materialized per-day cache)
-- ---------------------------------------------------------------------------

create table if not exists public.tracker_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_tracker_id uuid not null references public.user_trackers (id) on delete cascade,
  local_date date not null,
  total_numeric numeric,
  total_duration_seconds integer,
  event_count integer not null default 0 check (event_count >= 0),
  completed boolean not null default false,
  target_snapshot_json jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_tracker_id, local_date),
  check (total_duration_seconds is null or total_duration_seconds >= 0)
);

-- ---------------------------------------------------------------------------
-- Hydration entries
-- ---------------------------------------------------------------------------

create table if not exists public.hydration_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_record_id uuid references public.daily_records (id) on delete set null,
  local_date date not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  amount_ml numeric not null check (amount_ml > 0 and amount_ml <= 10000),
  vessel_label text,
  source public.tracker_event_source not null default 'manual',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Meditation sessions
-- ---------------------------------------------------------------------------

create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_record_id uuid references public.daily_records (id) on delete set null,
  local_date date not null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  duration_seconds integer not null check (duration_seconds >= 0),
  meditation_type public.meditation_type not null default 'mindfulness',
  completed boolean not null default false,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (completed_at is null or completed_at >= started_at)
);

-- ---------------------------------------------------------------------------
-- Sleep sessions
-- ---------------------------------------------------------------------------

create table if not exists public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sleep_date date not null,
  timezone text not null default 'UTC',
  bedtime_at timestamptz not null,
  wake_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  quality public.sleep_quality,
  interruptions integer check (interruptions is null or interruptions >= 0),
  nap boolean not null default false,
  source public.tracker_event_source not null default 'manual',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (wake_at > bedtime_at)
);

-- ---------------------------------------------------------------------------
-- Supplement definitions (system catalog)
-- ---------------------------------------------------------------------------

create table if not exists public.supplement_definitions (
  id uuid primary key default gen_random_uuid(),
  stable_key text unique,
  display_name text not null,
  form public.supplement_form not null default 'other',
  default_unit text,
  system_owned boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- User supplements
-- ---------------------------------------------------------------------------

create table if not exists public.user_supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  supplement_definition_id uuid references public.supplement_definitions (id) on delete restrict,
  custom_name text,
  brand text,
  serving_amount numeric check (serving_amount is null or serving_amount >= 0),
  serving_unit text,
  instructions_text text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    supplement_definition_id is not null
    or (custom_name is not null and length(trim(custom_name)) > 0)
  )
);

-- ---------------------------------------------------------------------------
-- Supplement intakes
-- ---------------------------------------------------------------------------

create table if not exists public.supplement_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_supplement_id uuid not null references public.user_supplements (id) on delete cascade,
  daily_record_id uuid references public.daily_records (id) on delete set null,
  local_date date not null,
  taken_at timestamptz not null default timezone('utc', now()),
  amount numeric check (amount is null or amount >= 0),
  unit text,
  status public.supplement_intake_status not null default 'taken',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Tracker reminders
-- ---------------------------------------------------------------------------

create table if not exists public.tracker_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_tracker_id uuid references public.user_trackers (id) on delete cascade,
  user_supplement_id uuid references public.user_supplements (id) on delete cascade,
  local_time time not null,
  timezone text not null default 'UTC',
  days_of_week integer[] not null default '{}'::integer[],
  enabled boolean not null default true,
  reminder_type public.tracker_reminder_type not null default 'tracker',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    user_tracker_id is not null
    or user_supplement_id is not null
    or reminder_type in ('bedtime', 'wake', 'custom')
  )
);

-- ---------------------------------------------------------------------------
-- Tracker streaks
-- ---------------------------------------------------------------------------

create table if not exists public.tracker_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_tracker_id uuid not null references public.user_trackers (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completed_date date,
  calculated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_tracker_id)
);

-- ---------------------------------------------------------------------------
-- Profile preferences (one row per user)
-- ---------------------------------------------------------------------------

create table if not exists public.profile_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  preferred_name text,
  week_starts_on integer not null default 1 check (week_starts_on >= 0 and week_starts_on <= 6),
  time_format text not null default '24h' check (time_format in ('12h', '24h')),
  weight_unit text not null default 'kg',
  length_unit text not null default 'cm',
  volume_unit text not null default 'ml',
  default_dashboard_date_mode text not null default 'today',
  show_streaks boolean not null default true,
  show_weekly_summary boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Daily overview preferences (one row per user)
-- ---------------------------------------------------------------------------

create table if not exists public.daily_overview_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  visible_sections jsonb not null default '[]'::jsonb,
  summary_order jsonb not null default '[]'::jsonb,
  show_completion_percentage boolean not null default true,
  show_module_counts boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Daily summary recalculation helper
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_tracker_daily_summary(
  p_user_tracker_id uuid,
  p_local_date date
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_total_numeric numeric;
  v_total_duration integer;
  v_event_count integer;
begin
  select ut.user_id
  into v_user_id
  from public.user_trackers ut
  where ut.id = p_user_tracker_id;

  if v_user_id is null then
    raise exception 'user_tracker % not found', p_user_tracker_id;
  end if;

  select
    sum(te.value_numeric),
    sum(te.duration_seconds)::integer,
    count(*)::integer
  into v_total_numeric, v_total_duration, v_event_count
  from public.tracker_events te
  where te.user_tracker_id = p_user_tracker_id
    and te.local_date = p_local_date
    and te.deleted_at is null;

  insert into public.tracker_daily_summaries (
    user_id, user_tracker_id, local_date, total_numeric, total_duration_seconds,
    event_count, calculated_at
  )
  values (
    v_user_id, p_user_tracker_id, p_local_date, v_total_numeric, v_total_duration,
    coalesce(v_event_count, 0), timezone('utc', now())
  )
  on conflict (user_tracker_id, local_date) do update set
    total_numeric = excluded.total_numeric,
    total_duration_seconds = excluded.total_duration_seconds,
    event_count = excluded.event_count,
    calculated_at = excluded.calculated_at,
    updated_at = timezone('utc', now());
end;
$$;

revoke all on function public.recalculate_tracker_daily_summary(uuid, date) from public;
grant execute on function public.recalculate_tracker_daily_summary(uuid, date)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists tracker_definitions_active_order_idx
  on public.tracker_definitions (active, display_order);

create index if not exists user_trackers_user_enabled_idx
  on public.user_trackers (user_id, enabled, display_order)
  where archived_at is null;

create index if not exists tracker_targets_user_tracker_idx
  on public.tracker_targets (user_tracker_id, effective_from desc);

create index if not exists tracker_events_user_date_idx
  on public.tracker_events (user_id, local_date desc, occurred_at desc)
  where deleted_at is null;

create index if not exists tracker_events_user_tracker_date_idx
  on public.tracker_events (user_tracker_id, local_date desc)
  where deleted_at is null;

create index if not exists tracker_daily_summaries_user_date_idx
  on public.tracker_daily_summaries (user_id, local_date desc);

create index if not exists hydration_entries_user_date_idx
  on public.hydration_entries (user_id, local_date desc, occurred_at desc)
  where deleted_at is null;

create index if not exists meditation_sessions_user_date_idx
  on public.meditation_sessions (user_id, local_date desc, started_at desc)
  where deleted_at is null;

create index if not exists sleep_sessions_user_date_idx
  on public.sleep_sessions (user_id, sleep_date desc, bedtime_at desc)
  where deleted_at is null;

create index if not exists supplement_definitions_active_idx
  on public.supplement_definitions (active, display_name);

create index if not exists user_supplements_user_active_idx
  on public.user_supplements (user_id, active);

create index if not exists supplement_intakes_user_date_idx
  on public.supplement_intakes (user_id, local_date desc, taken_at desc)
  where deleted_at is null;

create index if not exists tracker_reminders_user_enabled_idx
  on public.tracker_reminders (user_id, enabled);

create index if not exists tracker_streaks_user_idx
  on public.tracker_streaks (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_updated_at() from Increment 3)
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tracker_definitions', 'user_trackers', 'tracker_targets', 'tracker_events',
    'tracker_daily_summaries', 'hydration_entries', 'meditation_sessions',
    'sleep_sessions', 'supplement_definitions', 'user_supplements',
    'supplement_intakes', 'tracker_reminders', 'tracker_streaks',
    'profile_preferences', 'daily_overview_preferences'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tracker_definitions enable row level security;
alter table public.user_trackers enable row level security;
alter table public.tracker_targets enable row level security;
alter table public.tracker_events enable row level security;
alter table public.tracker_daily_summaries enable row level security;
alter table public.hydration_entries enable row level security;
alter table public.meditation_sessions enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.supplement_definitions enable row level security;
alter table public.user_supplements enable row level security;
alter table public.supplement_intakes enable row level security;
alter table public.tracker_reminders enable row level security;
alter table public.tracker_streaks enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.daily_overview_preferences enable row level security;

-- System catalogs: authenticated read active definitions only.
create policy tracker_definitions_select_active on public.tracker_definitions
  for select to authenticated using (active);

create policy supplement_definitions_select_active on public.supplement_definitions
  for select to authenticated using (active);

-- user_trackers: owner-only CRUD
create policy user_trackers_select_own on public.user_trackers
  for select to authenticated using (user_id = auth.uid());
create policy user_trackers_insert_own on public.user_trackers
  for insert to authenticated with check (user_id = auth.uid());
create policy user_trackers_update_own on public.user_trackers
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_trackers_delete_own on public.user_trackers
  for delete to authenticated using (user_id = auth.uid());

-- tracker_targets: ownership via parent user_tracker
create policy tracker_targets_select_own on public.tracker_targets
  for select to authenticated using (
    exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );
create policy tracker_targets_insert_own on public.tracker_targets
  for insert to authenticated with check (
    exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );
create policy tracker_targets_update_own on public.tracker_targets
  for update to authenticated
  using (
    exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );
create policy tracker_targets_delete_own on public.tracker_targets
  for delete to authenticated using (
    exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );

-- tracker_events: owner-only CRUD; soft-deleted rows invisible
create policy tracker_events_select_own on public.tracker_events
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy tracker_events_insert_own on public.tracker_events
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );
create policy tracker_events_update_own on public.tracker_events
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );
create policy tracker_events_delete_own on public.tracker_events
  for delete to authenticated using (user_id = auth.uid());

-- tracker_daily_summaries: owner-only CRUD
create policy tracker_daily_summaries_select_own on public.tracker_daily_summaries
  for select to authenticated using (user_id = auth.uid());
create policy tracker_daily_summaries_insert_own on public.tracker_daily_summaries
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );
create policy tracker_daily_summaries_update_own on public.tracker_daily_summaries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tracker_daily_summaries_delete_own on public.tracker_daily_summaries
  for delete to authenticated using (user_id = auth.uid());

-- hydration_entries: owner-only CRUD; soft-deleted rows invisible
create policy hydration_entries_select_own on public.hydration_entries
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy hydration_entries_insert_own on public.hydration_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy hydration_entries_update_own on public.hydration_entries
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy hydration_entries_delete_own on public.hydration_entries
  for delete to authenticated using (user_id = auth.uid());

-- meditation_sessions: owner-only CRUD; soft-deleted rows invisible
create policy meditation_sessions_select_own on public.meditation_sessions
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy meditation_sessions_insert_own on public.meditation_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy meditation_sessions_update_own on public.meditation_sessions
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy meditation_sessions_delete_own on public.meditation_sessions
  for delete to authenticated using (user_id = auth.uid());

-- sleep_sessions: owner-only CRUD; soft-deleted rows invisible
create policy sleep_sessions_select_own on public.sleep_sessions
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy sleep_sessions_insert_own on public.sleep_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy sleep_sessions_update_own on public.sleep_sessions
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy sleep_sessions_delete_own on public.sleep_sessions
  for delete to authenticated using (user_id = auth.uid());

-- user_supplements: owner-only CRUD
create policy user_supplements_select_own on public.user_supplements
  for select to authenticated using (user_id = auth.uid());
create policy user_supplements_insert_own on public.user_supplements
  for insert to authenticated with check (user_id = auth.uid());
create policy user_supplements_update_own on public.user_supplements
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_supplements_delete_own on public.user_supplements
  for delete to authenticated using (user_id = auth.uid());

-- supplement_intakes: owner-only CRUD; soft-deleted rows invisible
create policy supplement_intakes_select_own on public.supplement_intakes
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy supplement_intakes_insert_own on public.supplement_intakes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_supplements us
      where us.id = user_supplement_id and us.user_id = auth.uid()
    )
  );
create policy supplement_intakes_update_own on public.supplement_intakes
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_supplements us
      where us.id = user_supplement_id and us.user_id = auth.uid()
    )
  );
create policy supplement_intakes_delete_own on public.supplement_intakes
  for delete to authenticated using (user_id = auth.uid());

-- tracker_reminders: owner-only CRUD
create policy tracker_reminders_select_own on public.tracker_reminders
  for select to authenticated using (user_id = auth.uid());
create policy tracker_reminders_insert_own on public.tracker_reminders
  for insert to authenticated with check (user_id = auth.uid());
create policy tracker_reminders_update_own on public.tracker_reminders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tracker_reminders_delete_own on public.tracker_reminders
  for delete to authenticated using (user_id = auth.uid());

-- tracker_streaks: owner-only CRUD
create policy tracker_streaks_select_own on public.tracker_streaks
  for select to authenticated using (user_id = auth.uid());
create policy tracker_streaks_insert_own on public.tracker_streaks
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_trackers ut
      where ut.id = user_tracker_id and ut.user_id = auth.uid()
    )
  );
create policy tracker_streaks_update_own on public.tracker_streaks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tracker_streaks_delete_own on public.tracker_streaks
  for delete to authenticated using (user_id = auth.uid());

-- profile_preferences: owner-only CRUD
create policy profile_preferences_select_own on public.profile_preferences
  for select to authenticated using (user_id = auth.uid());
create policy profile_preferences_insert_own on public.profile_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy profile_preferences_update_own on public.profile_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profile_preferences_delete_own on public.profile_preferences
  for delete to authenticated using (user_id = auth.uid());

-- daily_overview_preferences: owner-only CRUD
create policy daily_overview_preferences_select_own on public.daily_overview_preferences
  for select to authenticated using (user_id = auth.uid());
create policy daily_overview_preferences_insert_own on public.daily_overview_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy daily_overview_preferences_update_own on public.daily_overview_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_overview_preferences_delete_own on public.daily_overview_preferences
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges. System catalogs are read-only for authenticated clients.
-- ---------------------------------------------------------------------------

grant select on public.tracker_definitions, public.supplement_definitions to authenticated;

grant select, insert, update, delete on public.user_trackers, public.tracker_targets,
  public.tracker_events, public.tracker_daily_summaries, public.hydration_entries,
  public.meditation_sessions, public.sleep_sessions, public.user_supplements,
  public.supplement_intakes, public.tracker_reminders, public.tracker_streaks,
  public.profile_preferences, public.daily_overview_preferences
  to authenticated;

grant all on public.tracker_definitions, public.user_trackers, public.tracker_targets,
  public.tracker_events, public.tracker_daily_summaries, public.hydration_entries,
  public.meditation_sessions, public.sleep_sessions, public.supplement_definitions,
  public.user_supplements, public.supplement_intakes, public.tracker_reminders,
  public.tracker_streaks, public.profile_preferences, public.daily_overview_preferences
  to service_role;
