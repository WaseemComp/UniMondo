-- Phase 03: additive metadata only. Review/apply manually before release.
-- Existing buckets, storage policies, content records and users are not changed.
create table public.cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  object_path text unique,
  source text not null check (source in ('upload', 'legacy', 'repository')),
  original_name text not null,
  alt_text text not null default '',
  category text not null check (category in ('hero', 'destinations', 'universities', 'stories', 'general')),
  width integer check (width > 0),
  height integer check (height > 0),
  byte_size bigint check (byte_size > 0),
  mime_type text,
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'failed')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check ((source = 'upload' and object_path is not null and object_path ~ '^cms-library/[0-9a-f-]{36}\.webp$') or (source <> 'upload' and object_path is null))
);
create index cms_media_assets_category_created_idx on public.cms_media_assets (category, created_at desc);
alter table public.cms_media_assets enable row level security;
revoke all on public.cms_media_assets from public, anon, authenticated, service_role;
grant select, insert, update on public.cms_media_assets to service_role;
comment on table public.cms_media_assets is 'Website image metadata. Server-controlled operations with existing CMS permissions; archiving preserves objects and URLs. No hard deletion.';
