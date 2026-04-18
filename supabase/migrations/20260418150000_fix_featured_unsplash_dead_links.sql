-- Replace Unsplash photo IDs that may 404 (removed assets) for existing featured_universities rows.

update public.featured_universities
set hero_image_url = 'https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=1200&q=80',
    hero_image_alt = 'Modern architecture and European city study environment'
where hero_image_url like '%photo-1486406146926%';

update public.featured_universities
set hero_image_url = 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
    hero_image_alt = coalesce(nullif(trim(hero_image_alt), ''), 'Italian coastline and study-abroad atmosphere')
where hero_image_url like '%photo-1552832230%';

update public.featured_universities
set hero_image_url = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    hero_image_alt = coalesce(nullif(trim(hero_image_alt), ''), 'Graduates celebrating academic achievement')
where hero_image_url like '%photo-1595867515354%';
