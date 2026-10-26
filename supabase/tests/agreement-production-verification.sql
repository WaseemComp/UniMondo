-- Read-only checks immediately after migration, before application writes start.
select
  (select count(*) from public.agreements) as original_primary_rows,
  (select count(*) from public.site_content where key like 'agreement:%') as original_fallback_rows,
  (select count(*) from public.agreement_state) as managed_agreements,
  (select count(*) from public.agreement_revisions) as imported_finalized_revisions;

-- All three mismatch counts must be zero. No financial recalculation is performed.
select count(*) as primary_snapshot_mismatches
from public.agreements a left join public.agreement_state s on s.agreement_id = a.id::text
where s.agreement_id is null or s.source_kind <> 'row' or s.source_snapshot <> to_jsonb(a);
select count(*) as fallback_snapshot_mismatches
from public.site_content c left join public.agreement_state s on s.agreement_id = substr(c.key, 11)
where c.key like 'agreement:%'
  and not exists (select 1 from public.agreements a where a.id::text = substr(c.key, 11))
  and (s.agreement_id is null or s.source_kind <> 'record' or s.source_snapshot <> c.value::jsonb);
select count(*) as finalized_revision_mismatches
from public.agreement_state s left join public.agreement_revisions r
  on r.agreement_id = s.agreement_id and r.revision_no = 1
where s.status = 'finalized'
  and (r.agreement_id is null or r.snapshot <> s.source_snapshot or r.snapshot_kind <> s.source_kind);

-- Every result should be false; mutations are server-only through the RPC.
select
  has_table_privilege('authenticated','public.agreement_state','UPDATE') as staff_can_update_state,
  has_table_privilege('authenticated','public.agreements','DELETE') as staff_can_delete_originals,
  has_table_privilege('service_role','public.agreement_revisions','UPDATE') as server_can_overwrite_revisions,
  has_table_privilege('service_role','public.agreement_revisions','TRUNCATE') as server_can_truncate_revisions,
  has_function_privilege('authenticated','public.agreement_mutate(text,text,bigint,text,boolean,jsonb,jsonb)','EXECUTE') as staff_can_call_mutation_rpc;
