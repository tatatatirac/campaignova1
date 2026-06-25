create extension if not exists "pgcrypto";

create type public.subscription_plan as enum ('starter', 'growth', 'director');
create type public.plan_status as enum ('draft', 'generating', 'ready', 'failed');
create type public.video_release_status as enum ('scheduled', 'available', 'downloaded', 'published');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  timezone text not null default 'UTC',
  subscription_plan public.subscription_plan not null default 'starter',
  is_beta_user boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  industry text not null,
  offer text not null,
  price_context text,
  audience text not null,
  location text not null,
  language text not null default 'English',
  tone text not null,
  primary_goal text not null,
  primary_cta text not null,
  website_url text,
  competitors text[] not null default '{}',
  monthly_budget numeric(12,2),
  differentiator text,
  active_channels text[] not null default '{}',
  logo_path text,
  brand_colors jsonb not null default '[]',
  brand_fonts jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  status public.plan_status not null default 'draft',
  strategy jsonb,
  content_calendar jsonb,
  posts jsonb,
  video_scripts jsonb,
  emails jsonb,
  landing_page jsonb,
  sales_pitch jsonb,
  kpis jsonb,
  generation_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, month)
);

create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  industry_tags text[] not null default '{}',
  platform_tags text[] not null default '{}',
  duration_seconds integer not null check (duration_seconds > 0),
  storage_path text not null unique,
  preview_path text not null,
  thumbnail_path text,
  is_active boolean not null default true,
  license_notes text,
  created_at timestamptz not null default now()
);

create table public.video_releases (
  id uuid primary key default gen_random_uuid(),
  marketing_plan_id uuid not null references public.marketing_plans(id) on delete cascade,
  video_asset_id uuid not null references public.video_assets(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  release_at timestamptz not null,
  publish_at timestamptz not null,
  platform text not null,
  caption text not null,
  call_to_action text not null,
  status public.video_release_status not null default 'scheduled',
  unlocked_early_at timestamptz,
  downloaded_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (marketing_plan_id, video_asset_id)
);

create table public.usage_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  event_type text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'brand-assets',
    'brand-assets',
    false,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'video-previews',
    'video-previews',
    false,
    52428800,
    array['video/mp4', 'video/webm']
  ),
  (
    'video-assets',
    'video-assets',
    false,
    262144000,
    array['video/mp4', 'video/webm']
  )
on conflict (id) do nothing;

create index companies_owner_id_idx on public.companies(owner_id);
create index marketing_plans_owner_id_idx on public.marketing_plans(owner_id);
create index marketing_plans_company_month_idx on public.marketing_plans(company_id, month);
create index video_releases_owner_publish_idx on public.video_releases(owner_id, publish_at);
create index usage_events_owner_created_idx on public.usage_events(owner_id, created_at);

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.marketing_plans enable row level security;
alter table public.video_assets enable row level security;
alter table public.video_releases enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "companies_manage_own" on public.companies
  for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create policy "marketing_plans_read_own" on public.marketing_plans
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create policy "video_assets_read_active" on public.video_assets
  for select to authenticated
  using (is_active = true);

create policy "video_releases_read_own" on public.video_releases
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create policy "usage_events_read_own" on public.usage_events
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create policy "brand_assets_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "brand_assets_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "brand_assets_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "brand_assets_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

revoke all on public.profiles from anon, authenticated;
revoke all on public.companies from anon, authenticated;
revoke all on public.marketing_plans from anon, authenticated;
revoke all on public.video_assets from anon, authenticated;
revoke all on public.video_releases from anon, authenticated;
revoke all on public.usage_events from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, timezone) on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select on public.marketing_plans to authenticated;
grant select on public.video_assets to authenticated;
grant select on public.video_releases to authenticated;
grant select on public.usage_events to authenticated;

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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
