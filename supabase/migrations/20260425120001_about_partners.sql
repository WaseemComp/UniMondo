-- Partner logos / organisations on the public About page

create table if not exists public.about_partners (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  continent text not null default '',
  country text not null default '',
  region text not null default '',
  logo_url text,
  short_description text not null default '',
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists about_partners_published_sort_idx
  on public.about_partners (is_published, sort_order);

drop trigger if exists about_partners_set_updated_at on public.about_partners;
create trigger about_partners_set_updated_at
  before update on public.about_partners
  for each row execute function public.set_updated_at();

comment on table public.about_partners is 'Partner organisations shown on the About page (between Values and Team).';

alter table public.about_partners enable row level security;

drop policy if exists "about_partners_select_public" on public.about_partners;
create policy "about_partners_select_public"
  on public.about_partners for select
  to anon, authenticated
  using (is_published = true or public.is_cms_admin());

drop policy if exists "about_partners_write_admin" on public.about_partners;
create policy "about_partners_write_admin"
  on public.about_partners for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());
