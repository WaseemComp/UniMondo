-- CMS v2: programs (current openings), countries extensions, blogs, site_settings, RLS, realtime

-- ---------------------------------------------------------------------------
-- Helper: admin check via admin_profiles (link Auth users in dashboard)
-- ---------------------------------------------------------------------------
create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
  );
$$;

comment on function public.is_cms_admin() is 'True when auth.uid() has a row in admin_profiles (CMS write access).';

grant execute on function public.is_cms_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- programs (public “Current Openings” / homepage featured)
-- ---------------------------------------------------------------------------
create table if not exists public.programs (
  id text primary key,
  title text not null,
  university text not null,
  country text not null,
  degree text not null check (degree in ('bachelor', 'master')),
  intake text not null,
  deadline date not null,
  tuition_range text not null,
  description text not null default '',
  logo_url text,
  logo_text text,
  continent text not null default 'Europe',
  region text not null default '',
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists programs_country_idx on public.programs (country);
create index if not exists programs_published_sort_idx on public.programs (is_published, sort_order);

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

comment on table public.programs is 'Published programs for openings board and homepage; id is a stable slug.';

-- Migrate from legacy program_openings when present
insert into public.programs (
  id, title, university, country, degree, intake, deadline, tuition_range, description,
  logo_url, logo_text, continent, region, is_published, sort_order
)
select
  po.id,
  po.program_name,
  po.university,
  po.country,
  'master',
  po.intake,
  po.deadline::date,
  po.tuition_range,
  '',
  null,
  po.logo_text,
  coalesce(po.continent, 'Europe'),
  coalesce(po.region, ''),
  coalesce(po.is_published, true),
  coalesce(po.sort_order, 0)
from public.program_openings po
on conflict (id) do nothing;

alter table public.programs enable row level security;

drop policy if exists "programs_select_public" on public.programs;
create policy "programs_select_public"
  on public.programs for select
  to anon, authenticated
  using (is_published = true or public.is_cms_admin());

drop policy if exists "programs_write_admin" on public.programs;
create policy "programs_write_admin"
  on public.programs for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- Service role bypasses RLS (server actions)

-- ---------------------------------------------------------------------------
-- countries: CMS fields (keep existing columns; add new)
-- ---------------------------------------------------------------------------
alter table public.countries add column if not exists slug text;
alter table public.countries add column if not exists flag_emoji text;
alter table public.countries add column if not exists description text;
alter table public.countries add column if not exists why_study text;
alter table public.countries add column if not exists living_cost text;
alter table public.countries add column if not exists popular_unis jsonb not null default '[]'::jsonb;

update public.countries c
set
  why_study = coalesce(nullif(trim(c.why_study), ''), c.why_study_there),
  living_cost = coalesce(nullif(trim(c.living_cost), ''), c.living_cost_approx),
  popular_unis = case
    when c.popular_unis = '[]'::jsonb and c.popular_universities is not null
 then to_jsonb(c.popular_universities)
    else c.popular_unis
  end,
  slug = coalesce(
    nullif(trim(c.slug), ''),
    lower(regexp_replace(trim(c.name), '[^a-zA-Z0-9]+', '-', 'g'))
  )
where true;

create unique index if not exists countries_slug_unique on public.countries (slug);

drop policy if exists "countries_write_admin" on public.countries;
create policy "countries_write_admin"
  on public.countries for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- blogs
-- ---------------------------------------------------------------------------
create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists blogs_set_updated_at on public.blogs;
create trigger blogs_set_updated_at
  before update on public.blogs
  for each row execute function public.set_updated_at();

alter table public.blogs enable row level security;

drop policy if exists "blogs_select_public" on public.blogs;
create policy "blogs_select_public"
  on public.blogs for select
  to anon, authenticated
  using (published = true or public.is_cms_admin());

drop policy if exists "blogs_write_admin" on public.blogs;
create policy "blogs_write_admin"
  on public.blogs for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- site_settings (singleton ticker)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  ticker_text text not null default '',
  ticker_active boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

insert into public.site_settings (id, ticker_text, ticker_active) values
  (1, 'Fall 2026 & Spring 2027 intakes are open — explore programs and book a free consultation.', true)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select_public" on public.site_settings;
create policy "site_settings_select_public"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "site_settings_write_admin" on public.site_settings;
create policy "site_settings_write_admin"
  on public.site_settings for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- Link first admin user (if present in auth.users)
-- ---------------------------------------------------------------------------
insert into public.admin_profiles (user_id, email)
select u.id, u.email::text
from auth.users u
where lower(u.email::text) = 'adminone@unimondo.com'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Realtime (Supabase hosted)
-- ---------------------------------------------------------------------------
do $pub$
begin
  begin
    alter publication supabase_realtime add table public.programs;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.countries;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.site_settings;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.blogs;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$pub$;
