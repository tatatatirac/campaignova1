alter table public.marketing_plans
  add column posts_status text not null default 'not_started'
    check (posts_status in ('not_started', 'generating', 'ready', 'failed')),
  add column posts_model text,
  add column posts_generation_started_at timestamptz,
  add column posts_generation_completed_at timestamptz,
  add column posts_generation_error text,
  add column posts_version integer not null default 0;

