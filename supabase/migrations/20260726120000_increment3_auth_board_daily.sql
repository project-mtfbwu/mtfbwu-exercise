-- Increment 3: auth-owned profile, board layout, and daily module status foundation
-- Idempotent onboarding via handle_new_user trigger + ensure_user_board_defaults()

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.units_system as enum ('metric', 'imperial');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.animation_mode as enum ('full', 'reduced', 'off');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.module_category as enum (
    'nutrition',
    'training',
    'recovery',
    'body',
    'lifestyle',
    'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.card_visual_variant as enum (
    'paper_cream',
    'paper_yellow',
    'paper_pink',
    'window_cyan',
    'window_purple',
    'window_pink',
    'window_orange',
    'window_lime',
    'window_blue'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.daily_module_status_kind as enum (
    'not_started',
    'in_progress',
    'completed',
    'skipped'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  timezone text not null default 'UTC',
  locale text not null default 'en-US',
  units_system public.units_system not null default 'metric',
  animation_mode public.animation_mode not null default 'full',
  onboarding_completed boolean not null default false,
  onboarding_step integer not null default 0 check (onboarding_step >= 0 and onboarding_step <= 6),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.module_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  description text not null default '',
  category public.module_category not null,
  default_enabled boolean not null default false,
  default_order integer not null default 100,
  visual_variant public.card_visual_variant not null default 'paper_cream',
  icon_key text not null default 'sticker',
  supports_target boolean not null default false,
  supports_calendar boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_definition_id uuid not null references public.module_definitions (id) on delete restrict,
  enabled boolean not null default true,
  custom_label text,
  target_value numeric,
  target_unit text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, module_definition_id)
);

create table if not exists public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Default',
  is_active boolean not null default false,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- At most one active layout per user
create unique index if not exists dashboard_layouts_one_active_per_user
  on public.dashboard_layouts (user_id)
  where is_active;

create table if not exists public.dashboard_cards (
  id uuid primary key default gen_random_uuid(),
  dashboard_layout_id uuid not null references public.dashboard_layouts (id) on delete cascade,
  user_module_id uuid not null references public.user_modules (id) on delete cascade,
  position_index integer not null check (position_index >= 0),
  desktop_column integer not null default 0 check (desktop_column >= 0 and desktop_column < 3),
  desktop_row integer not null default 0 check (desktop_row >= 0),
  desktop_span integer not null default 1 check (desktop_span >= 1 and desktop_span <= 3),
  tablet_position integer not null default 0 check (tablet_position >= 0),
  mobile_position integer not null default 0 check (mobile_position >= 0),
  rotation numeric not null default 0,
  visual_variant public.card_visual_variant not null default 'paper_cream',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (dashboard_layout_id, user_module_id),
  unique (dashboard_layout_id, position_index)
);

create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, local_date)
);

