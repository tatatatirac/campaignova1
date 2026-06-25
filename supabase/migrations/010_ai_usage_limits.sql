create table public.ai_usage_monthly (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  requests_used integer not null default 0 check (requests_used >= 0),
  regenerations_used integer not null default 0
    check (regenerations_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, period_start)
);

create table public.api_rate_limits (
  rate_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (rate_key, window_start)
);

create table public.ai_request_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  operation text not null,
  is_regeneration boolean not null default false,
  status text not null default 'reserved'
    check (status in ('reserved', 'succeeded', 'released')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index ai_request_reservations_owner_created_idx
  on public.ai_request_reservations(owner_id, created_at desc);
create index api_rate_limits_expires_idx
  on public.api_rate_limits(expires_at);

alter table public.ai_usage_monthly enable row level security;
alter table public.api_rate_limits enable row level security;
alter table public.ai_request_reservations enable row level security;

revoke all on public.ai_usage_monthly from anon, authenticated;
revoke all on public.api_rate_limits from anon, authenticated;
revoke all on public.ai_request_reservations from anon, authenticated;

create or replace function public.reserve_ai_request(
  p_owner_id uuid,
  p_operation text,
  p_is_regeneration boolean,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.subscription_plan;
  v_request_limit integer;
  v_regeneration_limit integer;
  v_period_start date;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_user_count integer;
  v_ip_count integer;
  v_requests_used integer;
  v_regenerations_used integer;
  v_reservation_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if p_owner_id is null or p_operation is null or length(p_operation) > 80 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_request'
    );
  end if;

  select subscription_plan
  into v_plan
  from public.profiles
  where id = p_owner_id;

  if v_plan is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'profile_not_found'
    );
  end if;

  v_request_limit := case v_plan
    when 'starter' then 12
    when 'growth' then 34
    when 'director' then 95
  end;
  v_regeneration_limit := case v_plan
    when 'starter' then 5
    when 'growth' then 20
    when 'director' then 60
  end;
  v_period_start := date_trunc('month', v_now)::date;
  v_window_start :=
    to_timestamp(floor(extract(epoch from v_now) / 600) * 600);
  v_window_end := v_window_start + interval '10 minutes';

  insert into public.api_rate_limits (
    rate_key,
    window_start,
    request_count,
    expires_at
  )
  values (
    'user:' || p_owner_id::text,
    v_window_start,
    1,
    v_window_end + interval '1 hour'
  )
  on conflict (rate_key, window_start)
  do update set
    request_count = public.api_rate_limits.request_count + 1,
    updated_at = v_now
  returning request_count into v_user_count;

  if v_user_count > 12 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit',
      'retry_after_seconds',
        greatest(1, ceil(extract(epoch from (v_window_end - v_now)))::integer),
      'request_limit', v_request_limit,
      'regeneration_limit', v_regeneration_limit
    );
  end if;

  insert into public.api_rate_limits (
    rate_key,
    window_start,
    request_count,
    expires_at
  )
  values (
    'ip:' || coalesce(nullif(p_ip_hash, ''), 'unknown'),
    v_window_start,
    1,
    v_window_end + interval '1 hour'
  )
  on conflict (rate_key, window_start)
  do update set
    request_count = public.api_rate_limits.request_count + 1,
    updated_at = v_now
  returning request_count into v_ip_count;

  if v_ip_count > 30 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit',
      'retry_after_seconds',
        greatest(1, ceil(extract(epoch from (v_window_end - v_now)))::integer),
      'request_limit', v_request_limit,
      'regeneration_limit', v_regeneration_limit
    );
  end if;

  insert into public.ai_usage_monthly (owner_id, period_start)
  values (p_owner_id, v_period_start)
  on conflict (owner_id, period_start) do nothing;

  select requests_used, regenerations_used
  into v_requests_used, v_regenerations_used
  from public.ai_usage_monthly
  where owner_id = p_owner_id and period_start = v_period_start
  for update;

  if v_requests_used >= v_request_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'requests_used', v_requests_used,
      'request_limit', v_request_limit,
      'regenerations_used', v_regenerations_used,
      'regeneration_limit', v_regeneration_limit
    );
  end if;

  if p_is_regeneration and v_regenerations_used >= v_regeneration_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'regeneration_limit',
      'requests_used', v_requests_used,
      'request_limit', v_request_limit,
      'regenerations_used', v_regenerations_used,
      'regeneration_limit', v_regeneration_limit
    );
  end if;

  update public.ai_usage_monthly
  set
    requests_used = requests_used + 1,
    regenerations_used =
      regenerations_used + case when p_is_regeneration then 1 else 0 end,
    updated_at = v_now
  where owner_id = p_owner_id and period_start = v_period_start
  returning requests_used, regenerations_used
  into v_requests_used, v_regenerations_used;

  insert into public.ai_request_reservations (
    owner_id,
    period_start,
    operation,
    is_regeneration
  )
  values (
    p_owner_id,
    v_period_start,
    p_operation,
    p_is_regeneration
  )
  returning id into v_reservation_id;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'reserved',
    'reservation_id', v_reservation_id,
    'requests_used', v_requests_used,
    'request_limit', v_request_limit,
    'regenerations_used', v_regenerations_used,
    'regeneration_limit', v_regeneration_limit
  );
end;
$$;

create or replace function public.complete_ai_request(
  p_reservation_id uuid,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.ai_request_reservations%rowtype;
begin
  select *
  into v_reservation
  from public.ai_request_reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null or v_reservation.status <> 'reserved' then
    return;
  end if;

  if p_succeeded then
    update public.ai_request_reservations
    set status = 'succeeded', completed_at = clock_timestamp()
    where id = p_reservation_id;
    return;
  end if;

  update public.ai_usage_monthly
  set
    requests_used = greatest(0, requests_used - 1),
    regenerations_used = greatest(
      0,
      regenerations_used -
        case when v_reservation.is_regeneration then 1 else 0 end
    ),
    updated_at = clock_timestamp()
  where owner_id = v_reservation.owner_id
    and period_start = v_reservation.period_start;

  update public.ai_request_reservations
  set status = 'released', completed_at = clock_timestamp()
  where id = p_reservation_id;
end;
$$;

revoke all on function public.reserve_ai_request(uuid, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.complete_ai_request(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid, text, boolean, text)
  to service_role;
grant execute on function public.complete_ai_request(uuid, boolean)
  to service_role;

