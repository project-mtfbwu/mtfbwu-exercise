-- Increment 6: exercise catalog + workout engine (plans, scheduling, sessions).
-- Curated exercise catalog seed data belongs in a separate migration.
-- Templates/plans (workout_plans and children) are intentionally separate
-- from performed history (workout_sessions and children); editing a plan
-- never rewrites a session that already snapshotted its exercise names.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.exercise_type as enum (
    'strength', 'cardio', 'mobility', 'plyometric', 'isometric', 'balance', 'conditioning', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.exercise_source as enum ('mtfbwu_curated', 'free_exercise_db', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.exercise_muscle_role as enum ('primary', 'secondary', 'stabilizer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workout_block_type as enum (
    'warmup', 'straight_sets', 'superset', 'circuit', 'amrap', 'emom', 'for_time', 'drop_set', 'cooldown'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workout_set_role as enum (
    'warmup', 'working', 'top_set', 'backoff', 'drop_set', 'amrap'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workout_set_completion_rule as enum (
    'fixed_reps', 'rep_range', 'time_based', 'distance_based', 'amrap_to_failure'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.scheduled_workout_status as enum (
    'planned', 'completed', 'skipped', 'missed', 'rescheduled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workout_session_status as enum ('in_progress', 'paused', 'completed', 'discarded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workout_set_status as enum ('pending', 'completed', 'skipped', 'failed');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Exercise taxonomy + catalog (system catalog: read-only for authenticated)
-- ---------------------------------------------------------------------------

create table if not exists public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.equipment_types (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.movement_patterns (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercise_definitions (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name text not null,
  normalized_name text not null,
  description text,
  exercise_type public.exercise_type not null default 'strength',
  movement_pattern_id uuid references public.movement_patterns (id) on delete set null,
  primary_equipment_id uuid references public.equipment_types (id) on delete set null,
  unilateral boolean not null default false,
  bodyweight boolean not null default false,
  timed boolean not null default false,
  distance_based boolean not null default false,
  source public.exercise_source not null default 'mtfbwu_curated',
  source_id text,
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  exercise_definition_id uuid not null references public.exercise_definitions (id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (exercise_definition_id, normalized_alias)
);

-- A muscle can be involved in more than one role, but never twice in the same
-- role for the same exercise, hence the composite primary key.
create table if not exists public.exercise_muscle_groups (
  exercise_definition_id uuid not null references public.exercise_definitions (id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups (id) on delete restrict,
  role public.exercise_muscle_role not null default 'primary',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (exercise_definition_id, muscle_group_id, role)
);

-- ---------------------------------------------------------------------------
-- User-owned exercises: either a private note/video wrapper around a catalog
-- exercise (exercise_definition_id set) or a fully custom movement
-- (custom_name set). Never both, never neither.
-- ---------------------------------------------------------------------------

create table if not exists public.user_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_definition_id uuid references public.exercise_definitions (id) on delete restrict,
  custom_name text,
  private_notes text,
  custom_video_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (exercise_definition_id is not null and custom_name is null)
    or (exercise_definition_id is null and custom_name is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Workout plans (templates) — never rewritten by session history
-- ---------------------------------------------------------------------------

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  objective text,
  version integer not null default 1 check (version >= 1),
  active boolean not null default true,
  source text not null default 'user_created',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans (id) on delete cascade,
  name text not null default '',
  day_of_week smallint check (day_of_week is null or (day_of_week >= 0 and day_of_week <= 6)),
  sort_order integer not null default 0 check (sort_order >= 0),
  rest_day boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workout_plan_id, sort_order)
);

create table if not exists public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_plan_day_id uuid not null references public.workout_plan_days (id) on delete cascade,
  block_type public.workout_block_type not null default 'straight_sets',
  title text,
  sort_order integer not null default 0 check (sort_order >= 0),
  rounds integer check (rounds is null or rounds > 0),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workout_plan_day_id, sort_order)
);

create table if not exists public.workout_block_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_block_id uuid not null references public.workout_blocks (id) on delete cascade,
  exercise_definition_id uuid references public.exercise_definitions (id) on delete restrict,
  user_exercise_id uuid references public.user_exercises (id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workout_block_id, sort_order),
  check (
    (exercise_definition_id is not null and user_exercise_id is null)
    or (exercise_definition_id is null and user_exercise_id is not null)
  )
);

create table if not exists public.workout_set_prescriptions (
  id uuid primary key default gen_random_uuid(),
  workout_block_exercise_id uuid not null references public.workout_block_exercises (id) on delete cascade,
  set_index integer not null default 1 check (set_index >= 1),
  set_role public.workout_set_role not null default 'working',
  completion_rule public.workout_set_completion_rule not null default 'fixed_reps',
  target_reps_min integer check (target_reps_min is null or target_reps_min >= 0),
  target_reps_max integer check (target_reps_max is null or target_reps_max >= 0),
  target_weight_kg numeric check (target_weight_kg is null or target_weight_kg >= 0),
  target_duration_seconds integer check (target_duration_seconds is null or target_duration_seconds >= 0),
  target_distance_meters numeric check (target_distance_meters is null or target_distance_meters >= 0),
  target_rpe numeric check (target_rpe is null or (target_rpe >= 0 and target_rpe <= 10)),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workout_block_exercise_id, set_index),
  check (target_reps_min is null or target_reps_max is null or target_reps_max >= target_reps_min),
  check (completion_rule <> 'time_based' or target_duration_seconds is not null),
  check (completion_rule <> 'distance_based' or target_distance_meters is not null)
);

-- ---------------------------------------------------------------------------
-- Scheduling: a plan day (or an ad-hoc title) placed on a calendar date
-- ---------------------------------------------------------------------------

create table if not exists public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_plan_id uuid references public.workout_plans (id) on delete set null,
  workout_plan_day_id uuid references public.workout_plan_days (id) on delete set null,
  local_date date not null,
  title text not null,
  status public.scheduled_workout_status not null default 'planned',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Two mutually exclusive uniqueness rules: at most one scheduled entry per
-- plan day per date, and at most one ad-hoc (no plan day) entry per title per date.
create unique index if not exists scheduled_workouts_one_per_plan_day
  on public.scheduled_workouts (user_id, local_date, workout_plan_day_id)
  where workout_plan_day_id is not null;

create unique index if not exists scheduled_workouts_one_per_adhoc_title
  on public.scheduled_workouts (user_id, local_date, title)
  where workout_plan_day_id is null;

-- ---------------------------------------------------------------------------
-- Performed history: sessions, exercises, sets, notes, and PRs.
-- These snapshot names/targets at time of performance and are never rewritten
-- by later plan edits.
-- ---------------------------------------------------------------------------

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_record_id uuid not null references public.daily_records (id) on delete restrict,
  scheduled_workout_id uuid references public.scheduled_workouts (id) on delete set null,
  workout_plan_id uuid references public.workout_plans (id) on delete set null,
  workout_plan_day_id uuid references public.workout_plan_days (id) on delete set null,
  status public.workout_session_status not null default 'in_progress',
  version integer not null default 1 check (version >= 1),
  snapshot_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (completed_at is null or completed_at >= started_at)
);

-- exercise_definition_id / user_exercise_id are set null (not restricted) on
-- delete: display_name_snapshot preserves the historical record regardless of
-- whether the catalog row or custom exercise still exists.
create table if not exists public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_definition_id uuid references public.exercise_definitions (id) on delete set null,
  user_exercise_id uuid references public.user_exercises (id) on delete set null,
  display_name_snapshot text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workout_session_id, sort_order),
  check (exercise_definition_id is null or user_exercise_id is null)
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_session_exercise_id uuid not null references public.workout_session_exercises (id) on delete cascade,
  set_index integer not null default 1 check (set_index >= 1),
  set_role public.workout_set_role not null default 'working',
  status public.workout_set_status not null default 'pending',
  reps integer check (reps is null or reps >= 0),
  weight_kg numeric check (weight_kg is null or weight_kg >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  distance_meters numeric check (distance_meters is null or distance_meters >= 0),
  rpe numeric check (rpe is null or (rpe >= 0 and rpe <= 10)),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workout_session_exercise_id, set_index)
);

create table if not exists public.workout_session_notes (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- exercise_label_snapshot keeps a PR's exercise name legible even if the
-- underlying catalog/custom exercise is later deactivated or removed.
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_definition_id uuid references public.exercise_definitions (id) on delete set null,
  user_exercise_id uuid references public.user_exercises (id) on delete set null,
  exercise_label_snapshot text not null,
  record_type text not null,
  value numeric not null check (value >= 0),
  unit text not null,
  achieved_at timestamptz not null default timezone('utc', now()),
  workout_set_id uuid references public.workout_sets (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (exercise_definition_id is null or user_exercise_id is null)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists exercise_definitions_normalized_name_idx on public.exercise_definitions (normalized_name);
create index if not exists exercise_definitions_movement_pattern_idx on public.exercise_definitions (movement_pattern_id);
create index if not exists exercise_definitions_primary_equipment_idx on public.exercise_definitions (primary_equipment_id);
create index if not exists exercise_definitions_active_idx on public.exercise_definitions (active);
create index if not exists exercise_aliases_normalized_alias_idx on public.exercise_aliases (normalized_alias);
create index if not exists exercise_muscle_groups_muscle_group_idx on public.exercise_muscle_groups (muscle_group_id);

create index if not exists user_exercises_user_id_idx on public.user_exercises (user_id);
create index if not exists user_exercises_exercise_definition_idx on public.user_exercises (exercise_definition_id);

create index if not exists workout_plans_user_active_idx
  on public.workout_plans (user_id, updated_at desc)
  where deleted_at is null;
create index if not exists workout_plan_days_plan_idx on public.workout_plan_days (workout_plan_id, sort_order);
create index if not exists workout_blocks_plan_day_idx on public.workout_blocks (workout_plan_day_id, sort_order);
create index if not exists workout_block_exercises_block_idx on public.workout_block_exercises (workout_block_id, sort_order);
create index if not exists workout_block_exercises_exercise_definition_idx
  on public.workout_block_exercises (exercise_definition_id);
create index if not exists workout_block_exercises_user_exercise_idx
  on public.workout_block_exercises (user_exercise_id);
create index if not exists workout_set_prescriptions_block_exercise_idx
  on public.workout_set_prescriptions (workout_block_exercise_id, set_index);

create index if not exists scheduled_workouts_user_date_idx on public.scheduled_workouts (user_id, local_date desc);
create index if not exists scheduled_workouts_plan_idx on public.scheduled_workouts (workout_plan_id);

create index if not exists workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index if not exists workout_sessions_daily_record_idx on public.workout_sessions (daily_record_id);
create index if not exists workout_sessions_scheduled_workout_idx on public.workout_sessions (scheduled_workout_id);
create index if not exists workout_session_exercises_session_idx
  on public.workout_session_exercises (workout_session_id, sort_order);
create index if not exists workout_sets_session_exercise_idx
  on public.workout_sets (workout_session_exercise_id, set_index);
create index if not exists workout_session_notes_session_idx on public.workout_session_notes (workout_session_id);

create index if not exists personal_records_user_achieved_idx on public.personal_records (user_id, achieved_at desc);
create index if not exists personal_records_exercise_definition_idx on public.personal_records (exercise_definition_id);
create index if not exists personal_records_user_exercise_idx on public.personal_records (user_exercise_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_updated_at() from Increment 3)
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'exercise_definitions', 'exercise_aliases', 'user_exercises',
    'workout_plans', 'workout_plan_days', 'workout_blocks', 'workout_block_exercises',
    'workout_set_prescriptions', 'scheduled_workouts', 'workout_sessions',
    'workout_session_exercises', 'workout_sets', 'workout_session_notes', 'personal_records'
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

alter table public.muscle_groups enable row level security;
alter table public.equipment_types enable row level security;
alter table public.movement_patterns enable row level security;
alter table public.exercise_definitions enable row level security;
alter table public.exercise_aliases enable row level security;
alter table public.exercise_muscle_groups enable row level security;
alter table public.user_exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_days enable row level security;
alter table public.workout_blocks enable row level security;
alter table public.workout_block_exercises enable row level security;
alter table public.workout_set_prescriptions enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_session_notes enable row level security;
alter table public.personal_records enable row level security;

-- System catalog: authenticated-read only, no insert/update/delete policy at
-- all (combined with the absence of write grants below, writes fail closed).
create policy muscle_groups_select_authenticated on public.muscle_groups
  for select to authenticated using (true);
create policy equipment_types_select_authenticated on public.equipment_types
  for select to authenticated using (true);
create policy movement_patterns_select_authenticated on public.movement_patterns
  for select to authenticated using (true);

create policy exercise_definitions_select_active on public.exercise_definitions
  for select to authenticated using (active);

create policy exercise_aliases_select_active_exercise on public.exercise_aliases
  for select to authenticated using (
    exists (
      select 1 from public.exercise_definitions ed
      where ed.id = exercise_definition_id and ed.active
    )
  );

create policy exercise_muscle_groups_select_active_exercise on public.exercise_muscle_groups
  for select to authenticated using (
    exists (
      select 1 from public.exercise_definitions ed
      where ed.id = exercise_definition_id and ed.active
    )
  );

-- user_exercises: owner-only CRUD
create policy user_exercises_select_own on public.user_exercises
  for select to authenticated using (user_id = auth.uid());
create policy user_exercises_insert_own on public.user_exercises
  for insert to authenticated with check (user_id = auth.uid());
create policy user_exercises_update_own on public.user_exercises
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_exercises_delete_own on public.user_exercises
  for delete to authenticated using (user_id = auth.uid());

-- workout_plans: owner-only CRUD; soft-deleted plans are invisible via select/update
create policy workout_plans_select_own on public.workout_plans
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy workout_plans_insert_own on public.workout_plans
  for insert to authenticated with check (user_id = auth.uid());
create policy workout_plans_update_own on public.workout_plans
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy workout_plans_delete_own on public.workout_plans
  for delete to authenticated using (user_id = auth.uid());

-- workout_plan_days: ownership via parent plan
create policy workout_plan_days_select_own on public.workout_plan_days
  for select to authenticated using (
    exists (select 1 from public.workout_plans wp where wp.id = workout_plan_id and wp.user_id = auth.uid())
  );
create policy workout_plan_days_insert_own on public.workout_plan_days
  for insert to authenticated with check (
    exists (select 1 from public.workout_plans wp where wp.id = workout_plan_id and wp.user_id = auth.uid())
  );
create policy workout_plan_days_update_own on public.workout_plan_days
  for update to authenticated
  using (exists (select 1 from public.workout_plans wp where wp.id = workout_plan_id and wp.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_plans wp where wp.id = workout_plan_id and wp.user_id = auth.uid()));
create policy workout_plan_days_delete_own on public.workout_plan_days
  for delete to authenticated using (
    exists (select 1 from public.workout_plans wp where wp.id = workout_plan_id and wp.user_id = auth.uid())
  );

-- workout_blocks: ownership via plan day -> plan
create policy workout_blocks_select_own on public.workout_blocks
  for select to authenticated using (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  );
create policy workout_blocks_insert_own on public.workout_blocks
  for insert to authenticated with check (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  );
create policy workout_blocks_update_own on public.workout_blocks
  for update to authenticated
  using (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  );
create policy workout_blocks_delete_own on public.workout_blocks
  for delete to authenticated using (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  );

-- workout_block_exercises: ownership via block -> plan day -> plan
create policy workout_block_exercises_select_own on public.workout_block_exercises
  for select to authenticated using (
    exists (
      select 1 from public.workout_blocks wb
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wb.id = workout_block_id and wp.user_id = auth.uid()
    )
  );
create policy workout_block_exercises_insert_own on public.workout_block_exercises
  for insert to authenticated with check (
    exists (
      select 1 from public.workout_blocks wb
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wb.id = workout_block_id and wp.user_id = auth.uid()
    )
  );
create policy workout_block_exercises_update_own on public.workout_block_exercises
  for update to authenticated
  using (
    exists (
      select 1 from public.workout_blocks wb
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wb.id = workout_block_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_blocks wb
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wb.id = workout_block_id and wp.user_id = auth.uid()
    )
  );
create policy workout_block_exercises_delete_own on public.workout_block_exercises
  for delete to authenticated using (
    exists (
      select 1 from public.workout_blocks wb
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wb.id = workout_block_id and wp.user_id = auth.uid()
    )
  );

-- workout_set_prescriptions: ownership via block exercise -> block -> plan day -> plan
create policy workout_set_prescriptions_select_own on public.workout_set_prescriptions
  for select to authenticated using (
    exists (
      select 1 from public.workout_block_exercises wbe
      join public.workout_blocks wb on wb.id = wbe.workout_block_id
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wbe.id = workout_block_exercise_id and wp.user_id = auth.uid()
    )
  );
create policy workout_set_prescriptions_insert_own on public.workout_set_prescriptions
  for insert to authenticated with check (
    exists (
      select 1 from public.workout_block_exercises wbe
      join public.workout_blocks wb on wb.id = wbe.workout_block_id
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wbe.id = workout_block_exercise_id and wp.user_id = auth.uid()
    )
  );
create policy workout_set_prescriptions_update_own on public.workout_set_prescriptions
  for update to authenticated
  using (
    exists (
      select 1 from public.workout_block_exercises wbe
      join public.workout_blocks wb on wb.id = wbe.workout_block_id
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wbe.id = workout_block_exercise_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_block_exercises wbe
      join public.workout_blocks wb on wb.id = wbe.workout_block_id
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wbe.id = workout_block_exercise_id and wp.user_id = auth.uid()
    )
  );
create policy workout_set_prescriptions_delete_own on public.workout_set_prescriptions
  for delete to authenticated using (
    exists (
      select 1 from public.workout_block_exercises wbe
      join public.workout_blocks wb on wb.id = wbe.workout_block_id
      join public.workout_plan_days wpd on wpd.id = wb.workout_plan_day_id
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wbe.id = workout_block_exercise_id and wp.user_id = auth.uid()
    )
  );

-- scheduled_workouts: owner-only CRUD
create policy scheduled_workouts_select_own on public.scheduled_workouts
  for select to authenticated using (user_id = auth.uid());
create policy scheduled_workouts_insert_own on public.scheduled_workouts
  for insert to authenticated with check (user_id = auth.uid());
create policy scheduled_workouts_update_own on public.scheduled_workouts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy scheduled_workouts_delete_own on public.scheduled_workouts
  for delete to authenticated using (user_id = auth.uid());

-- workout_sessions: owner-only CRUD, defense-in-depth check on the linked daily_record
create policy workout_sessions_select_own on public.workout_sessions
  for select to authenticated using (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy workout_sessions_insert_own on public.workout_sessions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy workout_sessions_update_own on public.workout_sessions
  for update to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_records dr where dr.id = daily_record_id and dr.user_id = auth.uid())
  );
create policy workout_sessions_delete_own on public.workout_sessions
  for delete to authenticated using (user_id = auth.uid());

-- workout_session_exercises: ownership via session
create policy workout_session_exercises_select_own on public.workout_session_exercises
  for select to authenticated using (
    exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid())
  );
create policy workout_session_exercises_insert_own on public.workout_session_exercises
  for insert to authenticated with check (
    exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid())
  );
create policy workout_session_exercises_update_own on public.workout_session_exercises
  for update to authenticated
  using (exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid()));
