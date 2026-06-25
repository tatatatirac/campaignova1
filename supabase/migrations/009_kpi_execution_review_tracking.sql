alter table public.marketing_plans
  add column kpis_status text not null default 'not_started'
    check (kpis_status in ('not_started', 'generating', 'ready', 'failed')),
  add column kpis_model text,
  add column kpis_generation_started_at timestamptz,
  add column kpis_generation_completed_at timestamptz,
  add column kpis_generation_error text,
  add column kpis_version integer not null default 0;
