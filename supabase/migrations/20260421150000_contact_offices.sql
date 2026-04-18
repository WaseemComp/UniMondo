-- Structured offices (head/branch) with phones, emails, social links as JSONB
-- Migrates first legacy contact_* rows into one head office when offices table is empty.

create table if not exists public.contact_offices (
  id uuid primary key default gen_random_uuid(),
  office_type text not null check (office_type in ('head', 'branch')),
  title text,
  address_lines text not null,
  phones jsonb not null default '[]'::jsonb,
  emails jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_offices_sort_idx on public.contact_offices (sort_order);

drop trigger if exists contact_offices_set_updated_at on public.contact_offices;
create trigger contact_offices_set_updated_at
  before update on public.contact_offices
  for each row execute function public.set_updated_at();

comment on table public.contact_offices is 'Offices shown on Contact page and footer (head/branch, JSON contact arrays).';

alter table public.contact_offices enable row level security;

drop policy if exists "contact_offices_select_public" on public.contact_offices;
create policy "contact_offices_select_public"
  on public.contact_offices for select
  to anon, authenticated
  using (true);

drop policy if exists "contact_offices_write_admin" on public.contact_offices;
create policy "contact_offices_write_admin"
  on public.contact_offices for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

-- Seed from legacy tables when offices is empty
do $migrate$
declare
  addr_text text;
  phone_json jsonb;
  email_json jsonb;
begin
  if (select count(*)::int from public.contact_offices) > 0 then
    return;
  end if;

  select string_agg(ca.lines, E'\n' order by ca.sort_order)
    into addr_text
  from public.contact_addresses ca;

  if addr_text is null or trim(addr_text) = '' then
    addr_text := 'Europe admissions desk · Remote-first counseling';
  end if;

  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'number', cp.number,
          'label', nullif(trim(cp.label), ''),
          'kind', cp.kind
        ) order by cp.sort_order
      )
      from public.contact_phones cp
    ),
    '[]'::jsonb
  ) into phone_json;

  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'email', ce.email,
          'label', nullif(trim(ce.label), '')
        ) order by ce.sort_order
      )
      from public.contact_emails ce
    ),
    '[]'::jsonb
  ) into email_json;

  insert into public.contact_offices (
    office_type,
    title,
    address_lines,
    phones,
    emails,
    social_links,
    sort_order
  ) values (
    'head',
    'Head office',
    addr_text,
    coalesce(phone_json, '[]'::jsonb),
    coalesce(email_json, '[]'::jsonb),
    '[]'::jsonb,
    0
  );
end
$migrate$;
