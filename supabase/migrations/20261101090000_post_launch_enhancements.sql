-- Post-launch enhancements. OWNER REVIEW/EXECUTION ONLY. Additive; does NOT activate publishing.
-- Requires installed Phases 05–07 and existing catalogue tables. No course/package/country rows are seeded or reset.
begin;
create table if not exists public.cms_currencies(code text primary key check(code ~ '^[A-Z]{3}$'),name text not null check(length(btrim(name))between 1 and 100),symbol text not null check(length(symbol)between 1 and 12),decimals smallint not null check(decimals between 0 and 4),active boolean not null default true);
insert into public.cms_currencies(code,name,symbol,decimals,active)values
 ('EUR','Euro','€',2,true),('PKR','Pakistani Rupee','Rs',2,true),('LYD','Libyan Dinar','LD',3,true),('TND','Tunisian Dinar','DT',3,true),('TRY','Turkish Lira','₺',2,true),('USD','US Dollar','$',2,true),('BDT','Bangladeshi Taka','৳',2,true),('GBP','Pound Sterling (legacy)','£',2,false)on conflict(code)do nothing;
alter table public.cms_currencies enable row level security;
revoke all on public.cms_currencies from public,anon,authenticated,service_role;
grant select on public.cms_currencies to service_role;
alter table public.region_groups add column if not exists is_published boolean not null default true,add column if not exists archived_at timestamptz,add column if not exists updated_at timestamptz not null default now();
alter table public.language_courses add column if not exists currency_code text,add column if not exists source_key text,add column if not exists sort_order integer not null default 0,add column if not exists archived_at timestamptz,add column if not exists updated_at timestamptz not null default now();
alter table public.packages add column if not exists currency_code text,add column if not exists archived_at timestamptz;
alter table public.add_ons add column if not exists currency_code text,add column if not exists archived_at timestamptz;
-- Widen precision without changing existing numeric values; support three/four-decimal currencies.
alter table public.packages alter column price_full type numeric(16,4),alter column price_installment type numeric(16,4);
alter table public.add_ons alter column price_full type numeric(16,4),alter column price_installment type numeric(16,4);
create unique index if not exists language_courses_source_key_unique on public.language_courses(source_key)where source_key is not null;
do $$declare tab text;begin
 foreach tab in array array['language_courses','packages','add_ons']loop
  if not exists(select 1 from pg_constraint where conrelid=format('public.%I',tab)::regclass and conname=tab||'_currency_ref')then execute format('alter table public.%I add constraint %I foreign key(currency_code) references public.cms_currencies(code) on update restrict on delete restrict not valid',tab,tab||'_currency_ref');end if;
 end loop;
end;$$;
-- Extend the existing content workflow, without replacing its history or activation setting.
alter table public.cms_content_workflows drop constraint if exists cms_content_workflows_content_type_check;
alter table public.cms_content_workflows add constraint cms_content_workflows_content_type_check check(content_type in('home','countries','universities','programmes','regions','courses','packages','addons'));
create or replace function public.cms_content_snapshot(t text,k text)returns jsonb language plpgsql stable security definer set search_path=public as $$
declare data jsonb='{}';a jsonb;b jsonb;
begin
 if t='regions' then
  if k<>'catalogue' then raise exception 'Unsupported region catalogue';end if;
  select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(r))order by r.id::text collate "C"),'[]')into a from public.region_groups r;
  select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(c))order by c.id::text collate "C"),'[]')into b from public.countries c;
  return jsonb_build_object('tables',jsonb_build_object('region_groups',a,'countries',b));
 end if;
 if t='home' then
  if k not in('hero','marketing_banner','why_unimondo','destinations','universities','success_stories','how_it_works','why_europe','journey_cta','ticker','hero_slides','why_stats','testimonials','footer')then raise exception 'Unsupported homepage section';end if;
  select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(c))order by c.id::text collate "C"),'[]')into a from public.cms_content_blocks c where c.page_slug='home' and(case when k='hero_slides'then c.section_key='hero_slider'when k='why_stats'then c.section_key='why_unimondo'and c.block_key='collection_why_stats'else c.section_key=k and not(k='why_unimondo'and c.block_key='collection_why_stats')end);
  data=jsonb_build_object('cms_content_blocks',a);
  if k='hero' then
   select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.key collate "C"),'[]')into a from public.site_content s where s.key like 'home.hero.%';
   data=data||jsonb_build_object('site_content',a);
  elsif k='ticker' then
   select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.key collate "C"),'[]')into a from public.site_content s where s.key like 'home.ticker.%';
   select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.id),'[]')into b from public.site_settings s;
   data=data||jsonb_build_object('site_content',a,'site_settings',b);
   select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.id::text collate "C"),'[]')into a from public.news_ticker_items s;
   data=data||jsonb_build_object('news_ticker_items',a);
  elsif k='testimonials' then
   select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.id::text collate "C"),'[]')into a from public.success_stories s;
   data=jsonb_build_object('success_stories',a);
  end if;
 else
  if t not in('countries','universities','programmes','courses','packages','addons')then raise exception 'Unsupported content type';end if;
  execute format('select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.id::text collate "C"),''[]'')from public.%I s where s.id::text=$1',case t when 'universities'then 'featured_universities'when 'programmes'then 'programs'when 'courses'then 'language_courses'when 'addons'then 'add_ons'else t end)into a using k;
  data=jsonb_build_object(case t when 'universities'then 'featured_universities'when 'programmes'then 'programs'when 'courses'then 'language_courses'when 'addons'then 'add_ons'else t end,a);
 end if;
 return jsonb_build_object('tables',data);
