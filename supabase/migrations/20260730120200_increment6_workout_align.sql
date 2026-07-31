-- Increment 6 align: columns required by the workout execution / schedule UX
-- that were not present in the initial engine migration, plus enum expansions
-- for advanced block/set types from the Increment 6 brief.

-- ---------------------------------------------------------------------------
-- Enum expansions (idempotent)
-- ---------------------------------------------------------------------------

do $$
begin
  -- exercise_type
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'exercise_type' and e.enumlabel = 'hypertrophy'
  ) then
    alter type public.exercise_type add value 'hypertrophy';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'exercise_type' and e.enumlabel = 'skill'
  ) then
    alter type public.exercise_type add value 'skill';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'exercise_type' and e.enumlabel = 'custom'
  ) then
    alter type public.exercise_type add value 'custom';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'exercise_type' and e.enumlabel = 'bodyweight'
  ) then
    alter type public.exercise_type add value 'bodyweight';
  end if;

  -- workout_block_type
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_block_type' and e.enumlabel = 'triset'
  ) then
    alter type public.workout_block_type add value 'triset';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_block_type' and e.enumlabel = 'stripping_set'
  ) then
    alter type public.workout_block_type add value 'stripping_set';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_block_type' and e.enumlabel = 'one_to_ten'
  ) then
    alter type public.workout_block_type add value 'one_to_ten';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_block_type' and e.enumlabel = 'cardio'
  ) then
    alter type public.workout_block_type add value 'cardio';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_block_type' and e.enumlabel = 'mobility'
  ) then
    alter type public.workout_block_type add value 'mobility';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_block_type' and e.enumlabel = 'custom'
  ) then
    alter type public.workout_block_type add value 'custom';
  end if;

  -- workout_set_role
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_role' and e.enumlabel = 'drop'
  ) then
    alter type public.workout_set_role add value 'drop';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_role' and e.enumlabel = 'max_effort'
  ) then
    alter type public.workout_set_role add value 'max_effort';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_role' and e.enumlabel = 'failure'
  ) then
    alter type public.workout_set_role add value 'failure';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_role' and e.enumlabel = 'timed_hold'
  ) then
    alter type public.workout_set_role add value 'timed_hold';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_role' and e.enumlabel = 'technique'
  ) then
    alter type public.workout_set_role add value 'technique';
  end if;

  -- workout_set_completion_rule
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'exact'
  ) then
    alter type public.workout_set_completion_rule add value 'exact';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'range'
  ) then
    alter type public.workout_set_completion_rule add value 'range';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'amrap'
  ) then
    alter type public.workout_set_completion_rule add value 'amrap';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'to_failure'
  ) then
    alter type public.workout_set_completion_rule add value 'to_failure';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'max_effort'
  ) then
    alter type public.workout_set_completion_rule add value 'max_effort';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'duration'
  ) then
    alter type public.workout_set_completion_rule add value 'duration';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'distance'
  ) then
    alter type public.workout_set_completion_rule add value 'distance';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_completion_rule' and e.enumlabel = 'manual'
  ) then
    alter type public.workout_set_completion_rule add value 'manual';
  end if;

  -- scheduled_workout_status
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'scheduled_workout_status' and e.enumlabel = 'started'
  ) then
    alter type public.scheduled_workout_status add value 'started';
  end if;
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'scheduled_workout_status' and e.enumlabel = 'cancelled'
  ) then
    alter type public.scheduled_workout_status add value 'cancelled';
  end if;

  -- workout_set_status
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'workout_set_status' and e.enumlabel = 'partial'
  ) then
    alter type public.workout_set_status add value 'partial';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Column aligns
-- ---------------------------------------------------------------------------

alter table public.scheduled_workouts
  add column if not exists timezone text not null default 'UTC';

alter table public.workout_sessions
  add column if not exists title text not null default 'Workout',
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  add column if not exists session_rpe numeric check (session_rpe is null or (session_rpe >= 0 and session_rpe <= 10)),
  add column if not exists total_volume numeric check (total_volume is null or total_volume >= 0),
  add column if not exists source_plan_version integer check (source_plan_version is null or source_plan_version >= 1);

alter table public.workout_session_exercises
  add column if not exists block_type_snapshot text,
  add column if not exists block_order integer not null default 0 check (block_order >= 0),
  add column if not exists exercise_order integer not null default 0 check (exercise_order >= 0),
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Prefer exercise_order over sort_order going forward; keep sort_order for compatibility.
update public.workout_session_exercises
set exercise_order = sort_order
where exercise_order = 0 and sort_order > 0;

alter table public.workout_sets
  add column if not exists load_unit text not null default 'kg',
  add column if not exists distance_unit text,
  add column if not exists rir numeric check (rir is null or (rir >= 0 and rir <= 10)),
  add column if not exists tempo_snapshot text,
  add column if not exists rest_seconds_actual integer check (rest_seconds_actual is null or rest_seconds_actual >= 0);

alter table public.workout_session_notes
  add column if not exists note_type text not null default 'general',
  add column if not exists body_area text,
  add column if not exists value_text text;

update public.workout_session_notes
set value_text = body
where value_text is null and body is not null;

alter table public.personal_records
  add column if not exists dismissed boolean not null default false,
  add column if not exists confirmed boolean not null default false;

-- One PR event per source set + record type (no duplicate celebrations for the same set).
create unique index if not exists personal_records_set_type_uidx
  on public.personal_records (workout_set_id, record_type)
  where workout_set_id is not null;

-- Soft-delete protection: completed sessions cannot be silently deleted by clients.
-- Application layer + RLS still govern writes; this documents the integrity rule.

comment on column public.workout_sessions.snapshot_json is
  'Immutable plan structure captured at session start. Plan edits never rewrite this.';
comment on column public.workout_sessions.source_plan_version is
  'Plan version at session start for conflict visibility.';
