-- Phase 06: additive private content workflow. Manual execution only.
-- Existing published records are neither copied nor changed. Activation is separate.
begin;
create table if not exists public.cms_publishing_settings(id smallint primary key check(id=1),enabled boolean not null default false);
insert into public.cms_publishing_settings(id,enabled)values(1,false)on conflict(id)do nothing;
create table if not exists public.cms_content_workflows(
 id uuid primary key default gen_random_uuid(),content_type text not null check(content_type in('home','countries','universities','programmes')),record_key text not null,title text not null,
 status text not null check(status in('draft','in_review','changes_requested','approved','published','archived','discarded')),
 version bigint not null default 1,owner_id uuid not null,owner_label text not null,last_editor_id uuid not null,updated_by uuid not null,updated_label text not null,updated_at timestamptz not null default now(),
 base jsonb not null,proposed jsonb not null,note text not null default '',approved_revision_id uuid,published_revision_id uuid,
 unique(content_type,record_key)
);
create table if not exists public.cms_content_revisions(
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.cms_content_workflows(id)on delete restrict,
 revision_number bigint not null,event text not null,status text not null,author_id uuid not null,author_label text not null,created_at timestamptz not null default now(),previous jsonb not null,proposed jsonb not null,note text not null default '',unique(document_id,revision_number)
);
create index if not exists cms_content_workflows_status_idx on public.cms_content_workflows(status,updated_at desc);
create index if not exists cms_content_revisions_document_idx on public.cms_content_revisions(document_id,revision_number desc);
alter table public.cms_publishing_settings enable row level security;
alter table public.cms_content_workflows enable row level security;
alter table public.cms_content_revisions enable row level security;
revoke all on public.cms_publishing_settings,public.cms_content_workflows,public.cms_content_revisions from public,anon,authenticated,service_role;
grant select on public.cms_publishing_settings,public.cms_content_workflows,public.cms_content_revisions to service_role;
-- No public/authenticated policies. Server-only transitions, not direct table writes.
create or replace function public.cms_content_clean(v jsonb)returns jsonb language plpgsql immutable set search_path=public as $$
begin
 v=v-'created_at'-'updated_at';
 if v->>'archived_at' is not null then v=jsonb_set(v,'{archived_at}',to_jsonb(to_char((v->>'archived_at')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));end if;
 return v;
end;$$;
create or replace function public.cms_content_snapshot(t text,k text)returns jsonb language plpgsql stable security definer set search_path=public as $$
declare data jsonb='{}';a jsonb;b jsonb;
begin
 if t='home' then
  if k not in('hero','marketing_banner','why_unimondo','destinations','universities','success_stories','how_it_works','why_europe','journey_cta','ticker','hero_slides','why_stats','testimonials')then raise exception 'Unsupported homepage section';end if;
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
  if t not in('countries','universities','programmes')then raise exception 'Unsupported content type';end if;
  execute format('select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.id::text collate "C"),''[]'')from public.%I s where s.id::text=$1',case t when 'universities'then 'featured_universities'when 'programmes'then 'programs'else t end)into a using k;
  data=jsonb_build_object(case t when 'universities'then 'featured_universities'when 'programmes'then 'programs'else t end,a);
 end if;
 return jsonb_build_object('tables',data);
end;$$;
-- Validate target boundaries in SQL as well as application validation.
create or replace function public.cms_content_check_scope(t text,k text,p jsonb)returns void language plpgsql security definer set search_path=public as $$
declare tab text;r jsonb;actual jsonb;oldrow jsonb;pk text;
begin
 actual=public.cms_content_snapshot(t,k);
 if jsonb_typeof(p->'tables')is distinct from 'object' or (select array_agg(key order by key)from jsonb_object_keys(p->'tables')key)is distinct from(select array_agg(key order by key)from jsonb_object_keys(actual->'tables')key)then raise exception 'Invalid document tables';end if;
 for tab in select jsonb_object_keys(p->'tables')loop
  if jsonb_typeof(p->'tables'->tab)is distinct from 'array'then raise exception 'Invalid document rows';end if;
  pk=case when tab='site_content'then 'key'else 'id'end;
  if(select count(*)from jsonb_array_elements(p->'tables'->tab))<>(select count(distinct value->>pk)from jsonb_array_elements(p->'tables'->tab))then raise exception 'Duplicate document identity';end if;
  for r in select value from jsonb_array_elements(p->'tables'->tab)loop
   if t<>'home' then if r->>'id'<>k then raise exception 'Cross-record write refused';end if;
   elsif tab='cms_content_blocks' then if exists(select 1 from public.cms_content_blocks b where b.id::text=r->>'id')and not exists(select 1 from jsonb_array_elements(actual->'tables'->tab)b where b->>'id'=r->>'id')then raise exception 'Cross-document identity reuse refused';end if;if r->>'page_slug'<>'home' or not(case when k='hero_slides'then r->>'section_key'='hero_slider'when k='why_stats'then r->>'section_key'='why_unimondo'and r->>'block_key'='collection_why_stats'else r->>'section_key'=k and not(k='why_unimondo'and r->>'block_key'='collection_why_stats')end)then raise exception 'Cross-section write refused';end if;
   elsif tab='site_content' then if not((k='hero'and r->>'key'like 'home.hero.%')or(k='ticker'and r->>'key'like 'home.ticker.%'))then raise exception 'Unsupported website key';end if;
   elsif tab='site_settings'and r->>'id'<>'1'then raise exception 'Unsupported settings';end if;
  end loop;
  for oldrow in select value from jsonb_array_elements(actual->'tables'->tab)loop
   if not exists(select 1 from jsonb_array_elements(p->'tables'->tab)n where n->>pk=oldrow->>pk)then raise exception 'Published records must be retained or hidden';end if;
  end loop;
 end loop;
end;$$;
create or replace function public.cms_content_save_draft(t text,k text,p_title text,p_expected bigint,p_base jsonb,p_proposed jsonb,p_actor uuid,p_label text,p_initial_effective jsonb default null)returns public.cms_content_workflows language plpgsql security definer set search_path=public as $$
declare d public.cms_content_workflows;previous jsonb;rid uuid;
begin
 if octet_length(p_proposed::text)>750000 then raise exception 'Content draft exceeds the safe document size';end if;
 perform pg_advisory_xact_lock(hashtext('unimondo-content'),hashtext(t||':'||k));
 if not exists(select 1 from public.cms_publishing_settings where id=1)then raise exception 'Publishing setup is unavailable';end if;
 select * into d from public.cms_content_workflows where content_type=t and record_key=k for update;
 if found then
  if d.version<>p_expected or d.status not in('draft','changes_requested','published','archived','discarded')then raise exception 'This draft changed or is locked for review';end if;
  if d.status in('published','archived','discarded')then p_base=public.cms_content_snapshot(t,k);else p_base=d.base;end if;
  previous=d.proposed;
  update public.cms_content_workflows set status='draft',version=version+1,base=p_base,proposed=p_proposed,last_editor_id=p_actor,owner_id=case when status in('published','archived','discarded')then p_actor else owner_id end,owner_label=case when status in('published','archived','discarded')then p_label else owner_label end,updated_by=p_actor,updated_label=p_label,updated_at=clock_timestamp(),approved_revision_id=null,note=''where id=d.id returning *into d;
 else
  if p_expected<>0 or p_base<>public.cms_content_snapshot(t,k)then raise exception 'Published content changed before draft creation';end if;
  previous=p_base;
  insert into public.cms_content_workflows(content_type,record_key,title,status,owner_id,owner_label,last_editor_id,updated_by,updated_label,base,proposed)values(t,k,p_title,'draft',p_actor,p_label,p_actor,p_actor,p_label,p_base,p_proposed)returning *into d;
 end if;
 if d.version=1 then
  insert into public.cms_content_revisions(document_id,revision_number,event,status,author_id,author_label,previous,proposed)values(d.id,0,'existing_baseline',case when t='home'or exists(select 1 from jsonb_each(p_base->'tables')e where jsonb_array_length(e.value)>0)then 'published'else 'draft'end,p_actor,p_label,p_base,coalesce(p_initial_effective,p_base));
 end if;
 perform public.cms_content_check_scope(t,k,p_proposed);
 insert into public.cms_content_revisions(document_id,revision_number,event,status,author_id,author_label,previous,proposed)values(d.id,d.version,'save_draft','draft',p_actor,p_label,previous,p_proposed);
 return d;
end;$$;
-- Called only by the transition transaction; never grant this to API roles.
create or replace function public.cms_content_apply(t text,k text,p jsonb)returns void language plpgsql security definer set search_path=public as $$
declare tab text;r jsonb;pk text;cols text;exprs text;updates text;oldrow jsonb;current_payload jsonb;
begin
 perform public.cms_content_check_scope(t,k,p);current_payload=public.cms_content_snapshot(t,k);
 perform set_config('unimondo.content_publication','active',true);
 for tab in select jsonb_object_keys(p->'tables')loop
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
 perform set_config('unimondo.content_publication','',true);
end;$$;
create or replace function public.cms_content_transition(p_id uuid,p_expected bigint,p_action text,p_actor uuid,p_label text,p_note text default '',p_revision uuid default null)returns public.cms_content_workflows language plpgsql security definer set search_path=public as $$
declare d public.cms_content_workflows;rid uuid;old jsonb;oldstatus text;
begin
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
  if d.content_type<>'home'and exists(select 1 from jsonb_array_elements(d.proposed->'tables'->case d.content_type when 'universities'then 'featured_universities'when 'programmes'then 'programs'else d.content_type end)r where r->>'archived_at'is not null)then d.status='archived';end if;
  if d.content_type='home'and exists(select 1 from jsonb_array_elements(d.proposed->'tables'->'cms_content_blocks')r where r->>'block_key'='presentation'and r->'content'->>'visible'='false')then d.status='archived';end if;
 else raise exception 'Invalid workflow transition';end if;
 d.version=d.version+1;
 insert into public.cms_content_revisions(document_id,revision_number,event,status,author_id,author_label,previous,proposed,note)values(d.id,d.version,p_action,d.status,p_actor,p_label,case when p_action='publish'then d.base else old end,d.proposed,p_note)returning id into rid;
 if p_action='approve'then d.approved_revision_id=rid;end if;
 if p_action='publish'then d.published_revision_id=rid;end if;
 update public.cms_content_workflows set status=d.status,version=d.version,approved_revision_id=d.approved_revision_id,published_revision_id=d.published_revision_id,note=p_note,updated_by=p_actor,updated_label=p_label,updated_at=clock_timestamp()where id=d.id returning *into d;
 return d;
end;$$;
-- Immutable audit history, even for privileged API callers.
create or replace function public.cms_content_history_immutable()returns trigger language plpgsql as $$begin raise exception 'Content revision history is immutable';end;$$;
drop trigger if exists cms_content_history_immutable on public.cms_content_revisions;
create trigger cms_content_history_immutable before update or delete on public.cms_content_revisions for each row execute function public.cms_content_history_immutable();
-- Keep existing code compatible while disabled. Once explicitly activated, old writers
-- cannot bypass approved transactional publication, including service-role server actions.
create or replace function public.cms_content_publication_guard()returns trigger language plpgsql security definer set search_path=public as $$
declare protected boolean=true;v jsonb;
begin
 v=case when TG_OP='DELETE'then to_jsonb(old)else to_jsonb(new)end;
 if TG_TABLE_NAME='cms_content_blocks'then protected=v->>'page_slug'='home' or(TG_OP='UPDATE'and to_jsonb(old)->>'page_slug'='home');end if;
 if TG_TABLE_NAME='site_content'then protected=v->>'key'like 'home.%'or(TG_OP='UPDATE'and to_jsonb(old)->>'key'like 'home.%');end if;
 if protected and(select enabled from public.cms_publishing_settings where id=1)and coalesce(current_setting('unimondo.content_publication',true),'')<>'active'then raise exception 'Use the approved content publishing workflow';end if;
 if TG_OP='DELETE'then return old;else return new;end if;
end;$$;
do $$declare tab text;begin
 foreach tab in array array['countries','featured_universities','programs','cms_content_blocks','site_content','success_stories','site_settings','news_ticker_items']loop
  execute format('drop trigger if exists cms_content_publication_guard on public.%I',tab);
  execute format('create trigger cms_content_publication_guard before insert or update or delete on public.%I for each row execute function public.cms_content_publication_guard()',tab);
 end loop;
end;$$;
-- All functions containing snapshots/drafts are private; no anonymous public draft API.
revoke all on function public.cms_content_clean(jsonb),public.cms_content_snapshot(text,text),public.cms_content_check_scope(text,text,jsonb),public.cms_content_save_draft(text,text,text,bigint,jsonb,jsonb,uuid,text,jsonb),public.cms_content_apply(text,text,jsonb),public.cms_content_transition(uuid,bigint,text,uuid,text,text,uuid),public.cms_content_history_immutable(),public.cms_content_publication_guard()from public,anon,authenticated,service_role;
grant execute on function public.cms_content_snapshot(text,text),public.cms_content_save_draft(text,text,text,bigint,jsonb,jsonb,uuid,text,jsonb),public.cms_content_transition(uuid,bigint,text,uuid,text,text,uuid)to service_role;
notify pgrst,'reload schema';
commit;
