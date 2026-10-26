-- Disposable local PostgreSQL fixture only; never run against production.
create role anon; create role authenticated; create role service_role bypassrls;
create function public.is_cms_admin() returns boolean language sql as $$ select true $$;
create table public.site_content (
  key text primary key, value text not null, label text, page text, section text,
  sort_order integer not null default 0, updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
grant select, insert, update, delete on public.site_content to anon, authenticated, service_role;
create policy site_content_select_public on public.site_content for select to anon, authenticated using (true);
