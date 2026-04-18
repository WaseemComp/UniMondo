-- Featured universities for /current-openings (CMS-managed, images in storage)

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.featured_universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  flag_emoji text not null default '',
  prestige_line text not null default '',
  qs_label text,
  hero_image_url text not null default '',
  hero_image_alt text not null default '',
  logo_url text,
  logo_initials text not null default '',
  programs jsonb not null default '[]'::jsonb,
  apply_program_summary text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists featured_universities_published_sort_idx
  on public.featured_universities (is_published, sort_order);

drop trigger if exists featured_universities_set_updated_at on public.featured_universities;
create trigger featured_universities_set_updated_at
  before update on public.featured_universities
  for each row execute function public.set_updated_at();

comment on table public.featured_universities is 'Curated spotlight universities on the Featured Universities & Programs page; programs is JSON array of {name, tuition_range}.';

alter table public.featured_universities enable row level security;

drop policy if exists "featured_universities_select_public" on public.featured_universities;
create policy "featured_universities_select_public"
  on public.featured_universities for select
  to anon, authenticated
  using (is_published = true or public.is_cms_admin());

drop policy if exists "featured_universities_write_admin" on public.featured_universities;
create policy "featured_universities_write_admin"
  on public.featured_universities for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- Seed (matches previous hardcoded defaults; safe if table already has rows)
-- ---------------------------------------------------------------------------
insert into public.featured_universities (
  name, country, flag_emoji, prestige_line, qs_label,
  hero_image_url, hero_image_alt, logo_initials, programs, sort_order
)
select * from (values
  (
    'University of Bologna',
    'Italy',
    '🇮🇹',
    'Founded in 1088 — the oldest university in the Western world',
    'QS World #138',
    'https://images.unsplash.com/photo-1529154036614-a60975f5c760?auto=format&fit=crop&w=1200&q=80',
    'Historic Italian university architecture and colonnades',
    'Unibo',
    '[
      {"name": "MSc Data Science", "tuition_range": "EUR 2,500 – 4,200 / yr"},
      {"name": "MSc International Relations", "tuition_range": "EUR 2,200 – 3,800 / yr"},
      {"name": "Bachelor Economics", "tuition_range": "EUR 2,000 – 3,500 / yr"}
    ]'::jsonb,
    0
  ),
  (
    'Politecnico di Milano',
    'Italy',
    '🇮🇹',
    'Italy’s leading technical university — design, engineering & architecture',
    'QS World #98',
    'https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=1200&q=80',
    'Modern architecture and European city study environment',
    'PoliMi',
    '[
      {"name": "MSc Design for Digital Futures", "tuition_range": "EUR 3,900 – 6,200 / yr"},
      {"name": "MSc Mechanical Engineering", "tuition_range": "EUR 3,500 – 5,800 / yr"},
      {"name": "MSc Architecture", "tuition_range": "EUR 3,800 – 6,000 / yr"}
    ]'::jsonb,
    1
  ),
  (
    'Sapienza University of Rome',
    'Italy',
    '🇮🇹',
    'Founded in 1303 — Europe’s largest classical university',
    'QS World #128',
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
    'Italian coastline and study-abroad atmosphere',
    'SAP',
    '[
      {"name": "MSc Artificial Intelligence", "tuition_range": "EUR 2,800 – 4,500 / yr"},
      {"name": "MSc Civil Engineering", "tuition_range": "EUR 2,500 – 4,000 / yr"},
      {"name": "Bachelor Political Science", "tuition_range": "EUR 2,000 – 3,200 / yr"}
    ]'::jsonb,
    2
  ),
  (
    'TU Munich',
    'Germany',
    '🇩🇪',
    'Germany’s top-ranked technical university — research & industry links',
    'QS World #22',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    'Graduates celebrating academic achievement',
    'TUM',
    '[
      {"name": "MSc Artificial Intelligence", "tuition_range": "EUR 0 – 3,500 / yr"},
      {"name": "MSc Informatics", "tuition_range": "EUR 0 – 3,200 / yr"},
      {"name": "MSc Management & Technology", "tuition_range": "EUR 0 – 4,000 / yr"}
    ]'::jsonb,
    3
  ),
  (
    'University of Szeged',
    'Hungary',
    '🇭🇺',
    'Hungary’s flagship research university — medicine, sciences & humanities',
    'QS World #500–600 band',
    'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?auto=format&fit=crop&w=1200&q=80',
    'European university campus and autumn trees',
    'SZTE',
    '[
      {"name": "MSc Computer Science", "tuition_range": "EUR 2,500 – 4,500 / yr"},
      {"name": "General Medicine (MD)", "tuition_range": "EUR 12,000 – 15,000 / yr"},
      {"name": "BSc Business Administration", "tuition_range": "EUR 2,000 – 3,500 / yr"}
    ]'::jsonb,
    4
  ),
  (
    'Sorbonne University',
    'France',
    '🇫🇷',
    'Historic Parisian excellence — arts, science & medicine on one campus',
    'QS World #63',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    'Paris skyline and academic heritage',
    'SU',
    '[
      {"name": "LLM International Business Law", "tuition_range": "EUR 4,000 – 7,800 / yr"},
      {"name": "MSc Physics", "tuition_range": "EUR 3,500 – 6,000 / yr"},
      {"name": "Bachelor Liberal Arts", "tuition_range": "EUR 2,800 – 4,200 / yr"}
    ]'::jsonb,
    5
  )
) as v(name, country, flag_emoji, prestige_line, qs_label, hero_image_url, hero_image_alt, logo_initials, programs, sort_order)
where not exists (select 1 from public.featured_universities limit 1);

-- ---------------------------------------------------------------------------
-- Storage bucket (public read; CMS admins manage objects)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'featured-university-media',
  'featured-university-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "featured_media_select_public" on storage.objects;
create policy "featured_media_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'featured-university-media');

drop policy if exists "featured_media_insert_admin" on storage.objects;
create policy "featured_media_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'featured-university-media' and public.is_cms_admin());

drop policy if exists "featured_media_update_admin" on storage.objects;
create policy "featured_media_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'featured-university-media' and public.is_cms_admin())
  with check (bucket_id = 'featured-university-media' and public.is_cms_admin());

drop policy if exists "featured_media_delete_admin" on storage.objects;
create policy "featured_media_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'featured-university-media' and public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- Realtime (optional)
-- ---------------------------------------------------------------------------
do $pub$
begin
  begin
    alter publication supabase_realtime add table public.featured_universities;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$pub$;
