alter table public.marketing_plans
  add column sales_pitch_status text not null default 'not_started'
    check (sales_pitch_status in ('not_started', 'generating', 'ready', 'failed')),
  add column sales_pitch_model text,
  add column sales_pitch_generation_started_at timestamptz,
  add column sales_pitch_generation_completed_at timestamptz,
  add column sales_pitch_generation_error text,
  add column sales_pitch_version integer not null default 0;
