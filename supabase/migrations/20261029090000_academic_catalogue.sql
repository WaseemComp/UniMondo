-- Phase 05. Manual review/execution only. No rows are inserted, renamed or deleted.
begin;
alter table public.countries
  add column if not exists catalogue jsonb not null default '{}'::jsonb,
  add column if not exists is_published boolean not null default true,
  add column if not exists archived_at timestamptz;
alter table public.featured_universities
  add column if not exists country_id uuid references public.countries(id) on delete restrict,
  add column if not exists profile jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz;
alter table public.programs
  add column if not exists university_id uuid references public.featured_universities(id) on delete restrict,
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz;
-- Unknown deadlines must stay unknown, rather than inventing a date.
alter table public.programs alter column deadline drop not null;
alter table public.programs drop constraint if exists programs_degree_check;
alter table public.programs add constraint programs_degree_check check (degree in ('bachelor','master','doctorate','other'));
create index if not exists featured_universities_country_id_idx on public.featured_universities(country_id);
create index if not exists programs_university_id_idx on public.programs(university_id);
-- Reject future duplicate institution/country identities without modifying legacy rows.
create or replace function public.catalogue_unique_name()
returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' and new.name=old.name then
   if TG_TABLE_NAME='countries' then return new; end if;
   if new.country=old.country then return new; end if;
 end if;
 perform pg_advisory_xact_lock(hashtext(TG_TABLE_NAME),hashtext(lower(btrim(new.name))));
 if TG_TABLE_NAME='countries' then
   if exists(select 1 from public.countries c where lower(btrim(c.name))=lower(btrim(new.name)) and c.id<>new.id) then raise exception 'This destination already exists. Edit the existing record.'; end if;
 else
   if exists(select 1 from public.featured_universities u where lower(btrim(u.name))=lower(btrim(new.name)) and lower(btrim(u.country))=lower(btrim(new.country)) and u.id<>new.id) then raise exception 'This university already exists for the selected country. Edit the existing record.'; end if;
 end if;
 return new;
end; $$;
drop trigger if exists countries_catalogue_unique_name on public.countries;
create trigger countries_catalogue_unique_name before insert or update of name on public.countries for each row execute function public.catalogue_unique_name();
drop trigger if exists universities_catalogue_unique_name on public.featured_universities;
create trigger universities_catalogue_unique_name before insert or update of name,country on public.featured_universities for each row execute function public.catalogue_unique_name();
-- All catalogue mutations use existing permission-checked server actions. Prevent
-- the old broad is_cms_admin policies from allowing direct browser writes.
revoke insert, update, delete on public.countries, public.featured_universities, public.programs from public, anon, authenticated;
grant select, insert, update on public.countries, public.featured_universities, public.programs to service_role;
-- Visibility helpers evaluate only publication state, never private/student data.
-- SECURITY DEFINER is needed to distinguish a hidden legacy parent from no matching parent.
create or replace function public.catalogue_destination_public(parent_id uuid, parent_name text)
returns boolean language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.countries c where (parent_id is not null and c.id=parent_id) or (parent_id is null and c.name=parent_name))
 or exists(select 1 from public.countries c where ((parent_id is not null and c.id=parent_id) or (parent_id is null and c.name=parent_name)) and c.is_published and c.archived_at is null);
$$;
create or replace function public.catalogue_university_public(parent_id uuid, parent_name text, country_name text)
returns boolean language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.featured_universities u where (parent_id is not null and u.id=parent_id) or (parent_id is null and u.name=parent_name and u.country=country_name))
 or exists(select 1 from public.featured_universities u where ((parent_id is not null and u.id=parent_id) or (parent_id is null and u.name=parent_name and u.country=country_name)) and u.is_published and u.archived_at is null and public.catalogue_destination_public(u.country_id,u.country));
$$;
revoke all on function public.catalogue_destination_public(uuid,text), public.catalogue_university_public(uuid,text,text) from public;
grant execute on function public.catalogue_destination_public(uuid,text), public.catalogue_university_public(uuid,text,text) to anon, authenticated, service_role;
-- Keep public reads, including intentionally empty catalogues, visibility-safe.
drop policy if exists countries_select_public on public.countries;
create policy countries_select_public on public.countries for select to anon, authenticated
  using ((is_published and archived_at is null) or public.is_cms_admin());
drop policy if exists programs_select_public on public.programs;
create policy programs_select_public on public.programs for select to anon, authenticated
  using ((is_published and archived_at is null and public.catalogue_destination_public(null,country) and public.catalogue_university_public(university_id,university,country)) or public.is_cms_admin());
drop policy if exists featured_universities_select_public on public.featured_universities;
create policy featured_universities_select_public on public.featured_universities for select to anon, authenticated
  using ((is_published and archived_at is null and public.catalogue_destination_public(country_id,country)) or public.is_cms_admin());
notify pgrst, 'reload schema';
commit;
