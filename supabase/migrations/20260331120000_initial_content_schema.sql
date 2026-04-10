-- UniMondo: countries + program openings (PostgreSQL / Supabase–compatible)
-- Apply with: supabase db push   OR   psql $DATABASE_URL -f ...

-- Extensions commonly available on Supabase
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Region groups (filter dimension; matches app RegionGroup)
-- ---------------------------------------------------------------------------
create table if not exists public.region_groups (
  id smallserial primary key,
  label text not null unique,
  sort_order smallint not null default 0
);

comment on table public.region_groups is 'Geographic buckets used by countries and openings filters.';

-- ---------------------------------------------------------------------------
-- Country detail pages / destination browser
-- ---------------------------------------------------------------------------
create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region_group_id smallint not null references public.region_groups (id) on update cascade on delete restrict,
  highlighted boolean not null default false,
  why_study_there text not null,
  popular_universities text[] not null default '{}',
  living_cost_approx text not null,
  visa_info text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists countries_region_group_id_idx on public.countries (region_group_id);
create index if not exists countries_sort_order_idx on public.countries (sort_order);

comment on table public.countries is 'Per-country copy for destinations; popular_universities is a list of display strings.';

-- ---------------------------------------------------------------------------
-- Program openings (current openings board)
-- ---------------------------------------------------------------------------
create table if not exists public.program_openings (
  id text primary key,
  continent text not null default 'Europe',
  country text not null,
  region text not null,
  intake text not null,
  university text not null,
  logo_text text not null,
  program_name text not null,
  deadline date not null,
  tuition_range text not null,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_openings_country_idx on public.program_openings (country);
create index if not exists program_openings_region_idx on public.program_openings (region);
create index if not exists program_openings_intake_idx on public.program_openings (intake);
create index if not exists program_openings_deadline_idx on public.program_openings (deadline);
create index if not exists program_openings_published_idx on public.program_openings (is_published);

comment on table public.program_openings is 'Public program cards; id is a stable slug (e.g. it-bologna-data-fall-2026).';

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists countries_set_updated_at on public.countries;
create trigger countries_set_updated_at
  before update on public.countries
  for each row execute function public.set_updated_at();

drop trigger if exists program_openings_set_updated_at on public.program_openings;
create trigger program_openings_set_updated_at
  before update on public.program_openings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (Supabase: anon = public site, service_role = admin jobs)
-- ---------------------------------------------------------------------------
alter table public.region_groups enable row level security;
alter table public.countries enable row level security;
alter table public.program_openings enable row level security;

-- Public read for website
create policy "region_groups_select_public"
  on public.region_groups for select
  to anon, authenticated
  using (true);

create policy "countries_select_public"
  on public.countries for select
  to anon, authenticated
  using (true);

create policy "program_openings_select_public"
  on public.program_openings for select
  to anon, authenticated
  using (is_published = true);

-- Writes: use service role (server) or add authenticated policies when admin UI exists
-- Example for later (uncomment when you have an admin role):
-- create policy "countries_write_service" on public.countries for all
--   to service_role using (true) with check (true);
