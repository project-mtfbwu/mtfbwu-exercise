-- Increment 8: body weight, body measurements, private progress photos, comparisons, notes.
-- Curated measurement_definitions seed data belongs in a separate migration.
-- Historical entries remain user-owned snapshots; new records never overwrite prior rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.measurement_category as enum (
    'weight', 'circumference', 'width', 'composition', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.measurement_side_mode as enum (
    'not_applicable', 'left_right', 'single_value'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.measurement_value_side as enum (
    'left', 'right', 'not_applicable'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_record_source as enum (
    'manual', 'imported_future', 'device_future'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_photo_slot as enum (
    'front', 'side_left', 'side_right', 'back', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_comparison_type as enum (
    'photo', 'weight', 'measurement', 'mixed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_note_type as enum (
    'general', 'weight', 'measurement', 'photo', 'milestone'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_date_range as enum (
    '7d', '30d', '90d', '180d', '365d', 'all'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- System measurement catalog (read-only for authenticated)
-- ---------------------------------------------------------------------------

create table if not exists public.measurement_definitions (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  display_name text not null,
  category public.measurement_category not null default 'circumference',
  default_unit text not null,
  supports_side boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (default_unit in ('kg', 'lb', 'cm', 'in', 'percent'))
);

-- ---------------------------------------------------------------------------
-- User measurement configuration (catalog wrapper OR custom_name)
-- ---------------------------------------------------------------------------

create table if not exists public.user_measurement_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  measurement_definition_id uuid references public.measurement_definitions (id) on delete restrict,
  custom_name text,
  unit text not null,
  side_mode public.measurement_side_mode not null default 'not_applicable',
  enabled boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (unit in ('kg', 'lb', 'cm', 'in', 'percent')),
  check (
    (measurement_definition_id is not null and custom_name is null)
    or (measurement_definition_id is null and custom_name is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Body weight entries (dated user-entered weight records)
-- ---------------------------------------------------------------------------

create table if not exists public.body_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  timezone text not null default 'UTC',
  weight_value numeric,
  weight_unit text not null default 'kg',
  normalized_kg numeric,
  source public.progress_record_source not null default 'manual',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (weight_unit in ('kg', 'lb')),
  check (weight_value is null or weight_value >= 0),
  check (normalized_kg is null or (normalized_kg >= 0 and normalized_kg <= 500)),
  check (
    weight_value is null
    or (
      normalized_kg is not null
      and (
        (weight_unit = 'kg' and weight_value <= 500)
        or (weight_unit = 'lb' and weight_value <= 1100)
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- Body measurement entries (dated set of one or more measurements)
-- ---------------------------------------------------------------------------

create table if not exists public.body_measurement_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  timezone text not null default 'UTC',
  title text,
  source public.progress_record_source not null default 'manual',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Body measurement values (one value per entry + definition + side)
-- ---------------------------------------------------------------------------

create table if not exists public.body_measurement_values (
  id uuid primary key default gen_random_uuid(),
  body_measurement_entry_id uuid not null references public.body_measurement_entries (id) on delete cascade,
  user_measurement_definition_id uuid not null references public.user_measurement_definitions (id) on delete restrict,
  side public.measurement_value_side not null default 'not_applicable',
  value numeric not null check (value >= 0),
  unit text not null,
  normalized_value numeric not null check (normalized_value >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (body_measurement_entry_id, user_measurement_definition_id, side),
  check (unit in ('cm', 'in', 'percent')),
  check (
    (unit in ('cm', 'in') and normalized_value <= 300 and value <= case when unit = 'cm' then 300 else 120 end)
    or (unit = 'percent' and value <= 100 and normalized_value <= 100)
  )
);

-- ---------------------------------------------------------------------------
-- Progress photo sets (private dated groups of photos)
-- ---------------------------------------------------------------------------

create table if not exists public.progress_photo_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  captured_at timestamptz not null default timezone('utc', now()),
  timezone text not null default 'UTC',
  title text,
  note text,
  source public.progress_record_source not null default 'manual',
  retained boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Progress photos (slots within a set; private storage path)
-- Path convention: {user_id}/progress/{photo_set_id}/{slot}-{photo_id}.jpg
-- ---------------------------------------------------------------------------

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  progress_photo_set_id uuid not null references public.progress_photo_sets (id) on delete cascade,
  slot public.progress_photo_slot not null,
  custom_label text,
  private_storage_path text not null,
  mime_type text not null default 'image/jpeg',
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  file_size_bytes integer check (file_size_bytes is null or file_size_bytes >= 0),
  checksum text,
  processed boolean not null default false,
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  check (
    slot <> 'custom'
    or (custom_label is not null and length(trim(custom_label)) > 0)
  )
);

create unique index if not exists progress_photos_one_slot_per_set
  on public.progress_photos (progress_photo_set_id, slot)
  where slot <> 'custom' and deleted_at is null;

create unique index if not exists progress_photos_one_custom_label_per_set
  on public.progress_photos (progress_photo_set_id, custom_label)
  where slot = 'custom' and custom_label is not null and deleted_at is null;

create unique index if not exists progress_photos_checksum_per_set
  on public.progress_photos (progress_photo_set_id, checksum)
  where checksum is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- Saved or materialized comparison views
-- ---------------------------------------------------------------------------

create table if not exists public.progress_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  comparison_type public.progress_comparison_type not null default 'mixed',
  left_photo_set_id uuid references public.progress_photo_sets (id) on delete set null,
  right_photo_set_id uuid references public.progress_photo_sets (id) on delete set null,
  left_date date,
  right_date date,
  measurement_keys text[],
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (left_date is null or right_date is null or right_date >= left_date)
);

-- ---------------------------------------------------------------------------
-- Progress notes (milestones and contextual notes)
-- ---------------------------------------------------------------------------

create table if not exists public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  note_type public.progress_note_type not null default 'general',
  value_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (length(trim(value_text)) > 0)
);

-- ---------------------------------------------------------------------------
-- Per-user progress summary display preferences (one row per user)
-- ---------------------------------------------------------------------------

create table if not exists public.progress_summary_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  default_date_range public.progress_date_range not null default '30d',
  show_weight boolean not null default true,
  show_measurements boolean not null default true,
  show_photos boolean not null default true,
  selected_measurement_keys text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists measurement_definitions_active_order_idx
  on public.measurement_definitions (active, display_order);

create index if not exists user_measurement_definitions_user_enabled_idx
  on public.user_measurement_definitions (user_id, enabled, display_order)
  where enabled;

create index if not exists body_weight_entries_user_date_idx
  on public.body_weight_entries (user_id, local_date desc, recorded_at desc)
  where deleted_at is null;

create index if not exists body_weight_entries_user_recorded_idx
  on public.body_weight_entries (user_id, recorded_at desc)
  where deleted_at is null;

create index if not exists body_measurement_entries_user_date_idx
  on public.body_measurement_entries (user_id, local_date desc, recorded_at desc)
  where deleted_at is null;

create index if not exists body_measurement_values_entry_idx
  on public.body_measurement_values (body_measurement_entry_id);

create index if not exists body_measurement_values_definition_idx
  on public.body_measurement_values (user_measurement_definition_id);

create index if not exists progress_photo_sets_user_date_idx
  on public.progress_photo_sets (user_id, local_date desc, captured_at desc)
  where deleted_at is null;

create index if not exists progress_photos_set_idx
  on public.progress_photos (progress_photo_set_id, slot)
  where deleted_at is null;

create index if not exists progress_comparisons_user_created_idx
  on public.progress_comparisons (user_id, created_at desc)
  where deleted_at is null;

create index if not exists progress_notes_user_date_idx
  on public.progress_notes (user_id, local_date desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_updated_at() from Increment 3)
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'measurement_definitions', 'user_measurement_definitions', 'body_weight_entries',
    'body_measurement_entries', 'body_measurement_values', 'progress_photo_sets',
    'progress_photos', 'progress_comparisons', 'progress_notes', 'progress_summary_preferences'
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

alter table public.measurement_definitions enable row level security;
alter table public.user_measurement_definitions enable row level security;
alter table public.body_weight_entries enable row level security;
alter table public.body_measurement_entries enable row level security;
alter table public.body_measurement_values enable row level security;
alter table public.progress_photo_sets enable row level security;
alter table public.progress_photos enable row level security;
alter table public.progress_comparisons enable row level security;
alter table public.progress_notes enable row level security;
alter table public.progress_summary_preferences enable row level security;

-- System catalog: authenticated read active definitions only.
create policy measurement_definitions_select_active on public.measurement_definitions
  for select to authenticated using (active);

-- user_measurement_definitions: owner-only CRUD
create policy user_measurement_definitions_select_own on public.user_measurement_definitions
  for select to authenticated using (user_id = auth.uid());
create policy user_measurement_definitions_insert_own on public.user_measurement_definitions
  for insert to authenticated with check (user_id = auth.uid());
create policy user_measurement_definitions_update_own on public.user_measurement_definitions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_measurement_definitions_delete_own on public.user_measurement_definitions
  for delete to authenticated using (user_id = auth.uid());

-- body_weight_entries: owner-only CRUD; soft-deleted rows invisible
create policy body_weight_entries_select_own on public.body_weight_entries
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy body_weight_entries_insert_own on public.body_weight_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy body_weight_entries_update_own on public.body_weight_entries
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy body_weight_entries_delete_own on public.body_weight_entries
  for delete to authenticated using (user_id = auth.uid());

-- body_measurement_entries: owner-only CRUD; soft-deleted rows invisible
create policy body_measurement_entries_select_own on public.body_measurement_entries
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy body_measurement_entries_insert_own on public.body_measurement_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy body_measurement_entries_update_own on public.body_measurement_entries
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy body_measurement_entries_delete_own on public.body_measurement_entries
  for delete to authenticated using (user_id = auth.uid());

-- body_measurement_values: ownership via parent entry (+ definition owner check)
create policy body_measurement_values_select_own on public.body_measurement_values
  for select to authenticated using (
    exists (
      select 1 from public.body_measurement_entries bme
      where bme.id = body_measurement_entry_id
        and bme.user_id = auth.uid()
        and bme.deleted_at is null
    )
    and exists (
      select 1 from public.user_measurement_definitions umd
      where umd.id = user_measurement_definition_id and umd.user_id = auth.uid()
    )
  );
create policy body_measurement_values_insert_own on public.body_measurement_values
  for insert to authenticated with check (
    exists (
      select 1 from public.body_measurement_entries bme
      where bme.id = body_measurement_entry_id
        and bme.user_id = auth.uid()
        and bme.deleted_at is null
    )
    and exists (
      select 1 from public.user_measurement_definitions umd
      where umd.id = user_measurement_definition_id and umd.user_id = auth.uid()
    )
  );
create policy body_measurement_values_update_own on public.body_measurement_values
  for update to authenticated
  using (
    exists (
      select 1 from public.body_measurement_entries bme
      where bme.id = body_measurement_entry_id
        and bme.user_id = auth.uid()
        and bme.deleted_at is null
    )
    and exists (
      select 1 from public.user_measurement_definitions umd
      where umd.id = user_measurement_definition_id and umd.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.body_measurement_entries bme
      where bme.id = body_measurement_entry_id
        and bme.user_id = auth.uid()
        and bme.deleted_at is null
    )
    and exists (
      select 1 from public.user_measurement_definitions umd
      where umd.id = user_measurement_definition_id and umd.user_id = auth.uid()
    )
  );
create policy body_measurement_values_delete_own on public.body_measurement_values
  for delete to authenticated using (
    exists (
      select 1 from public.body_measurement_entries bme
      where bme.id = body_measurement_entry_id
        and bme.user_id = auth.uid()
    )
    and exists (
      select 1 from public.user_measurement_definitions umd
      where umd.id = user_measurement_definition_id and umd.user_id = auth.uid()
    )
  );

-- progress_photo_sets: owner-only CRUD; soft-deleted rows invisible
create policy progress_photo_sets_select_own on public.progress_photo_sets
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy progress_photo_sets_insert_own on public.progress_photo_sets
  for insert to authenticated with check (user_id = auth.uid());
create policy progress_photo_sets_update_own on public.progress_photo_sets
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy progress_photo_sets_delete_own on public.progress_photo_sets
  for delete to authenticated using (user_id = auth.uid());

-- progress_photos: ownership via parent photo set
create policy progress_photos_select_own on public.progress_photos
  for select to authenticated using (
    deleted_at is null
    and exists (
      select 1 from public.progress_photo_sets pps
      where pps.id = progress_photo_set_id
        and pps.user_id = auth.uid()
        and pps.deleted_at is null
    )
  );
create policy progress_photos_insert_own on public.progress_photos
  for insert to authenticated with check (
    exists (
      select 1 from public.progress_photo_sets pps
      where pps.id = progress_photo_set_id
        and pps.user_id = auth.uid()
        and pps.deleted_at is null
    )
  );
create policy progress_photos_update_own on public.progress_photos
  for update to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.progress_photo_sets pps
      where pps.id = progress_photo_set_id
        and pps.user_id = auth.uid()
        and pps.deleted_at is null
    )
  )
  with check (
    exists (
      select 1 from public.progress_photo_sets pps
      where pps.id = progress_photo_set_id
        and pps.user_id = auth.uid()
    )
  );
create policy progress_photos_delete_own on public.progress_photos
  for delete to authenticated using (
    exists (
      select 1 from public.progress_photo_sets pps
      where pps.id = progress_photo_set_id and pps.user_id = auth.uid()
    )
  );

-- progress_comparisons: owner-only CRUD; soft-deleted rows invisible
create policy progress_comparisons_select_own on public.progress_comparisons
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy progress_comparisons_insert_own on public.progress_comparisons
  for insert to authenticated with check (user_id = auth.uid());
create policy progress_comparisons_update_own on public.progress_comparisons
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy progress_comparisons_delete_own on public.progress_comparisons
  for delete to authenticated using (user_id = auth.uid());

-- progress_notes: owner-only CRUD; soft-deleted rows invisible
create policy progress_notes_select_own on public.progress_notes
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy progress_notes_insert_own on public.progress_notes
  for insert to authenticated with check (user_id = auth.uid());
create policy progress_notes_update_own on public.progress_notes
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy progress_notes_delete_own on public.progress_notes
  for delete to authenticated using (user_id = auth.uid());

-- progress_summary_preferences: owner-only CRUD (one row per user)
create policy progress_summary_preferences_select_own on public.progress_summary_preferences
  for select to authenticated using (user_id = auth.uid());
create policy progress_summary_preferences_insert_own on public.progress_summary_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy progress_summary_preferences_update_own on public.progress_summary_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_summary_preferences_delete_own on public.progress_summary_preferences
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges. System catalog is read-only for authenticated clients.
-- ---------------------------------------------------------------------------

grant select on public.measurement_definitions to authenticated;

grant select, insert, update, delete on public.user_measurement_definitions,
  public.body_weight_entries, public.body_measurement_entries, public.body_measurement_values,
  public.progress_photo_sets, public.progress_photos, public.progress_comparisons,
  public.progress_notes, public.progress_summary_preferences
  to authenticated;

grant all on public.measurement_definitions, public.user_measurement_definitions,
  public.body_weight_entries, public.body_measurement_entries, public.body_measurement_values,
  public.progress_photo_sets, public.progress_photos, public.progress_comparisons,
  public.progress_notes, public.progress_summary_preferences
  to service_role;

-- ---------------------------------------------------------------------------
-- Private storage bucket for progress photos
-- Path convention: {user_id}/progress/{photo_set_id}/{slot}-{photo_id}.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists progress_photos_storage_select_own on storage.objects;
create policy progress_photos_storage_select_own on storage.objects
  for select to authenticated using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists progress_photos_storage_insert_own on storage.objects;
create policy progress_photos_storage_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists progress_photos_storage_update_own on storage.objects;
create policy progress_photos_storage_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists progress_photos_storage_delete_own on storage.objects;
create policy progress_photos_storage_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
