-- Increment 4 schema alignment: additive columns needed by the meal-focus
-- UI (recipes, soft-deleted templates, template provenance on meal logs,
-- and food/alias source metadata). Every change is additive (IF NOT EXISTS /
-- nullable ALTER) so this migration is safe to run after
-- 20260727120000_increment4_nutrition.sql and its curated seed.

alter table public.recipes
  add column if not exists final_cooked_weight_g numeric;

do $$ begin
  alter table public.recipes
    add constraint recipes_final_cooked_weight_g_check
    check (final_cooked_weight_g is null or final_cooked_weight_g > 0);
exception when duplicate_object then null;
end $$;

alter table public.recipes
  add column if not exists default_serving_g numeric;

do $$ begin
  alter table public.recipes
    add constraint recipes_default_serving_g_check
    check (default_serving_g is null or default_serving_g > 0);
exception when duplicate_object then null;
end $$;

alter table public.meal_templates
  add column if not exists deleted_at timestamptz;

alter table public.meal_logs
  add column if not exists source_template_id uuid
  references public.meal_templates (id) on delete set null;

alter table public.food_nutrients
  add column if not exists source public.food_source not null default 'other';

alter table public.food_nutrients
  add column if not exists source_reference text;

alter table public.food_aliases
  add column if not exists locale text not null default 'en';

-- ---------------------------------------------------------------------------
-- Soft-deleted templates must not surface through normal reads. RLS select
-- policies are additive predicates, so replace the existing select policy
-- rather than layering a second one.
-- ---------------------------------------------------------------------------

drop policy if exists meal_templates_select_own on public.meal_templates;
create policy meal_templates_select_own on public.meal_templates
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);

create index if not exists meal_templates_user_type_active_idx
  on public.meal_templates (user_id, meal_type)
  where deleted_at is null;

create index if not exists meal_logs_source_template_idx
  on public.meal_logs (source_template_id)
  where source_template_id is not null;
