-- CMS: editable site copy + news ticker; optional admin profile link to auth.users

create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  label text,
  page text not null default 'general',
  section text not null default 'default',
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.site_content is 'Key/value copy for public pages (hero, about blurbs, etc.).';

create table if not exists public.news_ticker_items (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  href text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.news_ticker_items is 'Optional headline strip / announcements on the public site.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists news_ticker_items_set_updated_at on public.news_ticker_items;
create trigger news_ticker_items_set_updated_at
  before update on public.news_ticker_items
  for each row execute function public.set_updated_at();

-- Optional: link Supabase Auth users allowed to use /admin (alternative to env ADMIN_EMAILS)
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.admin_profiles is 'Users granted admin UI access (in addition to ADMIN_EMAILS env).';

alter table public.site_content enable row level security;
alter table public.news_ticker_items enable row level security;
alter table public.admin_profiles enable row level security;

create policy "site_content_select_public"
  on public.site_content for select
  to anon, authenticated
  using (true);

create policy "news_ticker_select_published"
  on public.news_ticker_items for select
  to anon, authenticated
  using (is_published = true);

-- Admin profiles: users can read own row only (optional; service role used for admin writes)
create policy "admin_profiles_select_own"
  on public.admin_profiles for select
  to authenticated
  using (auth.uid() = user_id);

-- Seed default homepage keys (safe to re-run)
insert into public.site_content (key, value, label, page, section, sort_order) values
  ('home.hero.title', 'Your Future Knows No Borders', 'Home hero — main headline', 'home', 'hero', 1),
  ('home.hero.subtitle', 'Personalized admissions guidance, visa expertise, and full student support — from first call to campus arrival.', 'Home hero — paragraph under headline', 'home', 'hero', 2),
  ('home.hero.cta_explore', 'Explore Programs', 'Home hero — primary button label', 'home', 'hero', 3),
  ('home.hero.cta_apply', 'Begin Your Application', 'Home hero — secondary button label', 'home', 'hero', 4),
  ('home.ticker.enabled', 'true', 'Show news ticker under header (true/false)', 'home', 'ticker', 0)
on conflict (key) do nothing;

do $seed$
begin
  if not exists (select 1 from public.news_ticker_items limit 1) then
    insert into public.news_ticker_items (message, href, sort_order, is_published) values
      ('Fall 2026 & Spring 2027 intakes now open — book a free consultation.', '/contact', 1, true),
      ('New programs added in Italy, Germany & Netherlands — see Current Openings.', '/current-openings', 2, true);
  end if;
end $seed$;
