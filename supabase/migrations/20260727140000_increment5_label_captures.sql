-- Increment 5: nutrition label captures, review events, private label-image storage.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type public.nutrition_label_capture_status as enum (
  'draft',
  'ocr_running',
  'ocr_failed',
  'awaiting_review',
  'reviewed',
  'saved',
  'discarded'
);

create table if not exists public.nutrition_label_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  barcode text,
  status public.nutrition_label_capture_status not null default 'draft',
  private_image_path text,
  ocr_text text,
  extraction_json jsonb not null default '{}'::jsonb,
  reviewed_values_json jsonb not null default '{}'::jsonb,
  language text not null default 'eng',
  confidence_summary numeric,
  retain_image boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.product_review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  branded_product_id uuid references public.branded_products (id) on delete set null,
  capture_id uuid references public.nutrition_label_captures (id) on delete set null,
  event_type text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists nutrition_label_captures_user_active_idx
  on public.nutrition_label_captures (user_id, created_at desc)
  where deleted_at is null;

create index if not exists nutrition_label_captures_barcode_idx
  on public.nutrition_label_captures (barcode)
  where barcode is not null and deleted_at is null;

create index if not exists product_review_events_user_idx
  on public.product_review_events (user_id, created_at desc);

drop trigger if exists nutrition_label_captures_set_updated_at on public.nutrition_label_captures;
create trigger nutrition_label_captures_set_updated_at
  before update on public.nutrition_label_captures
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.nutrition_label_captures enable row level security;
alter table public.product_review_events enable row level security;

create policy nutrition_label_captures_select_own on public.nutrition_label_captures
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);

create policy nutrition_label_captures_insert_own on public.nutrition_label_captures
  for insert to authenticated with check (user_id = auth.uid());

create policy nutrition_label_captures_update_own on public.nutrition_label_captures
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());

create policy nutrition_label_captures_delete_own on public.nutrition_label_captures
  for delete to authenticated using (user_id = auth.uid());

create policy product_review_events_select_own on public.product_review_events
  for select to authenticated using (user_id = auth.uid());

create policy product_review_events_insert_own on public.product_review_events
  for insert to authenticated with check (user_id = auth.uid());

grant select, insert, update, delete on public.nutrition_label_captures to authenticated;
grant select, insert on public.product_review_events to authenticated;
grant all on public.nutrition_label_captures to service_role;
grant all on public.product_review_events to service_role;

-- ---------------------------------------------------------------------------
-- Private storage bucket for temporary nutrition-label images
-- Path convention: {user_id}/{nutrition-labels/{capture_id}/{filename
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nutrition-labels',
  'nutrition-labels',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nutrition_labels_storage_select_own on storage.objects;
create policy nutrition_labels_storage_select_own on storage.objects
  for select to authenticated using (
    bucket_id = 'nutrition-labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists nutrition_labels_storage_insert_own on storage.objects;
create policy nutrition_labels_storage_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'nutrition-labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists nutrition_labels_storage_update_own on storage.objects;
create policy nutrition_labels_storage_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'nutrition-labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'nutrition-labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists nutrition_labels_storage_delete_own on storage.objects;
create policy nutrition_labels_storage_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'nutrition-labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
