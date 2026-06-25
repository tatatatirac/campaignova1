alter table public.marketing_plans
  add column calendar_status text not null default 'not_started'
    check (calendar_status in ('not_started', 'generating', 'ready', 'failed')),
  add column calendar_model text,
  add column calendar_generation_started_at timestamptz,
  add column calendar_generation_completed_at timestamptz,
  add column calendar_generation_error text;