end;$$;
create or replace function public.cms_content_check_scope(t text,k text,p jsonb)returns void language plpgsql security definer set search_path=public as $$
declare tab text;r jsonb;actual jsonb;oldrow jsonb;pk text;
begin
 actual=public.cms_content_snapshot(t,k);
 if jsonb_typeof(p->'tables')is distinct from 'object' or (select array_agg(key order by key)from jsonb_object_keys(p->'tables')key)is distinct from(select array_agg(key order by key)from jsonb_object_keys(actual->'tables')key)then raise exception 'Invalid document tables';end if;
 for tab in select key from jsonb_object_keys(p->'tables')as keys(key)order by case when key='region_groups'then 0 else 1 end,key loop
  if jsonb_typeof(p->'tables'->tab)is distinct from 'array'then raise exception 'Invalid document rows';end if;
  pk=case when tab='site_content'then 'key'else 'id'end;
  if(select count(*)from jsonb_array_elements(p->'tables'->tab))<>(select count(distinct value->>pk)from jsonb_array_elements(p->'tables'->tab))then raise exception 'Duplicate document identity';end if;
  for r in select value from jsonb_array_elements(p->'tables'->tab)loop
   if t='regions' then
    if tab='countries' then
     select value into oldrow from jsonb_array_elements(actual->'tables'->'countries')where value->>'id'=r->>'id';
     if oldrow is null or (oldrow-'region_group_id'-'sort_order') is distinct from (r-'region_group_id'-'sort_order')then raise exception 'Country identity, content and associations must remain unchanged';end if;
     if r->>'region_group_id' is not null and not exists(select 1 from jsonb_array_elements(p->'tables'->'region_groups')q where q->>'id'=r->>'region_group_id')then raise exception 'Choose an existing region';end if;
    elsif tab='region_groups' then
     if (r->>'id')::integer not between 1 and 32767 or length(btrim(r->>'label')) not between 1 and 200 then raise exception 'Invalid region';end if;
    else raise exception 'Unsupported region table';end if;
   elsif t<>'home' then if r->>'id'<>k then raise exception 'Cross-record write refused';end if;
   elsif tab='cms_content_blocks' then if exists(select 1 from public.cms_content_blocks b where b.id::text=r->>'id')and not exists(select 1 from jsonb_array_elements(actual->'tables'->tab)b where b->>'id'=r->>'id')then raise exception 'Cross-document identity reuse refused';end if;if r->>'page_slug'<>'home' or not(case when k='hero_slides'then r->>'section_key'='hero_slider'when k='why_stats'then r->>'section_key'='why_unimondo'and r->>'block_key'='collection_why_stats'else r->>'section_key'=k and not(k='why_unimondo'and r->>'block_key'='collection_why_stats')end)then raise exception 'Cross-section write refused';end if;
   elsif tab='site_content' then if not((k='hero'and r->>'key'like 'home.hero.%')or(k='ticker'and r->>'key'like 'home.ticker.%'))then raise exception 'Unsupported website key';end if;
   elsif tab='site_settings'and r->>'id'<>'1'then raise exception 'Unsupported settings';end if;
  end loop;
  for oldrow in select value from jsonb_array_elements(actual->'tables'->tab)loop
   if not exists(select 1 from jsonb_array_elements(p->'tables'->tab)n where n->>pk=oldrow->>pk)then raise exception 'Published records must be retained or hidden';end if;
  end loop;
 end loop;
