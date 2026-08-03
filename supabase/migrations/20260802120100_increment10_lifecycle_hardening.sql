-- Increment 10 completion: deletion/export audit stages.
-- Idempotent. Critical query indexes already exist from Inc 3–9;
-- only add net-new justified indexes documented in DATABASE_PERFORMANCE_REVIEW.md.

begin;

alter table public.account_deletion_requests
  add column if not exists cleanup_stage text
    check (
      cleanup_stage is null
      or cleanup_stage in (
        'requested',
        'enumerate_storage',
        'delete_storage',
        'purge_domain',
        'revoke_auth',
        'completed',
        'failed'
      )
    );

alter table public.account_deletion_requests
  add column if not exists cleanup_detail jsonb not null default '{}'::jsonb;

alter table public.account_export_requests
  add column if not exists file_count integer not null default 0 check (file_count >= 0);

alter table public.account_export_requests
  add column if not exists failed_file_count integer not null default 0
    check (failed_file_count >= 0);

alter table public.account_export_requests
  add column if not exists manifest_summary jsonb not null default '{}'::jsonb;

-- Soft-deleted photo exclusion for set galleries / export enumeration.
create index if not exists progress_photos_set_active_idx
  on public.progress_photos (progress_photo_set_id)
  where deleted_at is null;

-- Active label captures with retained images (export enumeration).
create index if not exists nutrition_label_captures_user_retain_idx
  on public.nutrition_label_captures (user_id)
  where deleted_at is null and retain_image = true and private_image_path is not null;

drop policy if exists account_export_requests_update_own on public.account_export_requests;
create policy account_export_requests_update_own on public.account_export_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.account_export_requests to authenticated;

commit;
