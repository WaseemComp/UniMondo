-- READ ONLY. Owner may execute in the Supabase SQL Editor after installation.
-- No migrations, activation, account changes or content writes.
begin read only;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p
        where p.schemaname='public' and p.tablename=c.relname) as policy_count
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('cms_publishing_settings','cms_content_workflows','cms_content_revisions')
order by c.relname;

select t.name as table_name, r.name as role_name,
       has_table_privilege(r.name,'public.'||t.name,'SELECT') as can_select,
       has_table_privilege(r.name,'public.'||t.name,'INSERT') as can_insert,
       has_table_privilege(r.name,'public.'||t.name,'UPDATE') as can_update,
       has_table_privilege(r.name,'public.'||t.name,'DELETE') as can_delete
from (values ('cms_publishing_settings'),('cms_content_workflows'),('cms_content_revisions')) t(name)
cross join (values ('anon'),('authenticated'),('service_role')) r(name)
order by t.name,r.name;

select p.oid::regprocedure::text as function_signature, r.name as role_name,
       has_function_privilege(r.name,p.oid,'EXECUTE') as can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join (values ('anon'),('authenticated'),('service_role')) r(name)
where n.nspname='public' and p.proname in
 ('cms_content_clean','cms_content_snapshot','cms_content_check_scope',
  'cms_content_save_draft','cms_content_apply','cms_content_transition',
  'cms_content_history_immutable','cms_content_publication_guard')
order by p.proname,r.name;

select id,enabled from public.cms_publishing_settings where id=1;

select c.relname as table_name,t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and not t.tgisinternal
and t.tgname in ('cms_content_publication_guard','cms_content_history_immutable')
order by c.relname,t.tgname;

select pg_get_functiondef('public.cms_content_publication_guard()'::regprocedure)
       as installed_publication_guard;
rollback;
