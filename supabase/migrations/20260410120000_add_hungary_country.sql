-- Add Hungary to destinations (mirrors src/lib/unimondo-data.ts)

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Hungary', rg.id, false,
  'Strong STEM and medicine tracks, lively student cities, and competitive tuition with growing English-taught offerings.',
  array['Eötvös Loránd University', 'Budapest University of Technology and Economics', 'Corvinus University of Budapest'],
  'EUR 550 - 950/month',
  'National Type D student residence permit: admission letter, proof of funds, health insurance, and accommodation details.',
  14
from public.region_groups rg where rg.label = 'Central/Eastern Europe'
on conflict (name) do nothing;
