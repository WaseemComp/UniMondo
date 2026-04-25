-- Admin permissions v2: fine-grained section + block keys

alter table public.admin_profiles
  add column if not exists permissions_v2 jsonb not null default '{}'::jsonb;

comment on column public.admin_profiles.permissions_v2 is
  'Fine-grained permissions map. Example: { "home.view": true, "home.hero_slider.edit": true, "users.*": false }. Super admins bypass.';

