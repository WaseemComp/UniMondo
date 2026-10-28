-- MANUAL CUTOVER ONLY: apply AFTER Phase 06 code is deployed and schema verified.
-- Never run this automatically in a build. Legacy Phase 05 writers will be blocked.
begin;
update public.cms_publishing_settings set enabled=true where id=1;
commit;
