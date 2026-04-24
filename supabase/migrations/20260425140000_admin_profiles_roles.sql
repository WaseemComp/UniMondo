-- Super admin flag + per-area permissions (JSON). Only super admin can manage other admins (enforced in app + actions).

alter table public.admin_profiles
  add column if not exists is_super_admin boolean not null default false,
  add column if not exists permissions jsonb not null default '{}'::jsonb;

comment on column public.admin_profiles.is_super_admin is 'Full access; only super may edit other users'' permissions.';

comment on column public.admin_profiles.permissions is
  'Optional scope flags: { "academic": true, "content": true, "applications": true, "submissions": true } — Omitted or true = allowed. False = section hidden.';

-- Mark primary admin (same seed as initial migration) as super; safe if email exists.
update public.admin_profiles
set
  is_super_admin = true,
  permissions = '{"academic": true, "content": true, "applications": true, "submissions": true}'::jsonb
where lower(email) = 'adminone@unimondo.com';

-- Legacy rows: grant full access so nothing breaks
update public.admin_profiles
set permissions = '{"academic": true, "content": true, "applications": true, "submissions": true}'::jsonb
where
  (permissions is null or permissions = '{}'::jsonb)
  and coalesce(is_super_admin, false) = false;
