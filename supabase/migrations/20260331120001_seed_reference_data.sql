-- Optional seed: mirrors src/lib/unimondo-data.ts (safe to re-run with ON CONFLICT)

insert into public.region_groups (label, sort_order) values
  ('Western Europe', 1),
  ('Southern Europe', 2),
  ('Northern Europe', 3),
  ('Central/Eastern Europe', 4)
on conflict (label) do update set sort_order = excluded.sort_order;

-- Countries (name unique)
insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Italy', rg.id, true,
  'Top-ranked public universities, affordable tuition options, and strong scholarship pathways for international students.',
  array['University of Bologna', 'Sapienza University of Rome', 'Politecnico di Milano'],
  'EUR 700 - 1,200/month',
  'Type D student visa, proof of admission, funds, insurance, and accommodation required.',
  1
from public.region_groups rg where rg.label = 'Southern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Germany', rg.id, false,
  'Globally respected research ecosystem and low tuition in many public institutions.',
  array['TU Munich', 'Heidelberg University', 'RWTH Aachen'],
  'EUR 850 - 1,300/month',
  'National visa with blocked account, admission letter, and health insurance documentation.',
  2
from public.region_groups rg where rg.label = 'Central/Eastern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'France', rg.id, false,
  'Prestigious universities, innovation hubs, and excellent business and arts programs.',
  array['Sorbonne University', 'PSL University', 'Ecole Polytechnique'],
  'EUR 900 - 1,500/month',
  'Long-stay student visa through Campus France and proof of financial resources.',
  3
from public.region_groups rg where rg.label = 'Western Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Spain', rg.id, false,
  'Diverse student life, globally recognized programs, and lower living costs than many peers.',
  array['University of Barcelona', 'Autonomous University of Madrid', 'University of Navarra'],
  'EUR 750 - 1,200/month',
  'Student visa with acceptance letter, medical insurance, and proof of means.',
  4
from public.region_groups rg where rg.label = 'Southern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Netherlands', rg.id, false,
  'Wide availability of English-taught programs and practical career-focused education.',
  array['Delft University of Technology', 'University of Amsterdam', 'Leiden University'],
  'EUR 1,000 - 1,600/month',
  'Residence permit process coordinated by host university after admission.',
  5
from public.region_groups rg where rg.label = 'Western Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Poland', rg.id, false,
  'Affordable tuition and living with rapidly growing international student communities.',
  array['University of Warsaw', 'Jagiellonian University', 'Warsaw University of Technology'],
  'EUR 500 - 900/month',
  'National student visa with acceptance, accommodation, and financial proof.',
  6
from public.region_groups rg where rg.label = 'Central/Eastern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Ireland', rg.id, false,
  'Strong links to global industries in technology, business, and life sciences.',
  array['Trinity College Dublin', 'University College Dublin', 'University of Galway'],
  'EUR 1,100 - 1,700/month',
  'Long-stay D visa with admissions and financial ability evidence.',
  7
from public.region_groups rg where rg.label = 'Western Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Sweden', rg.id, false,
  'Innovation-driven teaching with excellent sustainability and engineering programs.',
  array['Lund University', 'KTH Royal Institute of Technology', 'Uppsala University'],
  'EUR 900 - 1,400/month',
  'Residence permit for studies with insurance and maintenance funds.',
  8
from public.region_groups rg where rg.label = 'Northern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Norway', rg.id, false,
  'High-quality education and a safe, student-friendly environment.',
  array['University of Oslo', 'Norwegian University of Science and Technology', 'University of Bergen'],
  'EUR 1,000 - 1,700/month',
  'Study permit with admission and proof of annual funds.',
  9
from public.region_groups rg where rg.label = 'Northern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Finland', rg.id, false,
  'Excellent education standards and strong opportunities in technology and design.',
  array['University of Helsinki', 'Aalto University', 'Tampere University'],
  'EUR 800 - 1,300/month',
  'Residence permit for studies and sufficient financial means.',
  10