end;$$;
create or replace function public.cms_content_apply(t text,k text,p jsonb)returns void language plpgsql security definer set search_path=public as $$
declare tab text;r jsonb;pk text;cols text;exprs text;updates text;oldrow jsonb;current_payload jsonb;
begin
 perform public.cms_content_check_scope(t,k,p);current_payload=public.cms_content_snapshot(t,k);
 perform set_config('unimondo.content_publication','active',true);
 for tab in select key from jsonb_object_keys(p->'tables')as keys(key)order by case when key='region_groups'then 0 else 1 end,key loop
  pk=case when tab='site_content'then 'key'else 'id'end;
  for r in select value from jsonb_array_elements(p->'tables'->tab)loop
   select value into oldrow from jsonb_array_elements(current_payload->'tables'->tab)where value->>pk=r->>pk;
   if oldrow is not distinct from r then continue;end if;
   r=r||jsonb_build_object('updated_at',clock_timestamp());
   select string_agg(format('%I',a.attname),','order by a.attnum),string_agg(format('v.%I',a.attname),','order by a.attnum),string_agg(format('%I=excluded.%I',a.attname,a.attname),','order by a.attnum)filter(where a.attname<>pk)
   into cols,exprs,updates from pg_attribute a where a.attrelid=format('public.%I',tab)::regclass and a.attnum>0 and not a.attisdropped and a.attname not in('created_at')and r?a.attname;
   execute format('insert into public.%I(%s)select %s from jsonb_populate_record(null::public.%I,$1)v on conflict(%I)do update set %s',tab,cols,exprs,tab,pk,updates)using r;
  end loop;
 end loop;
 if t='regions' then
  -- Draft identities are allocated under the catalogue CAS lock; keep legacy sequence writes safe.
  perform setval(pg_get_serial_sequence('public.region_groups','id'),greatest((select coalesce(max(id),1)from public.region_groups),nextval(pg_get_serial_sequence('public.region_groups','id'))),true);
 end if;
 perform set_config('unimondo.content_publication','',true);
end;$$;
create or replace function public.cms_content_transition(p_id uuid,p_expected bigint,p_action text,p_actor uuid,p_label text,p_note text default '',p_revision uuid default null)returns public.cms_content_workflows language plpgsql security definer set search_path=public as $$
declare d public.cms_content_workflows;rid uuid;old jsonb;oldstatus text;
begin
 -- Regions and academic documents share country rows. Serialize publications across scopes
 -- so the stale-base comparison is performed after any overlapping publication commits.
 if p_action='publish'then perform pg_advisory_xact_lock(hashtext('unimondo-content-publication'),0);end if;
 select *into d from public.cms_content_workflows where id=p_id;
 if not found or d.version<>p_expected then raise exception 'This content changed in another session';end if;
 perform pg_advisory_xact_lock(hashtext('unimondo-content'),hashtext(d.content_type||':'||d.record_key));
 select *into d from public.cms_content_workflows where id=p_id for update;
 if d.version<>p_expected then raise exception 'This content changed in another session';end if;
 if not exists(select 1 from public.cms_publishing_settings where id=1)then raise exception 'Publishing setup is unavailable';end if;
 old=d.proposed;oldstatus=d.status;
 if p_action='submit'and d.status in('draft','changes_requested')then
  if d.base<>public.cms_content_snapshot(d.content_type,d.record_key)then raise exception 'Published content changed. Start a fresh draft before review';end if;
  d.status='in_review';
 elsif p_action='approve'and d.status='in_review'then
  if d.base<>public.cms_content_snapshot(d.content_type,d.record_key)then raise exception 'Published content changed. Approval refused';end if;
  d.status='approved';
 elsif p_action in('request_changes','reject')and d.status='in_review'then
  if length(btrim(p_note))not between 1 and 1500 then raise exception 'Explain the requested changes';end if;d.status='changes_requested';
 elsif p_action='return_to_draft'and d.status in('approved','changes_requested')then d.status='draft';d.approved_revision_id=null;
 elsif p_action='discard'and d.status in('draft','changes_requested','approved')then d.status='discarded';d.approved_revision_id=null;
 elsif p_action='publish'and d.status='approved'then
  if not(select enabled from public.cms_publishing_settings where id=1)then raise exception 'Publication requires owner activation after deployment';end if;
  if d.approved_revision_id is null or d.approved_revision_id is distinct from p_revision or not exists(select 1 from public.cms_content_revisions r where r.id=d.approved_revision_id and r.event='approve'and r.proposed=d.proposed)then raise exception 'This exact content version has not been approved';end if;
  if d.base<>public.cms_content_snapshot(d.content_type,d.record_key)then raise exception 'Published content changed. Stale publication refused';end if;
  perform public.cms_content_apply(d.content_type,d.record_key,d.proposed);
  d.status='published';
  if d.content_type not in('home','regions')and exists(select 1 from jsonb_array_elements(d.proposed->'tables'->case d.content_type when 'universities'then 'featured_universities'when 'programmes'then 'programs'when 'courses'then 'language_courses'when 'addons'then 'add_ons'when 'regions'then 'region_groups'else d.content_type end)r where r->>'archived_at'is not null)then d.status='archived';end if;
  if d.content_type='home'and exists(select 1 from jsonb_array_elements(d.proposed->'tables'->'cms_content_blocks')r where r->>'block_key'='presentation'and r->'content'->>'visible'='false')then d.status='archived';end if;
 else raise exception 'Invalid workflow transition';end if;
 d.version=d.version+1;
 insert into public.cms_content_revisions(document_id,revision_number,event,status,author_id,author_label,previous,proposed,note)values(d.id,d.version,p_action,d.status,p_actor,p_label,case when p_action='publish'then d.base else old end,d.proposed,p_note)returning id into rid;
 if p_action='approve'then d.approved_revision_id=rid;end if;
 if p_action='publish'then d.published_revision_id=rid;end if;
 update public.cms_content_workflows set status=d.status,version=d.version,approved_revision_id=d.approved_revision_id,published_revision_id=d.published_revision_id,note=p_note,updated_by=p_actor,updated_label=p_label,updated_at=clock_timestamp()where id=d.id returning *into d;
 return d;
