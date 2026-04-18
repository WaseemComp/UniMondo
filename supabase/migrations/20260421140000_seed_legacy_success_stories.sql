-- Legacy homepage testimonials as success_stories: insert each by name if not already present.

insert into public.success_stories (
  profile_image_url,
  full_name,
  testimonial,
  country,
  program,
  university,
  sort_order,
  is_published
)
select v.profile_image_url, v.full_name, v.testimonial, v.country, v.program, v.university, v.sort_order, v.is_published
from (
  values
    (
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      'Ayesha K.',
      'UniMondo helped me shortlist realistic programs in Germany and prepared every visa document. I’m now at TU Munich.',
      'Germany',
      'MSc Artificial Intelligence',
      'TU Munich',
      0,
      true
    ),
    (
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      'Omar H.',
      'The timeline was crystal clear. From IELTS planning to the embassy interview, I always knew the next step.',
      'Italy',
      'MSc Data Science',
      'University of Bologna',
      1,
      true
    ),
    (
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
      'Giulia M.',
      'I appreciated how honest they were about fit — not pushing random schools, only programs that matched my GPA.',
      'Italy',
      'MSc Design',
      'Politecnico di Milano',
      2,
      true
    )
) as v(profile_image_url, full_name, testimonial, country, program, university, sort_order, is_published)
where not exists (
  select 1 from public.success_stories s where s.full_name = v.full_name
);
