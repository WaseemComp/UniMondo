-- Structured overrides for public destination guide sections (A–C), editable from admin.

alter table public.countries
  add column if not exists destination_guide jsonb not null default '{}'::jsonb;

comment on column public.countries.destination_guide is
  'Optional JSON overrides for destination page: overview (education, cities, scholarships), costs (tuition note, accommodation, etc.), visa (typed fields). Empty object uses legacy defaults.';
