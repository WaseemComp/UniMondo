-- READ ONLY. Run after the owner manually installs the post-launch migration.
with checks as (
 select 'Publishing remains disabled'::text check_name,not enabled passed from public.cms_publishing_settings where id=1
 union all select 'Currency registry RLS and zero policies',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.cms_currencies')),false) and not exists(select 1 from pg_policy where polrelid=to_regclass('public.cms_currencies'))
 union all select 'Seven Agreement currencies retained',(select count(*)=7 from public.cms_currencies where code in('EUR','PKR','LYD','TND','TRY','USD','BDT'))
 union all select 'Legacy GBP retained but inactive',exists(select 1 from public.cms_currencies where code='GBP'and not active)
 union all select 'Registry direct write denied: '||r,not coalesce(has_table_privilege(r,to_regclass('public.cms_currencies'),'INSERT,UPDATE,DELETE,TRUNCATE'),false)from unnest(array['anon','authenticated','service_role'])r
 union all select 'Registry read limited: '||r,not coalesce(has_table_privilege(r,to_regclass('public.cms_currencies'),'SELECT'),false)from unnest(array['anon','authenticated'])r
 union all select 'Service registry read',coalesce(has_table_privilege('service_role',to_regclass('public.cms_currencies'),'SELECT'),false)
 union all select 'Currency function execution denied: '||r,not coalesce(has_function_privilege(r,to_regprocedure('public.cms_currency_save(jsonb)'),'EXECUTE'),false)from unnest(array['anon','authenticated'])r
 union all select 'Service currency function execution',coalesce(has_function_privilege('service_role',to_regprocedure('public.cms_currency_save(jsonb)'),'EXECUTE'),false)
 union all select 'Publication guard installed: '||tab,exists(select 1 from pg_trigger where tgrelid=to_regclass('public.'||tab)and tgname='cms_content_publication_guard'and not tgisinternal and tgenabled='O')from unnest(array['region_groups','language_courses','packages','add_ons'])tab
 union all select 'Catalogue currency column: '||tab,exists(select 1 from information_schema.columns where table_schema='public'and table_name=tab and column_name='currency_code')from unnest(array['language_courses','packages','add_ons'])tab
 union all select 'Price precision: '||tab,2=(select count(*)from information_schema.columns where table_schema='public'and table_name=tab and column_name in('price_full','price_installment')and numeric_scale=4)from unnest(array['packages','add_ons'])tab
 union all select 'Workflow function private: '||sig||' / '||r,not coalesce(has_function_privilege(r,to_regprocedure('public.'||sig),'EXECUTE'),false)from unnest(array['cms_content_snapshot(text,text)','cms_content_transition(uuid,bigint,text,uuid,text,text,uuid)'])sig cross join unnest(array['anon','authenticated'])r
 union all select 'Currency reference: '||tab,exists(select 1 from pg_constraint where conrelid=to_regclass('public.'||tab)and conname=tab||'_currency_ref'and contype='f')from unnest(array['language_courses','packages','add_ons'])tab
 union all select 'Course source uniqueness' ,to_regclass('public.language_courses_source_key_unique')is not null
 union all select 'Region visibility columns',3=(select count(*)from information_schema.columns where table_schema='public'and table_name='region_groups'and column_name in('is_published','archived_at','updated_at'))
)
select check_name,coalesce(passed,false)passed from checks order by check_name;
