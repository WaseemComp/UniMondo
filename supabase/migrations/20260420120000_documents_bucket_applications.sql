-- Storage bucket "documents" + normalized applications + per-file documents table

-- ---------------------------------------------------------------------------
-- Storage: public bucket "documents" (application uploads via service role API)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documents_bucket_select_public" on storage.objects;
create policy "documents_bucket_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'documents');

drop policy if exists "documents_bucket_service_all" on storage.objects;
-- Service role bypasses RLS; these policies help if you later use authenticated uploads
drop policy if exists "documents_bucket_admin_all" on storage.objects;
create policy "documents_bucket_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documents' and public.is_cms_admin())
  with check (bucket_id = 'documents' and public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- applications (normalized + payload snapshot for compatibility)
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  personal_info jsonb not null default '{}'::jsonb,
  academic_info jsonb not null default '{}'::jsonb,
  study_preferences jsonb not null default '{}'::jsonb,
  selected_package text,
  selected_addons jsonb not null default '[]'::jsonb,
  screening_tag text,
  review_status text not null default 'Pending',
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists applications_tracking_id_idx on public.applications (tracking_id);
create index if not exists applications_submitted_at_idx on public.applications (submitted_at desc);
create index if not exists applications_review_status_idx on public.applications (review_status);

comment on table public.applications is 'Student applications; normalized jsonb + payload snapshot.';

alter table public.applications enable row level security;

drop policy if exists "applications_select_admin" on public.applications;
create policy "applications_select_admin"
  on public.applications for select
  to authenticated
  using (public.is_cms_admin());

drop policy if exists "applications_write_admin" on public.applications;
create policy "applications_write_admin"
  on public.applications for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- Inserts from Next.js API use service role (bypasses RLS)

-- ---------------------------------------------------------------------------
-- documents: uploaded file metadata (per user request name)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  category text not null,
  description text,
  uploaded_at timestamptz not null default now()
);

create index if not exists documents_application_id_idx on public.documents (application_id);
create index if not exists documents_category_idx on public.documents (category);

comment on table public.documents is 'Application file uploads; files live in storage bucket documents.';

alter table public.documents enable row level security;

drop policy if exists "documents_select_admin" on public.documents;
create policy "documents_select_admin"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id and public.is_cms_admin()
    )
  );

drop policy if exists "documents_write_admin" on public.documents;
create policy "documents_write_admin"
  on public.documents for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());
