-- UniMondo: Unified submissions + language courses table (Supabase/Postgres)

-- ---------------------------------------------------------------------------
-- 1) Unified submissions: extend public.applications
-- ---------------------------------------------------------------------------
alter table public.applications
  add column if not exists application_type text default 'university';

-- Keep queries fast for filtering in admin dashboard.
create index if not exists idx_applications_type on public.applications (application_type);

-- Backfill any existing NULLs (defensive; default handles new rows).
update public.applications
set application_type = 'university'
where application_type is null;

-- ---------------------------------------------------------------------------
-- 2) Language courses catalog (multilingual fields via JSONB)
-- ---------------------------------------------------------------------------
create table if not exists public.language_courses (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,
  country text,
  city text,
  duration text,
  price numeric,
  description jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

comment on table public.language_courses is 'Language courses catalog; title/description are JSONB multilingual fields.';

create index if not exists language_courses_active_idx on public.language_courses (is_active);

alter table public.language_courses enable row level security;

drop policy if exists "language_courses_select_public_active" on public.language_courses;
create policy "language_courses_select_public_active"
  on public.language_courses for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "language_courses_write_admin" on public.language_courses;
create policy "language_courses_write_admin"
  on public.language_courses for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());