create policy workout_session_exercises_delete_own on public.workout_session_exercises
  for delete to authenticated using (
    exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid())
  );

-- workout_sets: ownership via session exercise -> session
create policy workout_sets_select_own on public.workout_sets
  for select to authenticated using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.workout_session_id
      where wse.id = workout_session_exercise_id and ws.user_id = auth.uid()
    )
  );
create policy workout_sets_insert_own on public.workout_sets
  for insert to authenticated with check (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.workout_session_id
      where wse.id = workout_session_exercise_id and ws.user_id = auth.uid()
    )
  );
create policy workout_sets_update_own on public.workout_sets
  for update to authenticated
  using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.workout_session_id
      where wse.id = workout_session_exercise_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.workout_session_id
      where wse.id = workout_session_exercise_id and ws.user_id = auth.uid()
    )
  );
create policy workout_sets_delete_own on public.workout_sets
  for delete to authenticated using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.workout_session_id
      where wse.id = workout_session_exercise_id and ws.user_id = auth.uid()
    )
  );

-- workout_session_notes: owner-only, plus session ownership check
create policy workout_session_notes_select_own on public.workout_session_notes
  for select to authenticated using (
    user_id = auth.uid()
    and exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid())
  );
create policy workout_session_notes_insert_own on public.workout_session_notes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid())
  );
