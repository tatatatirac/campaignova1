alter table public.marketing_plans
  add column generation_started_at timestamptz,
  add column generation_completed_at timestamptz,
  add column generation_error text,
  add column strategy_model text,
  add column strategy_approved_at timestamptz;

