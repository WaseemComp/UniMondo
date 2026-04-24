-- Region groups: optional continent label + CMS admin write policies

alter table public.region_groups
  add column if not exists continent text not null default 'Europe';

comment on column public.region_groups.continent is 'Broader geographic label (e.g. Europe, Asia) shown with the region in admin and country pickers.';

update public.region_groups set continent = 'Europe' where continent is null or continent = '';

drop policy if exists "region_groups_write_admin" on public.region_groups;
create policy "region_groups_write_admin"
  on public.region_groups for all
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());
