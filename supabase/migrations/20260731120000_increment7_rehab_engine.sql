-- Increment 7: rehab exercise catalog + clinician-guided plans, scheduling, sessions.
-- Curated rehab catalog seed data belongs in a separate migration.
-- Templates/plans (rehab_plans and children) are intentionally separate from performed
-- history (rehab_sessions and children); editing a plan never rewrites a session that
-- already snapshotted its exercise names, restrictions, or clinician source.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.rehab_exercise_category as enum (
    'mobility', 'activation', 'control', 'strength', 'balance', 'proprioception',
    'isometric', 'stretching', 'gait', 'conditioning', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_exercise_source as enum ('mtfbwu_curated', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_side as enum ('left', 'right', 'bilateral', 'not_applicable');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_phase_type as enum (
    'protection', 'mobility', 'activation', 'strength', 'control',
    'return_to_activity', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_completion_rule as enum (
    'exact', 'range', 'duration', 'hold', 'manual'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_restriction_type as enum (
    'load_limit', 'range_limit', 'movement_avoidance', 'assistance_required',
    'weight_bearing', 'frequency_limit', 'stop_condition', 'clinician_instruction', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_restriction_severity as enum ('informational', 'caution', 'stop');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_clinician_source_type as enum (
    'physiotherapist', 'orthopedic', 'sports_medicine', 'trainer',
    'self_entered', 'document', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.scheduled_rehab_status as enum (
    'planned', 'started', 'completed', 'skipped', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_session_status as enum (
    'in_progress', 'paused', 'completed', 'discarded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_set_status as enum (
    'pending', 'completed', 'skipped', 'stopped', 'partial'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_swelling_level as enum ('none', 'mild', 'moderate', 'severe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_instability_level as enum ('none', 'slight', 'moderate', 'severe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_observation_type as enum (
    'pain', 'swelling', 'instability', 'stiffness', 'confidence', 'fatigue', 'range', 'general'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rehab_alert_type as enum (
    'pain_threshold', 'severe_swelling', 'severe_instability', 'stop_condition',
    'user_stopped_set', 'other'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Rehab taxonomy + catalog (system catalog: read-only for authenticated)
-- ---------------------------------------------------------------------------

create table if not exists public.rehab_body_areas (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rehab_movements (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rehab_exercise_definitions (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name text not null,
  normalized_name text not null,
  description text,
  body_area_id uuid references public.rehab_body_areas (id) on delete set null,
  movement_id uuid references public.rehab_movements (id) on delete set null,
  exercise_category public.rehab_exercise_category not null default 'mobility',
  bilateral boolean not null default false,
  load_supported boolean not null default false,
  hold_supported boolean not null default false,
  duration_supported boolean not null default false,
  assistance_supported boolean not null default false,
  rom_tracking_supported boolean not null default false,
  source public.rehab_exercise_source not null default 'mtfbwu_curated',
  source_id text,
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rehab_exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  rehab_exercise_definition_id uuid not null references public.rehab_exercise_definitions (id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rehab_exercise_definition_id, normalized_alias)
);

-- ---------------------------------------------------------------------------
-- User-owned rehab exercises: catalog wrapper OR custom_name (exactly one).
-- ---------------------------------------------------------------------------

create table if not exists public.user_rehab_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rehab_exercise_definition_id uuid references public.rehab_exercise_definitions (id) on delete restrict,
  custom_name text,
  instructions text,
  private_video_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (rehab_exercise_definition_id is not null and custom_name is null)
    or (rehab_exercise_definition_id is null and custom_name is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Clinician provenance (owner-isolated; name entry does not imply verification)
-- ---------------------------------------------------------------------------

create table if not exists public.rehab_clinician_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type public.rehab_clinician_source_type not null default 'self_entered',
  clinician_name text,
  clinic_name text,
  document_title text,
  document_date date,
  notes text,
  confirmed_by_user boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Rehab plans (templates) — never rewritten by session history
-- ---------------------------------------------------------------------------

create table if not exists public.rehab_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  body_area_id uuid references public.rehab_body_areas (id) on delete set null,
  side public.rehab_side not null default 'not_applicable',
  objective text,
  clinician_source_id uuid references public.rehab_clinician_sources (id) on delete set null,
  version integer not null default 1 check (version >= 1),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.rehab_plan_phases (
  id uuid primary key default gen_random_uuid(),
  rehab_plan_id uuid not null references public.rehab_plans (id) on delete cascade,
  name text not null,
  phase_type public.rehab_phase_type not null default 'custom',
  display_order integer not null default 0 check (display_order >= 0),
  start_date date,
  end_date date,
  clinician_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rehab_plan_id, display_order),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.rehab_plan_days (
  id uuid primary key default gen_random_uuid(),
  rehab_plan_phase_id uuid not null references public.rehab_plan_phases (id) on delete cascade,
  name text not null,
  day_index integer not null default 0 check (day_index >= 0),
  description text,
  estimated_duration_minutes integer check (estimated_duration_minutes is null or estimated_duration_minutes >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rehab_plan_phase_id, day_index)
);

create table if not exists public.rehab_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  rehab_plan_day_id uuid not null references public.rehab_plan_days (id) on delete cascade,
  rehab_exercise_definition_id uuid references public.rehab_exercise_definitions (id) on delete restrict,
  user_rehab_exercise_id uuid references public.user_rehab_exercises (id) on delete restrict,
  display_order integer not null default 0 check (display_order >= 0),
  side public.rehab_side not null default 'not_applicable',
  instructions_snapshot text not null default '',
  stop_conditions_snapshot text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rehab_plan_day_id, display_order),
  check (
    (rehab_exercise_definition_id is not null and user_rehab_exercise_id is null)
    or (rehab_exercise_definition_id is null and user_rehab_exercise_id is not null)
  )
);

create table if not exists public.rehab_set_prescriptions (
  id uuid primary key default gen_random_uuid(),
  rehab_plan_exercise_id uuid not null references public.rehab_plan_exercises (id) on delete cascade,
  set_index integer not null default 1 check (set_index >= 1),
  target_reps integer check (target_reps is null or target_reps >= 0),
  target_duration_seconds integer check (target_duration_seconds is null or target_duration_seconds >= 0),
  target_hold_seconds integer check (target_hold_seconds is null or target_hold_seconds >= 0),
  target_load numeric check (target_load is null or target_load >= 0),
  target_load_unit text,
  tempo_eccentric_seconds integer check (tempo_eccentric_seconds is null or tempo_eccentric_seconds >= 0),
  tempo_pause_bottom_seconds integer check (tempo_pause_bottom_seconds is null or tempo_pause_bottom_seconds >= 0),
  tempo_concentric_seconds integer check (tempo_concentric_seconds is null or tempo_concentric_seconds >= 0),
  tempo_pause_top_seconds integer check (tempo_pause_top_seconds is null or tempo_pause_top_seconds >= 0),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  assistance_type text,
  assistance_amount text,
  rom_min_degrees numeric check (rom_min_degrees is null or rom_min_degrees >= 0),
  rom_max_degrees numeric check (rom_max_degrees is null or rom_max_degrees >= 0),
  pain_limit smallint check (pain_limit is null or (pain_limit >= 0 and pain_limit <= 10)),
  completion_rule public.rehab_completion_rule not null default 'manual',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rehab_plan_exercise_id, set_index),
  check (rom_min_degrees is null or rom_max_degrees is null or rom_max_degrees >= rom_min_degrees)
);

create table if not exists public.rehab_restrictions (
  id uuid primary key default gen_random_uuid(),
  rehab_plan_id uuid not null references public.rehab_plans (id) on delete cascade,
  restriction_type public.rehab_restriction_type not null default 'custom',
  body_area_id uuid references public.rehab_body_areas (id) on delete set null,
  side public.rehab_side not null default 'not_applicable',
  value_text text not null,
  numeric_min numeric,
  numeric_max numeric,
  unit text,
  severity public.rehab_restriction_severity not null default 'informational',
  source text not null default 'user_entered',
  effective_from date not null default (timezone('utc', now()))::date,
  effective_until date,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_until is null or effective_until >= effective_from),
  check (numeric_min is null or numeric_max is null or numeric_max >= numeric_min)
);

-- ---------------------------------------------------------------------------
-- Scheduling: a plan day placed on a calendar date
-- ---------------------------------------------------------------------------

create table if not exists public.scheduled_rehab_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rehab_plan_day_id uuid references public.rehab_plan_days (id) on delete set null,
  local_date date not null,
  timezone text not null default 'UTC',
  title text not null,
  status public.scheduled_rehab_status not null default 'planned',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists scheduled_rehab_sessions_one_per_plan_day
  on public.scheduled_rehab_sessions (user_id, local_date, rehab_plan_day_id)
  where rehab_plan_day_id is not null;

create unique index if not exists scheduled_rehab_sessions_one_per_adhoc_title
  on public.scheduled_rehab_sessions (user_id, local_date, title)
  where rehab_plan_day_id is null;

-- ---------------------------------------------------------------------------
-- Performed history: sessions, exercises, sets, observations, alerts.
-- Snapshots preserve historical records regardless of later plan/catalog edits.
-- ---------------------------------------------------------------------------

create table if not exists public.rehab_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_rehab_session_id uuid references public.scheduled_rehab_sessions (id) on delete set null,
  source_plan_id uuid references public.rehab_plans (id) on delete set null,
  source_plan_version integer check (source_plan_version is null or source_plan_version >= 1),
  source_plan_day_id uuid references public.rehab_plan_days (id) on delete set null,
  daily_record_id uuid not null references public.daily_records (id) on delete restrict,
  title text not null,
  side public.rehab_side not null default 'not_applicable',
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  status public.rehab_session_status not null default 'in_progress',
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  version integer not null default 1 check (version >= 1),
  clinician_source_snapshot jsonb not null default '{}'::jsonb,
  restriction_snapshot_json jsonb not null default '{}'::jsonb,
  session_snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (completed_at is null or completed_at >= started_at)
);

create table if not exists public.rehab_session_exercises (
  id uuid primary key default gen_random_uuid(),
  rehab_session_id uuid not null references public.rehab_sessions (id) on delete cascade,
  source_exercise_id uuid,
  exercise_name_snapshot text not null,
  side public.rehab_side not null default 'not_applicable',
  exercise_order integer not null default 0 check (exercise_order >= 0),
  instructions_snapshot text not null default '',
  stop_conditions_snapshot text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rehab_session_id, exercise_order),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table if not exists public.rehab_sets (
  id uuid primary key default gen_random_uuid(),
  rehab_session_exercise_id uuid not null references public.rehab_session_exercises (id) on delete cascade,
  set_index integer not null default 1 check (set_index >= 1),
  status public.rehab_set_status not null default 'pending',
  side public.rehab_side not null default 'not_applicable',
  reps integer check (reps is null or reps >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  hold_seconds integer check (hold_seconds is null or hold_seconds >= 0),
  load numeric check (load is null or load >= 0),
  load_unit text,
  assistance_type text,
  assistance_amount text,
  rom_achieved numeric check (rom_achieved is null or rom_achieved >= 0),
  pain_before smallint check (pain_before is null or (pain_before >= 0 and pain_before <= 10)),
  pain_during smallint check (pain_during is null or (pain_during >= 0 and pain_during <= 10)),
  pain_after smallint check (pain_after is null or (pain_after >= 0 and pain_after <= 10)),
  swelling public.rehab_swelling_level,
  instability public.rehab_instability_level,
  confidence smallint check (confidence is null or (confidence >= 0 and confidence <= 10)),
  tempo_snapshot text,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rehab_session_exercise_id, set_index)
);

create table if not exists public.rehab_session_observations (
  id uuid primary key default gen_random_uuid(),
  rehab_session_id uuid not null references public.rehab_sessions (id) on delete cascade,
  observation_type public.rehab_observation_type not null default 'general',
  body_area text,
  side public.rehab_side not null default 'not_applicable',
  value_numeric numeric,
  value_text text,
  severity public.rehab_restriction_severity not null default 'informational',
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rehab_alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rehab_session_id uuid not null references public.rehab_sessions (id) on delete cascade,
  rehab_set_id uuid references public.rehab_sets (id) on delete set null,
  alert_type public.rehab_alert_type not null default 'other',
  severity public.rehab_restriction_severity not null default 'caution',
  message_snapshot text not null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists rehab_exercise_definitions_normalized_name_idx
  on public.rehab_exercise_definitions (normalized_name);
create index if not exists rehab_exercise_definitions_body_area_idx
  on public.rehab_exercise_definitions (body_area_id);
create index if not exists rehab_exercise_definitions_movement_idx
  on public.rehab_exercise_definitions (movement_id);
create index if not exists rehab_exercise_definitions_active_idx
  on public.rehab_exercise_definitions (active);
create index if not exists rehab_exercise_aliases_normalized_alias_idx
  on public.rehab_exercise_aliases (normalized_alias);

create index if not exists user_rehab_exercises_user_id_idx on public.user_rehab_exercises (user_id);
create index if not exists user_rehab_exercises_definition_idx
  on public.user_rehab_exercises (rehab_exercise_definition_id);

create index if not exists rehab_clinician_sources_user_id_idx
  on public.rehab_clinician_sources (user_id, updated_at desc);

create index if not exists rehab_plans_user_active_idx
  on public.rehab_plans (user_id, updated_at desc)
  where deleted_at is null;
create index if not exists rehab_plan_phases_plan_idx
  on public.rehab_plan_phases (rehab_plan_id, display_order);
create index if not exists rehab_plan_days_phase_idx
  on public.rehab_plan_days (rehab_plan_phase_id, day_index);
create index if not exists rehab_plan_exercises_day_idx
  on public.rehab_plan_exercises (rehab_plan_day_id, display_order);
create index if not exists rehab_plan_exercises_definition_idx
  on public.rehab_plan_exercises (rehab_exercise_definition_id);
create index if not exists rehab_plan_exercises_user_exercise_idx
  on public.rehab_plan_exercises (user_rehab_exercise_id);
create index if not exists rehab_set_prescriptions_plan_exercise_idx
  on public.rehab_set_prescriptions (rehab_plan_exercise_id, set_index);
create index if not exists rehab_restrictions_plan_idx
  on public.rehab_restrictions (rehab_plan_id, active, effective_from desc);

create index if not exists scheduled_rehab_sessions_user_date_idx
  on public.scheduled_rehab_sessions (user_id, local_date desc);
create index if not exists scheduled_rehab_sessions_plan_day_idx
  on public.scheduled_rehab_sessions (rehab_plan_day_id);

create index if not exists rehab_sessions_user_started_idx
  on public.rehab_sessions (user_id, started_at desc);
create index if not exists rehab_sessions_daily_record_idx on public.rehab_sessions (daily_record_id);
create index if not exists rehab_sessions_scheduled_idx
  on public.rehab_sessions (scheduled_rehab_session_id);
create index if not exists rehab_session_exercises_session_idx
  on public.rehab_session_exercises (rehab_session_id, exercise_order);
create index if not exists rehab_sets_session_exercise_idx
  on public.rehab_sets (rehab_session_exercise_id, set_index);
create index if not exists rehab_session_observations_session_idx
  on public.rehab_session_observations (rehab_session_id, recorded_at desc);
create index if not exists rehab_alert_events_user_created_idx
  on public.rehab_alert_events (user_id, created_at desc);
create index if not exists rehab_alert_events_session_idx
  on public.rehab_alert_events (rehab_session_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_updated_at() from Increment 3)
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'rehab_exercise_definitions', 'rehab_exercise_aliases', 'user_rehab_exercises',
    'rehab_clinician_sources', 'rehab_plans', 'rehab_plan_phases', 'rehab_plan_days',
    'rehab_plan_exercises', 'rehab_set_prescriptions', 'rehab_restrictions',
    'scheduled_rehab_sessions', 'rehab_sessions', 'rehab_session_exercises', 'rehab_sets'
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

alter table public.rehab_body_areas enable row level security;
alter table public.rehab_movements enable row level security;
alter table public.rehab_exercise_definitions enable row level security;
alter table public.rehab_exercise_aliases enable row level security;
alter table public.user_rehab_exercises enable row level security;
alter table public.rehab_clinician_sources enable row level security;
alter table public.rehab_plans enable row level security;
alter table public.rehab_plan_phases enable row level security;
alter table public.rehab_plan_days enable row level security;
alter table public.rehab_plan_exercises enable row level security;
alter table public.rehab_set_prescriptions enable row level security;
alter table public.rehab_restrictions enable row level security;
alter table public.scheduled_rehab_sessions enable row level security;
alter table public.rehab_sessions enable row level security;
alter table public.rehab_session_exercises enable row level security;
alter table public.rehab_sets enable row level security;
alter table public.rehab_session_observations enable row level security;
alter table public.rehab_alert_events enable row level security;

-- System catalog: authenticated-read only.
create policy rehab_body_areas_select_authenticated on public.rehab_body_areas
  for select to authenticated using (true);
create policy rehab_movements_select_authenticated on public.rehab_movements
  for select to authenticated using (true);

create policy rehab_exercise_definitions_select_active on public.rehab_exercise_definitions
  for select to authenticated using (active);

create policy rehab_exercise_aliases_select_active_exercise on public.rehab_exercise_aliases
  for select to authenticated using (
    exists (
      select 1 from public.rehab_exercise_definitions red
      where red.id = rehab_exercise_definition_id and red.active
    )
  );

-- user_rehab_exercises: owner-only CRUD
create policy user_rehab_exercises_select_own on public.user_rehab_exercises
  for select to authenticated using (user_id = auth.uid());
create policy user_rehab_exercises_insert_own on public.user_rehab_exercises
  for insert to authenticated with check (user_id = auth.uid());
create policy user_rehab_exercises_update_own on public.user_rehab_exercises
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_rehab_exercises_delete_own on public.user_rehab_exercises
  for delete to authenticated using (user_id = auth.uid());

-- rehab_clinician_sources: owner-only CRUD
create policy rehab_clinician_sources_select_own on public.rehab_clinician_sources
  for select to authenticated using (user_id = auth.uid());
create policy rehab_clinician_sources_insert_own on public.rehab_clinician_sources
  for insert to authenticated with check (user_id = auth.uid());
create policy rehab_clinician_sources_update_own on public.rehab_clinician_sources
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rehab_clinician_sources_delete_own on public.rehab_clinician_sources
  for delete to authenticated using (user_id = auth.uid());

-- rehab_plans: owner-only CRUD; soft-deleted plans invisible via select/update
create policy rehab_plans_select_own on public.rehab_plans
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy rehab_plans_insert_own on public.rehab_plans
  for insert to authenticated with check (user_id = auth.uid());
create policy rehab_plans_update_own on public.rehab_plans
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy rehab_plans_delete_own on public.rehab_plans
  for delete to authenticated using (user_id = auth.uid());

-- rehab_plan_phases: ownership via parent plan
create policy rehab_plan_phases_select_own on public.rehab_plan_phases
  for select to authenticated using (
    exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid())
  );
create policy rehab_plan_phases_insert_own on public.rehab_plan_phases
  for insert to authenticated with check (
    exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid())
  );
create policy rehab_plan_phases_update_own on public.rehab_plan_phases
  for update to authenticated
  using (exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid()))
  with check (exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid()));
create policy rehab_plan_phases_delete_own on public.rehab_plan_phases
  for delete to authenticated using (
    exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid())
  );

-- rehab_plan_days: ownership via phase -> plan
create policy rehab_plan_days_select_own on public.rehab_plan_days
  for select to authenticated using (
    exists (
      select 1 from public.rehab_plan_phases rpp
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpp.id = rehab_plan_phase_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_plan_days_insert_own on public.rehab_plan_days
  for insert to authenticated with check (
    exists (
      select 1 from public.rehab_plan_phases rpp
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpp.id = rehab_plan_phase_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_plan_days_update_own on public.rehab_plan_days
  for update to authenticated
  using (
    exists (
      select 1 from public.rehab_plan_phases rpp
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpp.id = rehab_plan_phase_id and rp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rehab_plan_phases rpp
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpp.id = rehab_plan_phase_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_plan_days_delete_own on public.rehab_plan_days
  for delete to authenticated using (
    exists (
      select 1 from public.rehab_plan_phases rpp
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpp.id = rehab_plan_phase_id and rp.user_id = auth.uid()
    )
  );

-- rehab_plan_exercises: ownership via day -> phase -> plan
create policy rehab_plan_exercises_select_own on public.rehab_plan_exercises
  for select to authenticated using (
    exists (
      select 1 from public.rehab_plan_days rpd
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpd.id = rehab_plan_day_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_plan_exercises_insert_own on public.rehab_plan_exercises
  for insert to authenticated with check (
    exists (
      select 1 from public.rehab_plan_days rpd
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpd.id = rehab_plan_day_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_plan_exercises_update_own on public.rehab_plan_exercises
  for update to authenticated
  using (
    exists (
      select 1 from public.rehab_plan_days rpd
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpd.id = rehab_plan_day_id and rp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rehab_plan_days rpd
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpd.id = rehab_plan_day_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_plan_exercises_delete_own on public.rehab_plan_exercises
  for delete to authenticated using (
    exists (
      select 1 from public.rehab_plan_days rpd
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpd.id = rehab_plan_day_id and rp.user_id = auth.uid()
    )
  );

-- rehab_set_prescriptions: ownership via plan exercise -> day -> phase -> plan
create policy rehab_set_prescriptions_select_own on public.rehab_set_prescriptions
  for select to authenticated using (
    exists (
      select 1 from public.rehab_plan_exercises rpe
      join public.rehab_plan_days rpd on rpd.id = rpe.rehab_plan_day_id
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpe.id = rehab_plan_exercise_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_set_prescriptions_insert_own on public.rehab_set_prescriptions
  for insert to authenticated with check (
    exists (
      select 1 from public.rehab_plan_exercises rpe
      join public.rehab_plan_days rpd on rpd.id = rpe.rehab_plan_day_id
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpe.id = rehab_plan_exercise_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_set_prescriptions_update_own on public.rehab_set_prescriptions
  for update to authenticated
  using (
    exists (
      select 1 from public.rehab_plan_exercises rpe
      join public.rehab_plan_days rpd on rpd.id = rpe.rehab_plan_day_id
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpe.id = rehab_plan_exercise_id and rp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rehab_plan_exercises rpe
      join public.rehab_plan_days rpd on rpd.id = rpe.rehab_plan_day_id
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpe.id = rehab_plan_exercise_id and rp.user_id = auth.uid()
    )
  );
create policy rehab_set_prescriptions_delete_own on public.rehab_set_prescriptions
  for delete to authenticated using (
    exists (
      select 1 from public.rehab_plan_exercises rpe
      join public.rehab_plan_days rpd on rpd.id = rpe.rehab_plan_day_id
      join public.rehab_plan_phases rpp on rpp.id = rpd.rehab_plan_phase_id
      join public.rehab_plans rp on rp.id = rpp.rehab_plan_id
      where rpe.id = rehab_plan_exercise_id and rp.user_id = auth.uid()
    )
  );

-- rehab_restrictions: ownership via plan
create policy rehab_restrictions_select_own on public.rehab_restrictions
  for select to authenticated using (
    exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid())
  );
create policy rehab_restrictions_insert_own on public.rehab_restrictions
  for insert to authenticated with check (
    exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid())
  );
create policy rehab_restrictions_update_own on public.rehab_restrictions
  for update to authenticated
  using (exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid()))
  with check (exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid()));
create policy rehab_restrictions_delete_own on public.rehab_restrictions
  for delete to authenticated using (
    exists (select 1 from public.rehab_plans rp where rp.id = rehab_plan_id and rp.user_id = auth.uid())
  );

-- scheduled_rehab_sessions: owner-only CRUD
create policy scheduled_rehab_sessions_select_own on public.scheduled_rehab_sessions
  for select to authenticated using (user_id = auth.uid());
create policy scheduled_rehab_sessions_insert_own on public.scheduled_rehab_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy scheduled_rehab_sessions_update_own on public.scheduled_rehab_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy scheduled_rehab_sessions_delete_own on public.scheduled_rehab_sessions
  for delete to authenticated using (user_id = auth.uid());

-- rehab_sessions: owner-only CRUD, defense-in-depth check on the linked daily_record
create policy rehab_sessions_select_own on public.rehab_sessions
  for select to authenticated using (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy rehab_sessions_insert_own on public.rehab_sessions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy rehab_sessions_update_own on public.rehab_sessions
  for update to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy rehab_sessions_delete_own on public.rehab_sessions
  for delete to authenticated using (user_id = auth.uid());

-- rehab_session_exercises: ownership via session
create policy rehab_session_exercises_select_own on public.rehab_session_exercises
  for select to authenticated using (
    exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );
create policy rehab_session_exercises_insert_own on public.rehab_session_exercises
  for insert to authenticated with check (
    exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );
create policy rehab_session_exercises_update_own on public.rehab_session_exercises
  for update to authenticated
  using (exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid()))
  with check (exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid()));
create policy rehab_session_exercises_delete_own on public.rehab_session_exercises
  for delete to authenticated using (
    exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );

-- rehab_sets: ownership via session exercise -> session
create policy rehab_sets_select_own on public.rehab_sets
  for select to authenticated using (
    exists (
      select 1 from public.rehab_session_exercises rse
      join public.rehab_sessions rs on rs.id = rse.rehab_session_id
      where rse.id = rehab_session_exercise_id and rs.user_id = auth.uid()
    )
  );
create policy rehab_sets_insert_own on public.rehab_sets
  for insert to authenticated with check (
    exists (
      select 1 from public.rehab_session_exercises rse
      join public.rehab_sessions rs on rs.id = rse.rehab_session_id
      where rse.id = rehab_session_exercise_id and rs.user_id = auth.uid()
    )
  );
create policy rehab_sets_update_own on public.rehab_sets
  for update to authenticated
  using (
    exists (
      select 1 from public.rehab_session_exercises rse
      join public.rehab_sessions rs on rs.id = rse.rehab_session_id
      where rse.id = rehab_session_exercise_id and rs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rehab_session_exercises rse
      join public.rehab_sessions rs on rs.id = rse.rehab_session_id
      where rse.id = rehab_session_exercise_id and rs.user_id = auth.uid()
    )
  );
create policy rehab_sets_delete_own on public.rehab_sets
  for delete to authenticated using (
    exists (
      select 1 from public.rehab_session_exercises rse
      join public.rehab_sessions rs on rs.id = rse.rehab_session_id
      where rse.id = rehab_session_exercise_id and rs.user_id = auth.uid()
    )
  );

-- rehab_session_observations: ownership via session
create policy rehab_session_observations_select_own on public.rehab_session_observations
  for select to authenticated using (
    exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );
create policy rehab_session_observations_insert_own on public.rehab_session_observations
  for insert to authenticated with check (
    exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );
create policy rehab_session_observations_update_own on public.rehab_session_observations
  for update to authenticated
  using (exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid()))
  with check (exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid()));
create policy rehab_session_observations_delete_own on public.rehab_session_observations
  for delete to authenticated using (
    exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );

-- rehab_alert_events: owner-only, plus session ownership check
create policy rehab_alert_events_select_own on public.rehab_alert_events
  for select to authenticated using (
    user_id = auth.uid()
    and exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );
create policy rehab_alert_events_insert_own on public.rehab_alert_events
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );
create policy rehab_alert_events_update_own on public.rehab_alert_events
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.rehab_sessions rs where rs.id = rehab_session_id and rs.user_id = auth.uid())
  );
create policy rehab_alert_events_delete_own on public.rehab_alert_events
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges. System catalog tables are read-only for authenticated clients.
-- ---------------------------------------------------------------------------

grant select on public.rehab_body_areas, public.rehab_movements,
  public.rehab_exercise_definitions, public.rehab_exercise_aliases
  to authenticated;

grant select, insert, update, delete on public.user_rehab_exercises,
  public.rehab_clinician_sources, public.rehab_plans, public.rehab_plan_phases,
  public.rehab_plan_days, public.rehab_plan_exercises, public.rehab_set_prescriptions,
  public.rehab_restrictions, public.scheduled_rehab_sessions, public.rehab_sessions,
  public.rehab_session_exercises, public.rehab_sets, public.rehab_session_observations,
  public.rehab_alert_events
  to authenticated;

grant all on public.rehab_body_areas, public.rehab_movements,
  public.rehab_exercise_definitions, public.rehab_exercise_aliases,
  public.user_rehab_exercises, public.rehab_clinician_sources, public.rehab_plans,
  public.rehab_plan_phases, public.rehab_plan_days, public.rehab_plan_exercises,
  public.rehab_set_prescriptions, public.rehab_restrictions, public.scheduled_rehab_sessions,
  public.rehab_sessions, public.rehab_session_exercises, public.rehab_sets,
  public.rehab_session_observations, public.rehab_alert_events
  to service_role;

-- ---------------------------------------------------------------------------
-- Soft-delete helper. Authenticated UPDATE cannot set deleted_at while SELECT
-- policies require deleted_at IS NULL (PostgREST RETURNING / RLS interaction).
-- Archive goes through this owner-checked security definer function instead.
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into plan_row
  from public.rehab_plans
  where id = p_plan_id
    and user_id = auth.uid()
    and deleted_at is null
  for update;

  if not found then
    raise exception 'rehab plan not found';
  end if;

  if plan_row.version is distinct from p_expected_version then
    raise exception 'stale rehab plan version' using errcode = 'P0001';
  end if;

  update public.rehab_plans
  set
    active = false,
    deleted_at = timezone('utc', now()),
    version = plan_row.version + 1,
    updated_at = timezone('utc', now())
  where id = plan_row.id
  returning * into plan_row;

  return plan_row;
end;
$$;

revoke all on function public.archive_rehab_plan(uuid, integer) from public;
grant execute on function public.archive_rehab_plan(uuid, integer) to authenticated;
