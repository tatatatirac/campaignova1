alter table public.marketing_plans
  add column landing_page_status text not null default 'not_started'
    check (landing_page_status in ('not_started', 'generating', 'ready', 'failed')),
  add column landing_page_model text,
  add column landing_page_generation_started_at timestamptz,
  add column landing_page_generation_completed_at timestamptz,
  add column landing_page_generation_error text,
  add column landing_page_version integer not null default 0;
