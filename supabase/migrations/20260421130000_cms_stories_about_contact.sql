-- Success stories, About sections, Team, Contact info, public form submissions

-- ---------------------------------------------------------------------------
-- Success stories (home page)
-- ---------------------------------------------------------------------------
create table if not exists public.success_stories (
  id uuid primary key default gen_random_uuid(),
  profile_image_url text not null,
  full_name text not null,
  testimonial text not null,
  country text,
  program text,
  university text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists success_stories_published_sort_idx
  on public.success_stories (is_published, sort_order);

drop trigger if exists success_stories_set_updated_at on public.success_stories;
create trigger success_stories_set_updated_at
  before update on public.success_stories
  for each row execute function public.set_updated_at();

comment on table public.success_stories is 'Student success stories / testimonials for the home page.';

-- ---------------------------------------------------------------------------
-- About page: fixed sections (single row per key)
-- ---------------------------------------------------------------------------
create table if not exists public.about_sections (
  section_key text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists about_sections_set_updated_at on public.about_sections;
create trigger about_sections_set_updated_at
  before update on public.about_sections
  for each row execute function public.set_updated_at();

comment on table public.about_sections is 'Editable About page blocks (mission, vision, etc.).';

insert into public.about_sections (section_key, title, body) values
  (
    'about_us',
    'About Us',
    'UniMondo is a student-first education consultancy helping applicants from emerging markets access top universities across Europe. Our model combines transparent guidance, practical eligibility screening, and continuous counselor support from first consultation to visa preparation.'
  ),
  (
    'mission',
    'Mission',
    'To make world-class European education accessible through honest advising, structured applications, and dependable support at every milestone.'
  ),
  (
    'vision',
    'Vision',
    'A future where motivated students can pursue the right program in the right country — with clarity, dignity, and momentum.'
  ),
  (
    'objective',
    'Objective',
    'Deliver accurate eligibility guidance, curated shortlists, and timely documentation support so students can apply with confidence and arrive prepared.'
  ),
  (
    'policy',
    'Policy',
    'We operate with transparent fees, clear timelines, and privacy-conscious handling of applicant data. We do not guarantee admissions or visas; we commit to professional diligence and responsive communication.'
  ),
  (
    'values',
    'Our Values',
    'Integrity, empathy, rigor, and respect for every student''s story. We prioritize fit over volume and long-term outcomes over quick wins.'
  )
on conflict (section_key) do nothing;

-- ---------------------------------------------------------------------------
-- Team members (About page)
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  name text not null,
  qualification text not null default '',
  bio text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_sort_idx on public.team_members (sort_order);

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

comment on table public.team_members is 'People shown on the About page.';

-- ---------------------------------------------------------------------------
-- Contact page: addresses, phones (landline/fax), emails
-- ---------------------------------------------------------------------------
create table if not exists public.contact_addresses (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  lines text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists contact_addresses_set_updated_at on public.contact_addresses;
create trigger contact_addresses_set_updated_at
  before update on public.contact_addresses
  for each row execute function public.set_updated_at();

create table if not exists public.contact_phones (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  number text not null,
  kind text not null check (kind in ('landline', 'fax')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists contact_phones_set_updated_at on public.contact_phones;
create trigger contact_phones_set_updated_at
  before update on public.contact_phones
  for each row execute function public.set_updated_at();

create table if not exists public.contact_emails (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  email text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists contact_emails_set_updated_at on public.contact_emails;
create trigger contact_emails_set_updated_at
  before update on public.contact_emails
  for each row execute function public.set_updated_at();

do $seed_contact$
begin
  if (select count(*)::int from public.contact_addresses) = 0 then
    insert into public.contact_addresses (label, lines, sort_order) values
      ('Admissions desk', 'Europe admissions desk · Remote-first counseling', 1);
  end if;
  if (select count(*)::int from public.contact_emails) = 0 then
    insert into public.contact_emails (label, email, sort_order) values
      ('General inquiries', 'hello@unimondo.example', 1),
      ('Admissions support', 'admissions@unimondo.example', 2);
  end if;
end
$seed_contact$;

-- ---------------------------------------------------------------------------
-- Form submissions (service role only; no public select)
-- ---------------------------------------------------------------------------
create table if not exists public.work_with_us_submissions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('individual', 'organization')),
  organization_name text,
  contact_person_name text not null,
  email text not null,
  phone text not null,
  collaboration_nature text not null,
  collaboration_other text,
  created_at timestamptz not null default now()
);

comment on table public.work_with_us_submissions is 'Partnership / collaboration inquiries from the Contact page.';

create table if not exists public.join_us_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  position_applying_for text not null,
  preferred_location text not null,
  current_location text,
  created_at timestamptz not null default now()
);

comment on table public.join_us_submissions is 'Job / career applications from the Contact page.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.success_stories enable row level security;
alter table public.about_sections enable row level security;
alter table public.team_members enable row level security;
alter table public.contact_addresses enable row level security;
alter table public.contact_phones enable row level security;
alter table public.contact_emails enable row level security;
alter table public.work_with_us_submissions enable row level security;
alter table public.join_us_submissions enable row level security;

drop policy if exists "success_stories_select_public" on public.success_stories;
create policy "success_stories_select_public"
  on public.success_stories for select
  to anon, authenticated
  using (is_published = true or public.is_cms_admin());

drop policy if exists "success_stories_write_admin" on public.success_stories;
create policy "success_stories_write_admin"
  on public.success_stories for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "about_sections_select_public" on public.about_sections;
create policy "about_sections_select_public"
  on public.about_sections for select
  to anon, authenticated
  using (true);

drop policy if exists "about_sections_write_admin" on public.about_sections;
create policy "about_sections_write_admin"
  on public.about_sections for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "team_members_select_public" on public.team_members;
create policy "team_members_select_public"
  on public.team_members for select
  to anon, authenticated
  using (true);

drop policy if exists "team_members_write_admin" on public.team_members;
create policy "team_members_write_admin"
  on public.team_members for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "contact_addresses_select_public" on public.contact_addresses;
create policy "contact_addresses_select_public"
  on public.contact_addresses for select
  to anon, authenticated
  using (true);

drop policy if exists "contact_addresses_write_admin" on public.contact_addresses;
create policy "contact_addresses_write_admin"
  on public.contact_addresses for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "contact_phones_select_public" on public.contact_phones;
create policy "contact_phones_select_public"
  on public.contact_phones for select
  to anon, authenticated
  using (true);

drop policy if exists "contact_phones_write_admin" on public.contact_phones;
create policy "contact_phones_write_admin"
  on public.contact_phones for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "contact_emails_select_public" on public.contact_emails;
create policy "contact_emails_select_public"
  on public.contact_emails for select
  to anon, authenticated
  using (true);

drop policy if exists "contact_emails_write_admin" on public.contact_emails;
create policy "contact_emails_write_admin"
  on public.contact_emails for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- Submissions: no anon access (insert via service role in server actions only)
-- Authenticated non-admin also denied by default (no policies)

-- ---------------------------------------------------------------------------
-- Realtime (optional)
-- ---------------------------------------------------------------------------
do $pub$
begin
  begin
    alter publication supabase_realtime add table public.success_stories;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$pub$;
