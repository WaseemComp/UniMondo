-- CMS v3: page/section/block model (content-only; layout stays in code)
-- Safe for admins: required sections are defined by code and should not be deleted.

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null references public.cms_pages (slug) on delete cascade,
  section_key text not null,
  section_name text not null default '',
  section_type text not null default 'fixed',
  is_required boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_slug, section_key)
);

create table if not exists public.cms_content_blocks (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null references public.cms_pages (slug) on delete cascade,
  section_key text not null,
  block_key text not null,
  block_type text not null,
  -- content/media are locale-aware JSON objects, e.g. { "en": "...", "ar": "...", "de": "...", "fr": "..." }
  content jsonb not null default '{}'::jsonb,
  media jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_slug, section_key, block_key, sort_order)
);

create index if not exists cms_content_blocks_page_section_idx
  on public.cms_content_blocks (page_slug, section_key, is_active, sort_order);

alter table public.cms_pages enable row level security;
alter table public.cms_sections enable row level security;
alter table public.cms_content_blocks enable row level security;

drop trigger if exists cms_pages_set_updated_at on public.cms_pages;
create trigger cms_pages_set_updated_at
  before update on public.cms_pages
  for each row execute function public.set_updated_at();

drop trigger if exists cms_sections_set_updated_at on public.cms_sections;
create trigger cms_sections_set_updated_at
  before update on public.cms_sections
  for each row execute function public.set_updated_at();

drop trigger if exists cms_content_blocks_set_updated_at on public.cms_content_blocks;
create trigger cms_content_blocks_set_updated_at
  before update on public.cms_content_blocks
  for each row execute function public.set_updated_at();

-- Public reads: pages/sections/blocks are readable, but blocks should be filtered to is_active = true in app code.
drop policy if exists "cms_pages_select_public" on public.cms_pages;
create policy "cms_pages_select_public"
  on public.cms_pages for select
  to anon, authenticated
  using (true);

drop policy if exists "cms_sections_select_public" on public.cms_sections;
create policy "cms_sections_select_public"
  on public.cms_sections for select
  to anon, authenticated
  using (true);

drop policy if exists "cms_blocks_select_public" on public.cms_content_blocks;
create policy "cms_blocks_select_public"
  on public.cms_content_blocks for select
  to anon, authenticated
  using (is_active = true or public.is_cms_admin());

-- Writes: CMS admins only (via admin_profiles + is_cms_admin()).
drop policy if exists "cms_pages_write_admin" on public.cms_pages;
create policy "cms_pages_write_admin"
  on public.cms_pages for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "cms_sections_write_admin" on public.cms_sections;
create policy "cms_sections_write_admin"
  on public.cms_sections for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "cms_blocks_write_admin" on public.cms_content_blocks;
create policy "cms_blocks_write_admin"
  on public.cms_content_blocks for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- Seed canonical system pages (safe to re-run)
insert into public.cms_pages (slug, title, is_system) values
  ('home', 'Home', true),
  ('universities', 'Universities', true),
  ('countries', 'Countries', true),
  ('packages', 'Packages', true),
  ('courses', 'Language Courses', true),
  ('about', 'About', true),
  ('contact', 'Contact', true),
  ('blog', 'Blog', true)
on conflict (slug) do nothing;

