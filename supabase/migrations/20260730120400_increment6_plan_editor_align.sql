-- Increment 6 plan editor align: columns required by the plan CRUD editor
-- (block transitions, tempo/RIR prescriptions) plus a single source-of-truth
-- `status` for personal record review, replacing the separate
-- `confirmed`/`dismissed` booleans while keeping them readable/writable for
-- any existing callers.

-- ---------------------------------------------------------------------------
-- workout_blocks: transition time between exercises (circuits/supersets)
-- ---------------------------------------------------------------------------

alter table public.workout_blocks
  add column if not exists transition_seconds integer
    check (transition_seconds is null or transition_seconds >= 0);

-- ---------------------------------------------------------------------------
-- workout_set_prescriptions: RIR + four-phase tempo (target_weight_kg and
-- target_rpe already exist from the initial engine migration)
-- ---------------------------------------------------------------------------

alter table public.workout_set_prescriptions
  add column if not exists target_rir numeric
    check (target_rir is null or (target_rir >= 0 and target_rir <= 10)),
  add column if not exists tempo_eccentric_seconds integer
    check (tempo_eccentric_seconds is null or tempo_eccentric_seconds >= 0),
  add column if not exists tempo_pause_bottom_seconds integer
    check (tempo_pause_bottom_seconds is null or tempo_pause_bottom_seconds >= 0),
  add column if not exists tempo_concentric_seconds integer
    check (tempo_concentric_seconds is null or tempo_concentric_seconds >= 0),
  add column if not exists tempo_pause_top_seconds integer
    check (tempo_pause_top_seconds is null or tempo_pause_top_seconds >= 0);

-- ---------------------------------------------------------------------------
-- personal_records: single `status` column instead of two independent
-- booleans. Backfill from the existing `confirmed`/`dismissed` values, then
-- keep all three in sync going forward via trigger so any code still reading
-- the booleans (or only writing `status`) stays correct.
-- ---------------------------------------------------------------------------

alter table public.personal_records
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'dismissed'));

update public.personal_records
set status = case
  when confirmed then 'confirmed'
  when dismissed then 'dismissed'
  else 'pending'
end
where status = 'pending';

create or replace function public.sync_personal_record_status()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if new.status is distinct from 'pending' then
      new.confirmed := (new.status = 'confirmed');
      new.dismissed := (new.status = 'dismissed');
    elsif new.confirmed then
      new.status := 'confirmed';
    elsif new.dismissed then
      new.status := 'dismissed';
    end if;
    return new;
  end if;

  -- UPDATE: whichever of status vs. the booleans actually changed wins; if
  -- both changed in the same statement, the explicit `status` write wins.
  if new.status is distinct from old.status then
    new.confirmed := (new.status = 'confirmed');
    new.dismissed := (new.status = 'dismissed');
  elsif new.confirmed is distinct from old.confirmed or new.dismissed is distinct from old.dismissed then
    if new.confirmed then
      new.status := 'confirmed';
    elsif new.dismissed then
      new.status := 'dismissed';
    else
      new.status := 'pending';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists personal_records_sync_status on public.personal_records;
create trigger personal_records_sync_status
before insert or update on public.personal_records
for each row execute function public.sync_personal_record_status();

comment on column public.personal_records.status is
  'Source of truth for PR review state; confirmed/dismissed booleans are kept in sync by trigger for backward compatibility.';
