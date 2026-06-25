alter table public.profiles
  add column app_role text not null default 'user'
    check (app_role in ('user', 'admin'));

alter table public.audit_logs
  add column severity text not null default 'info'
    check (severity in ('info', 'warning', 'error', 'critical'));

create index audit_logs_created_at_idx
  on public.audit_logs(created_at desc);
create index audit_logs_action_created_idx
  on public.audit_logs(action, created_at desc);
create index audit_logs_severity_created_idx
  on public.audit_logs(severity, created_at desc);
create index marketing_plans_updated_at_idx
  on public.marketing_plans(updated_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    severity,
    metadata
  )
  values (
    new.id,
    'user.created',
    'profile',
    new.id::text,
    'info',
    jsonb_build_object('email_confirmed', new.email_confirmed_at is not null)
  );

  return new;
end;
$$;

create or replace function public.audit_company_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid := coalesce(new.owner_id, old.owner_id);
  v_company_id uuid := coalesce(new.id, old.id);
  v_action text;
  v_name text := coalesce(new.name, old.name);
begin
  v_action := case tg_op
    when 'INSERT' then 'company.created'
    when 'UPDATE' then 'company.updated'
    else 'company.deleted'
  end;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    severity,
    metadata
  )
  values (
    v_owner_id,
    v_action,
    'company',
    v_company_id::text,
    case when tg_op = 'DELETE' then 'warning' else 'info' end,
    jsonb_build_object('name', v_name)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger audit_company_changes
  after insert or update or delete on public.companies
  for each row execute procedure public.audit_company_change();

create or replace function public.audit_profile_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.app_role is distinct from new.app_role then
    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      severity,
      metadata
    )
    values (
      new.id,
      'profile.role_changed',
      'profile',
      new.id::text,
      'warning',
      jsonb_build_object(
        'previous_role', old.app_role,
        'new_role', new.app_role
      )
    );
  end if;

  return new;
end;
$$;

create trigger audit_profile_role_changes
  after update of app_role on public.profiles
  for each row execute procedure public.audit_profile_role_change();

create or replace function public.audit_ai_request_completion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'reserved' and new.status in ('succeeded', 'released') then
    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      severity,
      metadata
    )
    values (
      new.owner_id,
      case
        when new.status = 'succeeded' then 'ai.request_succeeded'
        else 'ai.request_released'
      end,
      'ai_request',
      new.id::text,
      case when new.status = 'released' then 'warning' else 'info' end,
      jsonb_build_object(
        'operation', new.operation,
        'is_regeneration', new.is_regeneration,
        'period_start', new.period_start
      )
    );
  end if;

  return new;
end;
$$;

create trigger audit_ai_request_completions
  after update of status on public.ai_request_reservations
  for each row execute procedure public.audit_ai_request_completion();

create or replace function public.audit_plan_generation_failures()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'failed' then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, severity, metadata
    ) values (
      new.owner_id,
      'generation.strategy_failed',
      'marketing_plan',
      new.id::text,
      'error',
      jsonb_build_object(
        'company_id', new.company_id,
        'error', new.generation_error
      )
    );
  end if;

  if old.calendar_status is distinct from new.calendar_status
    and new.calendar_status = 'failed' then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, severity, metadata
    ) values (
      new.owner_id,
      'generation.calendar_failed',
      'marketing_plan',
      new.id::text,
      'error',
      jsonb_build_object(
        'company_id', new.company_id,
        'error', new.calendar_generation_error
      )
    );
  end if;

  if old.posts_status is distinct from new.posts_status
    and new.posts_status = 'failed' then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, severity, metadata
    ) values (
      new.owner_id,
      'generation.posts_failed',
      'marketing_plan',
      new.id::text,
      'error',
      jsonb_build_object(
        'company_id', new.company_id,
        'error', new.posts_generation_error
      )
    );
  end if;

  if old.emails_status is distinct from new.emails_status
    and new.emails_status = 'failed' then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, severity, metadata
    ) values (
      new.owner_id,
      'generation.emails_failed',
      'marketing_plan',
      new.id::text,
      'error',
      jsonb_build_object(
        'company_id', new.company_id,
        'error', new.emails_generation_error
      )
    );
  end if;

  if old.landing_page_status is distinct from new.landing_page_status
    and new.landing_page_status = 'failed' then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, severity, metadata
    ) values (
      new.owner_id,
      'generation.landing_page_failed',
      'marketing_plan',
      new.id::text,
      'error',
      jsonb_build_object(
        'company_id', new.company_id,
        'error', new.landing_page_generation_error
      )
    );
  end if;

  if old.sales_pitch_status is distinct from new.sales_pitch_status
    and new.sales_pitch_status = 'failed' then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, severity, metadata
    ) values (
      new.owner_id,
      'generation.sales_pitch_failed',
      'marketing_plan',
      new.id::text,
      'error',
      jsonb_build_object(
        'company_id', new.company_id,
        'error', new.sales_pitch_generation_error
      )
    );
  end if;

  if old.kpis_status is distinct from new.kpis_status
    and new.kpis_status = 'failed' then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, severity, metadata
    ) values (
      new.owner_id,
      'generation.execution_review_failed',
      'marketing_plan',
      new.id::text,
      'error',
      jsonb_build_object(
        'company_id', new.company_id,
        'error', new.kpis_generation_error
      )
    );
  end if;

  return new;
end;
$$;

create trigger audit_plan_generation_failure_changes
  after update on public.marketing_plans
  for each row execute procedure public.audit_plan_generation_failures();