from public.region_groups rg where rg.label = 'Northern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Austria', rg.id, false,
  'Quality public universities with competitive tuition and central European access.',
  array['University of Vienna', 'TU Wien', 'University of Innsbruck'],
  'EUR 800 - 1,300/month',
  'Residence permit student with admissions, accommodation, and insurance.',
  11
from public.region_groups rg where rg.label = 'Central/Eastern Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Belgium', rg.id, false,
  'Multilingual culture and excellent programs in policy, business, and engineering.',
  array['KU Leuven', 'Ghent University', 'UCLouvain'],
  'EUR 850 - 1,400/month',
  'Long-stay visa and residence registration after arrival.',
  12
from public.region_groups rg where rg.label = 'Western Europe'
on conflict (name) do nothing;

insert into public.countries (name, region_group_id, highlighted, why_study_there, popular_universities, living_cost_approx, visa_info, sort_order)
select 'Denmark', rg.id, false,
  'Project-based learning style and strong employment outcomes for graduates.',
  array['University of Copenhagen', 'Aarhus University', 'Technical University of Denmark'],
  'EUR 1,100 - 1,800/month',
  'Residence permit for higher education with funding documentation.',
  13
from public.region_groups rg where rg.label = 'Northern Europe'
on conflict (name) do nothing;

-- Program openings
insert into public.program_openings (id, continent, country, region, intake, university, logo_text, program_name, deadline, tuition_range, sort_order) values
  ('it-bologna-data-fall-2026', 'Europe', 'Italy', 'Southern Europe', 'Fall 2026', 'University of Bologna', 'UB', 'MSc Data Science', '2026-05-30', 'EUR 2,500 - 4,200', 1),
  ('it-polimi-design-spring-2027', 'Europe', 'Italy', 'Southern Europe', 'Spring 2027', 'Politecnico di Milano', 'PM', 'MSc Design for Digital Futures', '2026-11-10', 'EUR 3,900 - 6,200', 2),
  ('de-tum-ai-fall-2026', 'Europe', 'Germany', 'Central/Eastern Europe', 'Fall 2026', 'TU Munich', 'TM', 'MSc Artificial Intelligence', '2026-06-20', 'EUR 0 - 3,500', 3),
  ('fr-sorbonne-law-spring-2027', 'Europe', 'France', 'Western Europe', 'Spring 2027', 'Sorbonne University', 'SU', 'LLM International Business Law', '2026-10-25', 'EUR 4,000 - 7,800', 4),
  ('es-barcelona-marketing-fall-2026', 'Europe', 'Spain', 'Southern Europe', 'Fall 2026', 'University of Barcelona', 'UB', 'MSc Digital Marketing', '2026-07-15', 'EUR 3,200 - 5,400', 5),
  ('nl-amsterdam-finance-spring-2027', 'Europe', 'Netherlands', 'Western Europe', 'Spring 2027', 'University of Amsterdam', 'UA', 'MSc Quantitative Finance', '2026-11-22', 'EUR 8,500 - 13,500', 6),
  ('pl-warsaw-cs-fall-2026', 'Europe', 'Poland', 'Central/Eastern Europe', 'Fall 2026', 'University of Warsaw', 'UW', 'MSc Computer Science', '2026-06-01', 'EUR 2,000 - 4,000', 7),
  ('ie-trinity-biotech-fall-2026', 'Europe', 'Ireland', 'Western Europe', 'Fall 2026', 'Trinity College Dublin', 'TD', 'MSc Biotechnology', '2026-07-01', 'EUR 9,500 - 15,000', 8),
  ('se-lund-energy-spring-2027', 'Europe', 'Sweden', 'Northern Europe', 'Spring 2027', 'Lund University', 'LU', 'MSc Sustainable Energy', '2026-10-30', 'EUR 10,000 - 14,200', 9),
  ('dk-copenhagen-it-fall-2026', 'Europe', 'Denmark', 'Northern Europe', 'Fall 2026', 'University of Copenhagen', 'UC', 'MSc IT and Cognition', '2026-06-18', 'EUR 9,000 - 13,000', 10)
on conflict (id) do nothing;
