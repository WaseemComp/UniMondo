-- UniMondo: package copy tweaks (SOP wording + softer tone)

-- Replace "SOP" references with expanded wording.
update public.packages
set description = replace(description, 'SOP', 'Statement of Purpose (Motivation Letter/Essay)')
where description ilike '%SOP%';

-- Note: this repo stores package feature bullets inside `public.packages.features` (text[]),
-- not a separate `public.package_features` table.
update public.packages
set features = array(
  select replace(f, 'SOP', 'Statement of Purpose (Motivation Letter/Essay)')
  from unnest(features) as f
)
where exists (select 1 from unnest(features) as f where f ilike '%SOP%');

-- Soften "Admission is not guaranteed" language in package descriptions.
update public.packages
set description = replace(description, 'Admission is not guaranteed.', 'Admission outcomes depend on university decisions, but we will guide you through every step with care and transparency.')
where description ilike '%admission is not guaranteed%';