create table if not exists public.daily_module_statuses (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records (id) on delete cascade,
  user_module_id uuid not null references public.user_modules (id) on delete cascade,
  status public.daily_module_status_kind not null default 'not_started',
  progress_value numeric,
  progress_target numeric,
  summary_text text,
  completed_at timestamptz,
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (daily_record_id, user_module_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists user_modules_user_id_idx on public.user_modules (user_id);
create index if not exists user_modules_enabled_idx on public.user_modules (user_id, enabled);
create index if not exists dashboard_layouts_user_id_idx on public.dashboard_layouts (user_id);
create index if not exists dashboard_cards_layout_idx on public.dashboard_cards (dashboard_layout_id, position_index);
create index if not exists daily_records_user_date_idx on public.daily_records (user_id, local_date desc);
create index if not exists daily_module_statuses_record_idx on public.daily_module_statuses (daily_record_id);
create index if not exists module_definitions_active_order_idx
  on public.module_definitions (is_active, default_order);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists module_definitions_set_updated_at on public.module_definitions;
create trigger module_definitions_set_updated_at
  before update on public.module_definitions
  for each row execute function public.set_updated_at();

drop trigger if exists user_modules_set_updated_at on public.user_modules;
create trigger user_modules_set_updated_at
  before update on public.user_modules
  for each row execute function public.set_updated_at();

drop trigger if exists dashboard_layouts_set_updated_at on public.dashboard_layouts;
create trigger dashboard_layouts_set_updated_at
  before update on public.dashboard_layouts
  for each row execute function public.set_updated_at();

drop trigger if exists dashboard_cards_set_updated_at on public.dashboard_cards;
create trigger dashboard_cards_set_updated_at
  before update on public.dashboard_cards
  for each row execute function public.set_updated_at();

drop trigger if exists daily_records_set_updated_at on public.daily_records;
create trigger daily_records_set_updated_at
  before update on public.daily_records
  for each row execute function public.set_updated_at();

drop trigger if exists daily_module_statuses_set_updated_at on public.daily_module_statuses;
create trigger daily_module_statuses_set_updated_at
  before update on public.daily_module_statuses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed built-in modules
-- ---------------------------------------------------------------------------

insert into public.module_definitions (
  key, display_name, description, category, default_enabled, default_order,
  visual_variant, icon_key, supports_target, supports_calendar, is_active
) values
  ('nutrition', 'Nutrition', 'Meals and macros', 'nutrition', true, 10, 'paper_cream', 'egg', true, true, true),
  ('workout', 'Workout', 'Strength sessions', 'training', true, 20, 'window_pink', 'dumbbell', false, true, true),
  ('rehab', 'Rehab', 'Rehab / mobility protocols', 'recovery', true, 30, 'window_orange', 'band', false, true, true),
  ('hydration', 'Water', 'Daily hydration', 'lifestyle', true, 40, 'window_cyan', 'drop', true, true, true),
  ('meditation', 'Meditation', 'Mindful minutes', 'recovery', true, 50, 'window_purple', 'lotus', true, true, true),
  ('measurements', 'Measurements', 'Body metrics', 'body', true, 60, 'paper_yellow', 'tape', false, true, true),
  ('progress_photos', 'Progress photos', 'Private photo sets', 'body', false, 70, 'window_pink', 'camera', false, true, true),
  ('supplements', 'Supplements', 'Daily supplements', 'lifestyle', false, 80, 'window_orange', 'pill', true, true, true),
  ('sleep', 'Sleep', 'Sleep duration / quality', 'lifestyle', false, 90, 'window_purple', 'moon', true, true, true),
  ('steps', 'Steps', 'Daily steps', 'lifestyle', false, 100, 'window_lime', 'shoe', true, true, true),
  ('cardio', 'Cardio', 'Cardio sessions', 'training', false, 110, 'window_blue', 'heart', false, true, true),
  ('mobility', 'Mobility', 'Mobility work', 'recovery', false, 120, 'window_cyan', 'stretch', false, true, true),
  ('swimming', 'Swimming', 'Swim sessions', 'training', false, 130, 'window_cyan', 'wave', false, true, true),
  ('boxing', 'Boxing', 'Boxing / pad work', 'training', false, 140, 'window_orange', 'glove', false, true, true),
  ('custom_tracker', 'Custom tracker', 'User-defined tracker shell', 'custom', false, 200, 'paper_pink', 'star', true, true, true)
on conflict (key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  default_enabled = excluded.default_enabled,
  default_order = excluded.default_order,
  visual_variant = excluded.visual_variant,
  icon_key = excluded.icon_key,
  supports_target = excluded.supports_target,
  supports_calendar = excluded.supports_calendar,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------------------------
-- Idempotent board bootstrap for a user
-- ---------------------------------------------------------------------------

create or replace function public.ensure_user_board_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_layout_id uuid;
  v_def record;
  v_module_id uuid;
  v_pos integer := 0;
begin
  insert into public.profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  insert into public.user_modules (user_id, module_definition_id, enabled)
  select p_user_id, md.id, md.default_enabled
  from public.module_definitions md
  where md.is_active
  on conflict (user_id, module_definition_id) do nothing;

  select id into v_layout_id
  from public.dashboard_layouts
  where user_id = p_user_id and is_active
  limit 1;

  if v_layout_id is null then
    insert into public.dashboard_layouts (user_id, name, is_active, version)
    values (p_user_id, 'Default', true, 1)
    returning id into v_layout_id;
  end if;

  for v_def in
    select um.id as user_module_id, md.visual_variant, md.default_order
    from public.user_modules um
    join public.module_definitions md on md.id = um.module_definition_id
    where um.user_id = p_user_id and um.enabled
    order by md.default_order, md.key
  loop
    if not exists (
      select 1 from public.dashboard_cards
      where dashboard_layout_id = v_layout_id and user_module_id = v_def.user_module_id
    ) then
      insert into public.dashboard_cards (
        dashboard_layout_id,
        user_module_id,
        position_index,
        desktop_column,
        desktop_row,
        tablet_position,
        mobile_position,
        visual_variant
      ) values (
        v_layout_id,
        v_def.user_module_id,
        v_pos,
        v_pos % 3,
        v_pos / 3,
        v_pos,
        v_pos,
        v_def.visual_variant
      );
    end if;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

revoke all on function public.ensure_user_board_defaults(uuid) from public;
grant execute on function public.ensure_user_board_defaults(uuid) to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_user_board_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Layout version bump helper (stale writes rejected in app by matching version)
create or replace function public.bump_dashboard_layout_version(
  p_layout_id uuid,
  p_expected_version integer
)
returns public.dashboard_layouts
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.dashboard_layouts;
begin
  update public.dashboard_layouts
  set version = version + 1
  where id = p_layout_id
    and version = p_expected_version
    and user_id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception 'layout_version_conflict' using errcode = 'P0001';
  end if;
  return v_row;
end;
$$;

grant execute on function public.bump_dashboard_layout_version(uuid, integer) to authenticated;

-- Daily status revision helper: refuse stale downgrades of completed → not_started
create or replace function public.apply_daily_module_status(
  p_status_id uuid,
  p_expected_revision integer,
  p_status public.daily_module_status_kind,
  p_summary_text text default null,
  p_progress_value numeric default null,
  p_progress_target numeric default null
)
returns public.daily_module_statuses
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.daily_module_statuses;
begin
  select dms.* into v_row
  from public.daily_module_statuses dms
  join public.daily_records dr on dr.id = dms.daily_record_id
  where dms.id = p_status_id
    and dr.user_id = auth.uid()
  for update;

  if v_row.id is null then
    raise exception 'status_not_found' using errcode = 'P0002';
  end if;

  if v_row.revision <> p_expected_revision then
    raise exception 'status_revision_conflict' using errcode = 'P0001';
  end if;

  if v_row.status = 'completed'
     and p_status = 'not_started'
     and p_expected_revision < v_row.revision + 1 then
    -- Explicit guard: stale offline "not_started" cannot wipe a completed day
    raise exception 'status_completed_protected' using errcode = 'P0001';
  end if;

  update public.daily_module_statuses
  set
    status = p_status,
    summary_text = coalesce(p_summary_text, summary_text),
    progress_value = coalesce(p_progress_value, progress_value),
    progress_target = coalesce(p_progress_target, progress_target),
    completed_at = case when p_status = 'completed' then timezone('utc', now()) else completed_at end,
    revision = revision + 1
  where id = p_status_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.apply_daily_module_status(
  uuid, integer, public.daily_module_status_kind, text, numeric, numeric
) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.module_definitions enable row level security;
alter table public.user_modules enable row level security;
alter table public.dashboard_layouts enable row level security;
alter table public.dashboard_cards enable row level security;
alter table public.daily_records enable row level security;
alter table public.daily_module_statuses enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- insert handled by security definer bootstrap; allow own insert as safety net
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- module_definitions: read active only; no writes for users
drop policy if exists module_definitions_select_active on public.module_definitions;
create policy module_definitions_select_active on public.module_definitions
  for select to authenticated
  using (is_active = true);

-- user_modules
drop policy if exists user_modules_select_own on public.user_modules;
create policy user_modules_select_own on public.user_modules
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_modules_insert_own on public.user_modules;
create policy user_modules_insert_own on public.user_modules
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_modules_update_own on public.user_modules;
create policy user_modules_update_own on public.user_modules
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_modules_delete_own on public.user_modules;
create policy user_modules_delete_own on public.user_modules
  for delete to authenticated
  using (user_id = auth.uid());

-- dashboard_layouts
drop policy if exists dashboard_layouts_select_own on public.dashboard_layouts;
create policy dashboard_layouts_select_own on public.dashboard_layouts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists dashboard_layouts_insert_own on public.dashboard_layouts;
create policy dashboard_layouts_insert_own on public.dashboard_layouts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists dashboard_layouts_update_own on public.dashboard_layouts;
create policy dashboard_layouts_update_own on public.dashboard_layouts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists dashboard_layouts_delete_own on public.dashboard_layouts;
create policy dashboard_layouts_delete_own on public.dashboard_layouts
  for delete to authenticated
  using (user_id = auth.uid());

-- dashboard_cards via owned layout
drop policy if exists dashboard_cards_select_own on public.dashboard_cards;
create policy dashboard_cards_select_own on public.dashboard_cards
  for select to authenticated
  using (
    exists (
      select 1 from public.dashboard_layouts dl
      where dl.id = dashboard_layout_id and dl.user_id = auth.uid()
    )
  );

drop policy if exists dashboard_cards_insert_own on public.dashboard_cards;
create policy dashboard_cards_insert_own on public.dashboard_cards
  for insert to authenticated
  with check (
    exists (
      select 1 from public.dashboard_layouts dl
      where dl.id = dashboard_layout_id and dl.user_id = auth.uid()
    )
    and exists (
      select 1 from public.user_modules um
      where um.id = user_module_id and um.user_id = auth.uid()
    )
  );

drop policy if exists dashboard_cards_update_own on public.dashboard_cards;
create policy dashboard_cards_update_own on public.dashboard_cards
  for update to authenticated
  using (
    exists (
      select 1 from public.dashboard_layouts dl
      where dl.id = dashboard_layout_id and dl.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.dashboard_layouts dl
      where dl.id = dashboard_layout_id and dl.user_id = auth.uid()
    )
    and exists (
      select 1 from public.user_modules um
      where um.id = user_module_id and um.user_id = auth.uid()
    )
  );

drop policy if exists dashboard_cards_delete_own on public.dashboard_cards;
create policy dashboard_cards_delete_own on public.dashboard_cards
  for delete to authenticated
  using (
    exists (
      select 1 from public.dashboard_layouts dl
      where dl.id = dashboard_layout_id and dl.user_id = auth.uid()
    )
  );

-- daily_records
drop policy if exists daily_records_select_own on public.daily_records;
create policy daily_records_select_own on public.daily_records
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists daily_records_insert_own on public.daily_records;
create policy daily_records_insert_own on public.daily_records
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists daily_records_update_own on public.daily_records;
create policy daily_records_update_own on public.daily_records
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists daily_records_delete_own on public.daily_records;
create policy daily_records_delete_own on public.daily_records
  for delete to authenticated
  using (user_id = auth.uid());

-- daily_module_statuses via owned daily_record + owned user_module
drop policy if exists daily_module_statuses_select_own on public.daily_module_statuses;
create policy daily_module_statuses_select_own on public.daily_module_statuses
  for select to authenticated
  using (
    exists (
      select 1 from public.daily_records dr
      where dr.id = daily_record_id and dr.user_id = auth.uid()
    )
  );

drop policy if exists daily_module_statuses_insert_own on public.daily_module_statuses;
create policy daily_module_statuses_insert_own on public.daily_module_statuses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.daily_records dr
      where dr.id = daily_record_id and dr.user_id = auth.uid()
    )
    and exists (
      select 1 from public.user_modules um
      where um.id = user_module_id and um.user_id = auth.uid()
    )
  );

drop policy if exists daily_module_statuses_update_own on public.daily_module_statuses;
create policy daily_module_statuses_update_own on public.daily_module_statuses
  for update to authenticated
  using (
    exists (
      select 1 from public.daily_records dr
      where dr.id = daily_record_id and dr.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_records dr
      where dr.id = daily_record_id and dr.user_id = auth.uid()
    )
    and exists (
      select 1 from public.user_modules um
      where um.id = user_module_id and um.user_id = auth.uid()
    )
  );

drop policy if exists daily_module_statuses_delete_own on public.daily_module_statuses;
create policy daily_module_statuses_delete_own on public.daily_module_statuses
  for delete to authenticated
  using (
    exists (
      select 1 from public.daily_records dr
      where dr.id = daily_record_id and dr.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Privileges (RLS still filters rows; no UPDATE policy ⇒ module_definitions
-- cannot be modified by authenticated clients)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select on table public.module_definitions to authenticated;
grant select, insert, update, delete on table public.user_modules to authenticated;
grant select, insert, update, delete on table public.dashboard_layouts to authenticated;
grant select, insert, update, delete on table public.dashboard_cards to authenticated;
grant select, insert, update, delete on table public.daily_records to authenticated;
grant select, insert, update, delete on table public.daily_module_statuses to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;