create policy workout_session_notes_update_own on public.workout_session_notes
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid())
  );
create policy workout_session_notes_delete_own on public.workout_session_notes
  for delete to authenticated using (user_id = auth.uid());

-- personal_records: owner-only CRUD
create policy personal_records_select_own on public.personal_records
  for select to authenticated using (user_id = auth.uid());
create policy personal_records_insert_own on public.personal_records
  for insert to authenticated with check (user_id = auth.uid());
create policy personal_records_update_own on public.personal_records
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy personal_records_delete_own on public.personal_records
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges. System catalog tables are read-only for authenticated clients:
-- no insert/update/delete grant is issued, so writes fail closed even before
-- RLS is evaluated.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on public.muscle_groups, public.equipment_types, public.movement_patterns,
  public.exercise_definitions, public.exercise_aliases, public.exercise_muscle_groups
  to authenticated;

grant select, insert, update, delete on public.user_exercises, public.workout_plans,
  public.workout_plan_days, public.workout_blocks, public.workout_block_exercises,
  public.workout_set_prescriptions, public.scheduled_workouts, public.workout_sessions,
  public.workout_session_exercises, public.workout_sets, public.workout_session_notes,
  public.personal_records
  to authenticated;

grant all on public.muscle_groups, public.equipment_types, public.movement_patterns,
  public.exercise_definitions, public.exercise_aliases, public.exercise_muscle_groups,
  public.user_exercises, public.workout_plans, public.workout_plan_days, public.workout_blocks,
  public.workout_block_exercises, public.workout_set_prescriptions, public.scheduled_workouts,
  public.workout_sessions, public.workout_session_exercises, public.workout_sets,
  public.workout_session_notes, public.personal_records
  to service_role;

grant usage, select on all sequences in schema public to authenticated;