end;$$;

-- Superadmin is checked by the existing server action. No API role has direct registry writes.
create or replace function public.cms_currency_save(p_value jsonb)returns void language plpgsql security definer set search_path=public as $$
declare c text=p_value->>'code';oldrow public.cms_currencies;referenced boolean=false;d integer=(p_value->>'decimals')::integer;
begin
 perform pg_advisory_xact_lock(hashtext('unimondo-currency'),hashtext(c));
 if c is null or c !~ '^[A-Z]{3}$'or d not between 0 and 4 or jsonb_typeof(p_value->'active')<>'boolean' then raise exception 'Invalid currency';end if;
 select *into oldrow from public.cms_currencies where code=c for update;
 if found and oldrow.decimals<>d then
  if c in('EUR','PKR','LYD','TND','TRY','USD','BDT')then raise exception 'Agreement currency precision is fixed';end if;
  referenced=exists(select 1 from public.language_courses where coalesce(currency_code,'GBP')=c and price is not null)or exists(select 1 from public.packages where coalesce(currency_code,'USD')=c)or exists(select 1 from public.add_ons where coalesce(currency_code,'USD')=c)or exists(select 1 from public.programs where details->>'currency'=c and details->>'tuition_amount'is not null)or exists(select 1 from public.agreements where payment_currency=c)or exists(select 1 from public.cms_content_workflows where proposed::text like '%"currency_code": "'||c||'"%'or proposed::text like '%"currency": "'||c||'"%')or exists(select 1 from public.cms_content_revisions where proposed::text like '%"currency_code": "'||c||'"%'or proposed::text like '%"currency": "'||c||'"%');
  if referenced then raise exception 'Referenced currency precision cannot be changed';end if;
 end if;
 insert into public.cms_currencies(code,name,symbol,decimals,active)values(c,p_value->>'name',p_value->>'symbol',d,(p_value->>'active')::boolean)on conflict(code)do update set name=excluded.name,symbol=excluded.symbol,decimals=excluded.decimals,active=excluded.active;
end;$$;
revoke all on function public.cms_currency_save(jsonb)from public,anon,authenticated,service_role;
grant execute on function public.cms_currency_save(jsonb)to service_role;
-- The original guard already allows compatibility writes while disabled and rejects bypasses once activated.
do $$declare tab text;begin
 foreach tab in array array['region_groups','language_courses','packages','add_ons']loop
  execute format('drop trigger if exists cms_content_publication_guard on public.%I',tab);
  execute format('create trigger cms_content_publication_guard before insert or update or delete on public.%I for each row execute function public.cms_content_publication_guard()',tab);
 end loop;
end;$$;
revoke all on function public.cms_content_snapshot(text,text),public.cms_content_check_scope(text,text,jsonb),public.cms_content_apply(text,text,jsonb),public.cms_content_transition(uuid,bigint,text,uuid,text,text,uuid)from public,anon,authenticated,service_role;
grant execute on function public.cms_content_snapshot(text,text),public.cms_content_transition(uuid,bigint,text,uuid,text,text,uuid)to service_role;
notify pgrst,'reload schema';
commit;
