-- Phase 07: recognize the global footer in the existing private content workflow.
-- MANUAL REVIEW/EXECUTION ONLY. Does not activate publishing or change content.
begin;
create or replace function public.cms_content_snapshot(t text,k text)returns jsonb language plpgsql stable security definer set search_path=public as $$
declare data jsonb='{}';a jsonb;b jsonb;
begin
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
  if t not in('countries','universities','programmes')then raise exception 'Unsupported content type';end if;
  execute format('select coalesce(jsonb_agg(public.cms_content_clean(to_jsonb(s))order by s.id::text collate "C"),''[]'')from public.%I s where s.id::text=$1',case t when 'universities'then 'featured_universities'when 'programmes'then 'programs'else t end)into a using k;
  data=jsonb_build_object(case t when 'universities'then 'featured_universities'when 'programmes'then 'programs'else t end,a);
 end if;
 return jsonb_build_object('tables',data);
end;$$;
revoke all on function public.cms_content_snapshot(text,text) from public,anon,authenticated,service_role;
grant execute on function public.cms_content_snapshot(text,text) to service_role;
notify pgrst,'reload schema';
commit;
