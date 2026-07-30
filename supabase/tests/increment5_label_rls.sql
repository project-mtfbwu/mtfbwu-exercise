-- Increment 5 nutrition label capture / review RLS checks.
-- Run after migrations, for example:
--   Get-Content supabase/tests/increment5_label_rls.sql -Raw |
--     docker exec -i supabase_db_mtfbwu-local psql -U postgres -d postgres
-- The transaction rolls back all fixture rows. A failing assertion raises an exception.
-- Assumes migration 20260727140000_increment5_label_captures.sql has been applied.

begin;

do $$
begin
  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array['nutrition_label_captures', 'product_review_events'])
      and c.relrowsecurity
  ) <> 2 then
    raise exception 'every Increment 5 label-capture table must have RLS enabled';
  end if;

  -- Light check that the private label-image storage bucket has its own
  -- per-user policies (full storage.objects behavior is not re-verified
  -- here — that is exercised by Supabase's own storage engine, not SQL).
  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'nutrition_labels_storage_%'
  ) < 4 then
    raise exception 'expected select/insert/update/delete policies on the nutrition-labels storage bucket';
  end if;

  if not exists (
    select 1 from storage.buckets where id = 'nutrition-labels' and public = false
  ) then
    raise exception 'nutrition-labels storage bucket must exist and be private';
  end if;
end $$;

do $$
declare
  user_one uuid := '11000000-0000-0000-0000-000000000001';
  user_two uuid := '11000000-0000-0000-0000-000000000002';
  capture_one_active uuid := '12000000-0000-0000-0000-000000000001';
  capture_one_deleted uuid := '12000000-0000-0000-0000-000000000002';
  capture_two uuid := '12000000-0000-0000-0000-000000000003';
  event_one uuid := '13000000-0000-0000-0000-000000000001';
  event_two uuid := '13000000-0000-0000-0000-000000000002';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      user_one, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment5-user-one@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    ),
    (
      user_two, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'increment5-user-two@example.test', '', timezone('utc', now()), '{}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
    )
  on conflict (id) do nothing;

  insert into public.profiles (id) values (user_one), (user_two)
  on conflict (id) do nothing;

  insert into public.nutrition_label_captures (id, user_id, status, barcode, ocr_text)
  values
    (capture_one_active, user_one, 'awaiting_review', 'increment5-barcode-one', 'Protein 5g'),
    (capture_one_deleted, user_one, 'discarded', null, null),
    (capture_two, user_two, 'awaiting_review', 'increment5-barcode-two', 'Protein 8g')
  on conflict (id) do nothing;

  update public.nutrition_label_captures
  set deleted_at = timezone('utc', now())
  where id = capture_one_deleted;

  insert into public.product_review_events (id, user_id, capture_id, event_type, details_json)
  values
    (event_one, user_one, capture_one_active, 'capture_created', '{}'::jsonb),
    (event_two, user_two, capture_two, 'capture_created', '{}'::jsonb)
  on conflict (id) do nothing;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

do $$
declare
  changed_rows integer;
  capture_one_active uuid := '12000000-0000-0000-0000-000000000001';
  capture_one_deleted uuid := '12000000-0000-0000-0000-000000000002';
  capture_two uuid := '12000000-0000-0000-0000-000000000003';
begin
  -- Own (non-deleted) capture is readable.
  if not exists (
    select 1 from public.nutrition_label_captures where id = capture_one_active
  ) then
    raise exception 'owner cannot read their own active label capture';
  end if;

  -- Cross-user denial: another user's capture must not be visible.
  if exists (
    select 1 from public.nutrition_label_captures where id = capture_two
  ) then
    raise exception 'authenticated user can read another user''s label capture';
  end if;

  -- Soft-deleted own capture is inaccessible via select.
  if exists (
    select 1 from public.nutrition_label_captures where id = capture_one_deleted
  ) then
    raise exception 'soft-deleted label capture is still selectable by its owner';
  end if;

  -- Owner may update their own active capture (e.g. attach OCR text).
  update public.nutrition_label_captures
  set ocr_text = 'Protein 5g, Fat 2g'
  where id = capture_one_active;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'owner could not update their own active label capture';
  end if;

  -- A soft-deleted row cannot be updated further, even by its owner.
  update public.nutrition_label_captures
  set ocr_text = 'should not apply'
  where id = capture_one_deleted;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'a soft-deleted label capture was updated';
  end if;

  -- Cannot update another user's capture.
  update public.nutrition_label_captures
  set status = 'discarded'
  where id = capture_two;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'authenticated user updated another user''s label capture';
  end if;

  -- Cannot insert a capture on another user's behalf.
  begin
    insert into public.nutrition_label_captures (user_id, status)
    values ('11000000-0000-0000-0000-000000000002', 'draft');
    raise exception 'authenticated user inserted a label capture for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- product_review_events: owner can read their own event, not another user's.
  if not exists (
    select 1 from public.product_review_events
    where id = '13000000-0000-0000-0000-000000000001' and user_id = '11000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'owner cannot read their own product_review_events row';
  end if;

  if exists (
    select 1 from public.product_review_events where id = '13000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'authenticated user can read another user''s product_review_events row';
  end if;

  -- Cannot insert a review event on another user's behalf.
  begin
    insert into public.product_review_events (user_id, capture_id, event_type)
    values ('11000000-0000-0000-0000-000000000002', capture_one_active, 'tampered');
    raise exception 'authenticated user inserted a product_review_events row for another user';
  exception
    when insufficient_privilege then null;
  end;

  -- No UPDATE grant / policy on product_review_events: events are append-only.
  begin
    update public.product_review_events
    set event_type = 'tampered'
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'product_review_events rows must be append-only (update must fail)';
  exception
    when insufficient_privilege then null;
  end;
end $$;

rollback;
