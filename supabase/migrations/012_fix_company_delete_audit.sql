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
    case when tg_op = 'DELETE' then null else v_owner_id end,
    v_action,
    'company',
    v_company_id::text,
    case when tg_op = 'DELETE' then 'warning' else 'info' end,
    jsonb_build_object(
      'name', v_name,
      'previous_owner_id', v_owner_id
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

