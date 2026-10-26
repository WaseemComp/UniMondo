-- Additive agreement sidecar. Original agreements/site_content rows remain unchanged.
-- Only the trusted server may mutate via agreement_mutate; browser roles have no write path.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
lock table public.agreements, public.site_content in share row exclusive mode;

create table public.agreement_state (
  agreement_id text primary key,
  reference_number text not null unique,
  source_snapshot jsonb not null,
  source_kind text not null check (source_kind in ('row', 'record')),
  draft jsonb,
  status text not null check (status in ('draft', 'finalized')),
  version bigint not null default 1,
  revision_no integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.agreement_revisions (
  agreement_id text not null references public.agreement_state(agreement_id),
  revision_no integer not null,
  snapshot jsonb not null,
  snapshot_kind text not null check (snapshot_kind in ('row', 'record')),
  author text not null,
  finalized_at timestamptz not null,
  supersedes integer,
  primary key (agreement_id, revision_no)
);
create table public.agreement_events (
  id bigint generated always as identity primary key,
  agreement_id text not null references public.agreement_state(agreement_id),
  action text not null,
  actor text not null,
  version bigint not null,
  occurred_at timestamptz not null default now(),
  snapshot jsonb
);

-- Copy complete raw rows, including every financial payload, without normalization/calculation.
insert into public.agreement_state (agreement_id, reference_number, source_snapshot, source_kind, status, revision_no, updated_at)
select id::text, reference_number, to_jsonb(a), 'row', status,
  case when status = 'finalized' then 1 else 0 end, updated_at
from public.agreements a;
-- Primary rows remain authoritative over old duplicate fallback entries.
insert into public.agreement_state (agreement_id, reference_number, source_snapshot, source_kind, status, revision_no, updated_at)
select value::jsonb->>'id', value::jsonb->>'referenceNumber', value::jsonb, 'record',
  coalesce(value::jsonb->>'status', 'draft'),
  case when value::jsonb->>'status' = 'finalized' then 1 else 0 end, updated_at
from public.site_content c
where key like 'agreement:%'
  and not exists (select 1 from public.agreement_state s where s.agreement_id = substr(c.key, 11));
-- Malformed/ambiguous legacy records deliberately abort the transaction for review.
insert into public.agreement_revisions (agreement_id, revision_no, snapshot, snapshot_kind, author, finalized_at)
select agreement_id, 1, source_snapshot, source_kind,
  coalesce(source_snapshot#>>'{payload,financials,pricingApprovedBy}', source_snapshot#>>'{financials,pricingApprovedBy}',
    source_snapshot->>'created_by', source_snapshot->>'createdBy', 'legacy import'), updated_at
from public.agreement_state where status = 'finalized';
insert into public.agreement_events (agreement_id, action, actor, version)
select agreement_id, 'import', 'migration', version from public.agreement_state;

alter table public.agreement_state enable row level security;
alter table public.agreement_revisions enable row level security;
alter table public.agreement_events enable row level security;
revoke all on public.agreement_state, public.agreement_revisions, public.agreement_events from public, anon, authenticated, service_role;
grant select on public.agreement_state, public.agreement_revisions, public.agreement_events to service_role;
revoke all on sequence public.agreement_events_id_seq from public, anon, authenticated, service_role;

-- Raw agreements and legacy fallback content must not bypass API permissions.
revoke insert, update, delete on public.agreements from public, anon, authenticated, service_role;
drop policy if exists agreements_write_admin on public.agreements;
create policy agreements_private_legacy_content on public.site_content as restrictive
  for all to anon, authenticated
  using (key not like 'agreement:%') with check (key not like 'agreement:%');

create function public.agreement_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Agreement audit snapshots are immutable' using errcode = '42501';
end $$;
create trigger agreement_revisions_immutable before update or delete on public.agreement_revisions
for each row execute function public.agreement_immutable();
create trigger agreement_events_immutable before update or delete on public.agreement_events
for each row execute function public.agreement_immutable();

-- Prevent an older server from silently overwriting a record now managed by revisions.
create function public.agreement_guard_original() returns trigger language plpgsql security definer set search_path = '' as $$
declare item_id text;
begin
  if tg_table_name = 'agreements' then item_id := old.id::text;
  else
    if old.key not like 'agreement:%' then
      if tg_op = 'UPDATE' then return new; end if;
      return old;
    end if;
    item_id := substr(old.key, 11);
  end if;
  if exists (select 1 from public.agreement_state where agreement_id = item_id) then
    raise exception 'Use the agreement revision API' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then return new; end if;
  return old;
end $$;
create trigger agreements_preserve_original before update or delete on public.agreements
for each row execute function public.agreement_guard_original();
create trigger agreement_legacy_preserve_original before update or delete on public.site_content
for each row execute function public.agreement_guard_original();

-- API has already authenticated the actor and verified pricing/status permissions.
-- No untrusted role can invoke this function or forge p_super.
create function public.agreement_mutate(
  p_id text, p_action text, p_expected bigint, p_actor text,
  p_super boolean default false, p_record jsonb default null, p_row jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.agreement_state; original jsonb; kind text; next_status text; snap jsonb;
begin
  if p_action is null or p_action not in ('save', 'finalize', 'reopen', 'delete') then
    raise exception 'Invalid agreement action' using errcode = '22023';
  end if;
  if p_action <> 'save' and p_super is not true then
    raise exception 'Only Superadmin may change status or delete' using errcode = '42501';
  end if;
  -- Serializes creation, legacy registration, revision numbering and every mutation per agreement.
  perform pg_advisory_xact_lock(hashtextextended(p_id, 0));
  select * into s from public.agreement_state where agreement_id = p_id for update;
  if not found then
    select to_jsonb(a) into original from public.agreements a where id::text = p_id for update;
    kind := 'row';
    if original is null then
      select value::jsonb into original from public.site_content where key = 'agreement:' || p_id for update;
      kind := 'record';
    end if;
    if original is null then
      if p_action <> 'save' or p_expected is not null or p_record is null or p_row is null then
        raise exception 'Agreement not found' using errcode = 'P0002';
      end if;
      if p_record->>'id' <> p_id or p_record->>'status' <> 'draft' then
        raise exception 'New agreements must be drafts' using errcode = '22023';
      end if;
      insert into public.agreements select * from jsonb_populate_record(null::public.agreements, p_row);
      original := p_record; kind := 'record';
    end if;
    next_status := coalesce(original->>'status', 'draft');
    insert into public.agreement_state (agreement_id, reference_number, source_snapshot, source_kind, status, revision_no)
    values (p_id, coalesce(original->>'reference_number', original->>'referenceNumber'), original, kind,
      next_status, case when next_status = 'finalized' then 1 else 0 end) returning * into s;
    if next_status = 'finalized' then
      insert into public.agreement_revisions values (p_id, 1, original, kind, p_actor, s.updated_at, null);
    end if;
    if p_expected is null and p_action = 'save' then
      insert into public.agreement_events (agreement_id, action, actor, version) values (p_id, 'create', p_actor, s.version);
      return to_jsonb(s);
    end if;
  end if;
  if s.deleted_at is not null then raise exception 'Agreement not found' using errcode = 'P0002'; end if;
  if p_expected is null or s.version <> p_expected then
    raise exception 'Agreement changed. Reload before trying again.' using errcode = '40001';
  end if;
  if p_action = 'save' then
    if p_record is null or p_record->>'id' <> p_id or p_record->>'referenceNumber' <> s.reference_number then
      raise exception 'Agreement reference cannot change' using errcode = '22023';
    end if;
    -- Staff editing a finalized agreement starts a pending draft; the finalized status/revision stays intact.
    update public.agreement_state set draft = p_record || jsonb_build_object('status', 'draft'),
      version = version + 1, updated_at = clock_timestamp() where agreement_id = p_id returning * into s;
  elsif p_action = 'finalize' then
    if s.status = 'finalized' and s.draft is null then raise exception 'Already finalized' using errcode = '40001'; end if;
    snap := coalesce(s.draft, s.source_snapshot); kind := case when s.draft is null then s.source_kind else 'record' end;
    if kind = 'record' then
      snap := snap || jsonb_build_object('status', 'finalized', 'financials',
        (snap->'financials') || jsonb_build_object('pricingApprovedBy', p_actor, 'pricingApprovedAt', clock_timestamp()));
    end if;
    insert into public.agreement_revisions (agreement_id, revision_no, snapshot, snapshot_kind, author, finalized_at, supersedes)
    values (p_id, s.revision_no + 1, snap, kind, p_actor, clock_timestamp(), nullif(s.revision_no, 0));
    update public.agreement_state set source_snapshot = snap, source_kind = kind, draft = null, status = 'finalized',
      revision_no = revision_no + 1, version = version + 1, updated_at = clock_timestamp()
      where agreement_id = p_id returning * into s;
  elsif p_action = 'reopen' then
    if s.status <> 'finalized' then raise exception 'Already a draft' using errcode = '40001'; end if;
    -- Keep the latest finalized snapshot in revisions; draft editor can load source_snapshot unchanged.
    update public.agreement_state set status = 'draft', version = version + 1, updated_at = clock_timestamp()
      where agreement_id = p_id returning * into s;
  else
    update public.agreement_state set deleted_at = clock_timestamp(), version = version + 1, updated_at = clock_timestamp()
      where agreement_id = p_id returning * into s;
  end if;
  insert into public.agreement_events (agreement_id, action, actor, version, snapshot)
  values (p_id, p_action, p_actor, s.version, case when p_action = 'delete' then to_jsonb(s) else null end);
  return to_jsonb(s);
end $$;
revoke all on function public.agreement_mutate(text,text,bigint,text,boolean,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.agreement_mutate(text,text,bigint,text,boolean,jsonb,jsonb) to service_role;
revoke all on function public.agreement_guard_original(), public.agreement_immutable() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
