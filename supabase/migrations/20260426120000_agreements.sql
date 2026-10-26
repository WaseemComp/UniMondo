-- Retainer agreements for student consultancy engagements
create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  template_version text not null default '1.0',
  application_id text,
  status text not null default 'draft',
  
  -- Consultant details
  consultant_entity_name text not null default 'UniMondo Ltd',
  consultant_reg_number text not null default '',
  consultant_address text not null default '',
  
  -- Student details
  student_full_name text not null default '',
  student_parent_guardian text not null default '',
  student_cnic_passport text not null default '',
  student_address text not null default '',
  student_email text not null default '',
  student_phone text not null default '',
  
  -- Educational engagement details
  degree_level text not null default '',
  field_of_study text not null default '',
  preferred_destination text not null default '',
  academic_year_intake text not null default '',
  
  -- Financials & calculations
  base_fee_eur numeric not null default 1000,
  payment_currency text not null default 'EUR',
  agreed_exchange_rate numeric,
  exchange_rate_date text,
  
  discount_type text not null default 'percentage',
  discount_value numeric not null default 0,
  
  -- UniMondo & Student Signatures
  rep_name text not null default '',
  rep_designation text not null default '',
  rep_date text,
  student_signature_date text,
  agreement_date text,
  
  -- Full snapshot payload
  payload jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreements_reference_idx on public.agreements (reference_number);
create index if not exists agreements_application_id_idx on public.agreements (application_id);
create index if not exists agreements_created_at_idx on public.agreements (created_at desc);

alter table public.agreements enable row level security;

create policy "agreements_select_admin"
  on public.agreements for select
  to authenticated
  using (public.is_cms_admin());

create policy "agreements_write_admin"
  on public.agreements for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());
