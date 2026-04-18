-- Study packages & add-ons (CMS for /packages and apply flow)

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  teaser text not null default '',
  description text not null default '',
  best_for text,
  features text[] not null default '{}',
  price_full numeric(12, 2) not null,
  price_installment numeric(12, 2),
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists packages_published_sort_idx on public.packages (is_published, sort_order);

drop trigger if exists packages_pricing_set_updated_at on public.packages;
create trigger packages_pricing_set_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

comment on table public.packages is 'Main study support tiers for pricing page and applications.';

create table if not exists public.add_ons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  best_for text,
  price_full numeric(12, 2) not null,
  price_installment numeric(12, 2),
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists add_ons_published_sort_idx on public.add_ons (is_published, sort_order);

drop trigger if exists add_ons_set_updated_at on public.add_ons;
create trigger add_ons_set_updated_at
  before update on public.add_ons
  for each row execute function public.set_updated_at();

comment on table public.add_ons is 'Optional add-on services sold with packages.';

alter table public.packages enable row level security;
alter table public.add_ons enable row level security;

drop policy if exists "packages_select_public" on public.packages;
create policy "packages_select_public"
  on public.packages for select
  to anon, authenticated
  using (is_published = true or public.is_cms_admin());

drop policy if exists "packages_write_admin" on public.packages;
create policy "packages_write_admin"
  on public.packages for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

drop policy if exists "add_ons_select_public" on public.add_ons;
create policy "add_ons_select_public"
  on public.add_ons for select
  to anon, authenticated
  using (is_published = true or public.is_cms_admin());

drop policy if exists "add_ons_write_admin" on public.add_ons;
create policy "add_ons_write_admin"
  on public.add_ons for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- Seed (idempotent by slug)
insert into public.packages (slug, name, teaser, description, best_for, features, price_full, price_installment, sort_order)
values
  (
    'basic',
    'Basic',
    'Consultation, profile assessment, and a focused university shortlist.',
    'In-person consultation, full document review, profile assessment, and a shortlist of 3 universities in one country (your choice or from our pre-selected list). Includes basic SOP tips. Application submission is free; this tier is advice-only — we do not submit applications for you.',
    'Students who want advice only, without application submission support.',
    array[
      'In-person consultation',
      'Full documents review',
      'Profile assessment',
      '3 universities shortlisted (one country)',
      'Basic SOP tips'
    ],
    150,
    null,
    0
  ),
  (
    'standard',
    'Standard',
    'We apply to 3–4 universities with full document and SOP support.',
    'Everything in Basic, plus we apply to 3–4 universities of your choice (or a mix with our recommendations). Includes portal handling, SOP editing (2 rounds), recommendation letter guidance, and submission tracking. Admission is not guaranteed.',
    'Students who already have specific universities in mind.',
    array[
      'All Basic consultation elements',
      'Apply to 3–4 universities',
      'SOP editing (2 rounds)',
      'Recommendation letters support',
      'Submission tracking'
    ],
    500,
    600,
    1
  ),
  (
    'admission-premium',
    'Admission – Premium',
    'Broader applications until we secure an admission for you.',
    'Full application support: we apply to 6–8 universities combining your list and our shortlist, working until an admission is secured. Ideal when you want UniMondo to drive outcomes end-to-end on applications.',
    'Students who want us to maximize admission chances across more institutions.',
    array[
      'Apply to 6–8 universities (combo shortlist)',
      'Dedicated strategy until admission secured',
      'Full document and portal support',
      'Ongoing counselor coordination'
    ],
    800,
    900,
    2
  )
on conflict (slug) do nothing;

insert into public.add_ons (slug, name, description, best_for, price_full, price_installment, sort_order)
values
  (
    'extra-country-3',
    'Extra country (3 universities)',
    'Add the same discipline focus in another country with up to 3 additional university applications.',
    null,
    100,
    null,
    0
  ),
  (
    'scholarship-application',
    'Scholarship – application support',
    'Scholarship search and application assistance for students who applied for admission through UniMondo.',
    'Students who applied admissions through us and want scholarship support.',
    250,
    300,
    1
  ),
  (
    'post-admission-visa',
    'Post-admission – embassy & visa assistance',
    'Embassy document pack, bank statement analysis and guidance, and embassy appointment assistance.',
    'Students who applied admissions through us and are preparing for their visa.',
    300,
    350,
    2
  ),
  (
    'visa-embassy-standalone',
    'Visa + embassy ready (standalone)',
    'For students who already have an offer letter: full embassy document pack, blocked-account / bank-statement guidance, and appointment booking help.',
    'Students who already have an offer letter.',
    400,
    450,
    3
  ),
  (
    'pre-departure-group',
    'Pre-departure + group connect',
    'Flight tips, housing application help, insurance guidance, and access to a private student group for peer support and early arrival guidance.',
    'Students worried about arrival and settling in.',
    250,
    300,
    4
  ),
  (
    'visa-appeal',
    'Visa appeal (if rejected)',
    'Our legal consultant prepares and submits a visa appeal to the embassy where permitted.',
    'Students who applied admissions through us and received a visa refusal.',
    250,
    300,
    5
  )
on conflict (slug) do nothing;

do $pub$
begin
  begin
    alter publication supabase_realtime add table public.packages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.add_ons;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$pub$;
