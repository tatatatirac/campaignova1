alter table public.marketing_plans
  add column emails_status text not null default 'not_started'
    check (emails_status in ('not_started', 'generating', 'ready', 'failed')),
  add column emails_model text,
  add column emails_generation_started_at timestamptz,
  add column emails_generation_completed_at timestamptz,
  add column emails_generation_error text,
  add column emails_version integer not null default 0;
