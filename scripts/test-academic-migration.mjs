// PostgreSQL semantics in an isolated in-memory database. Never reads application env.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
try {
  await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create function public.is_cms_admin() returns boolean language sql stable as $$ select current_setting('test.cms_admin',true)='true' $$;
 create table countries(id uuid primary key,name text not null unique,slug text,region_group_id int,description text,why_study_there text,living_cost_approx text,visa_info text,popular_universities text[] default '{}',updated_at timestamptz default now());
 create table featured_universities(id uuid primary key,name text not null,country text not null,programs jsonb default '[]',is_published boolean default true,updated_at timestamptz default now());
 create table programs(id text primary key,title text not null,university text not null,country text not null,degree text check(degree in ('bachelor','master')),deadline date not null,is_published boolean default true,updated_at timestamptz default now());
 alter table countries enable row level security; alter table featured_universities enable row level security; alter table programs enable row level security;
 create policy countries_select_public on countries for select using(true);
 create policy featured_universities_select_public on featured_universities for select using(is_published or is_cms_admin());
 create policy programs_select_public on programs for select using(is_published or is_cms_admin());
 create policy countries_write_admin on countries for all to authenticated using(is_cms_admin()) with check(is_cms_admin());
 create policy featured_universities_write_admin on featured_universities for all to authenticated using(is_cms_admin()) with check(is_cms_admin());
 create policy programs_write_admin on programs for all to authenticated using(is_cms_admin()) with check(is_cms_admin());
 grant usage on schema public to anon,authenticated,service_role;
 grant all on countries,featured_universities,programs to anon,authenticated,service_role;
 insert into countries(id,name,slug,why_study_there,living_cost_approx,visa_info) values('11111111-1111-4111-8111-111111111111','Italy','italy','Existing guide','Existing costs','Existing visa');
 insert into featured_universities(id,name,country,programs) values('22222222-2222-4222-8222-222222222222','Existing university','Italy','[{"name":"Existing summary","tuition_range":"Existing tuition"}]');
 insert into programs(id,title,university,country,degree,deadline) values('existing-public-id','Existing programme','Existing university','Italy','master','2027-06-01');
 `);
  const before = await db.query(
    "select id,name,slug,why_study_there,living_cost_approx,visa_info,updated_at from countries",
  );
  const source = readFileSync(
    new URL(
      "../supabase/migrations/20261029090000_academic_catalogue.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(source);
  await db.exec(source);
  assert.deepEqual(
    (
      await db.query(
        "select id,name,slug,why_study_there,living_cost_approx,visa_info,updated_at from countries",
      )
    ).rows,
    before.rows,
    "Idempotent setup preserves all original values and timestamps",
  );
  assert.equal((await db.query("select * from programs")).rows.length, 1);
  assert.equal(
    (await db.query("select * from featured_universities")).rows.length,
    1,
  );
  const asRole = async (role, sql) => {
    await db.exec(`set role ${role}`);
    try {
      return await db.query(sql);
    } finally {
      await db.exec("reset role");
    }
  };
  for (const table of ["countries", "featured_universities", "programs"]) {
    const grants = await db.query(
      `select has_table_privilege('authenticated','${table}','INSERT') as insert,has_table_privilege('authenticated','${table}','UPDATE') as update,has_table_privilege('authenticated','${table}','DELETE') as delete`,
    );
    assert.deepEqual(grants.rows, [
      { insert: false, update: false, delete: false },
    ]);
  }
  await db.exec("set test.cms_admin='true'");
  for (const role of ["anon", "authenticated"])
    await assert.rejects(
      () => asRole(role, "update programs set title='Unauthorized change'"),
      /permission denied/,
    );
  await db.exec("set test.cms_admin='false'");
  assert.equal((await asRole("anon", "select * from programs")).rows.length, 1);
  await asRole(
    "service_role",
    "update programs set university_id='22222222-2222-4222-8222-222222222222'",
  );
  await asRole(
    "service_role",
    "update featured_universities set country_id='11111111-1111-4111-8111-111111111111'",
  );
  await asRole("service_role", "update countries set is_published=false");
  for (const table of ["countries", "featured_universities", "programs"])
    assert.equal(
      (await asRole("anon", `select * from ${table}`)).rows.length,
      0,
      "Hidden destination suppresses public descendants",
    );
  assert.equal(
    (await asRole("service_role", "select * from programs")).rows.length,
    1,
    "Child still exists",
  );
  await asRole("service_role", "update countries set is_published=true");
  await asRole(
    "service_role",
    "update featured_universities set archived_at=now()",
  );
  assert.equal(
    (await asRole("anon", "select * from programs")).rows.length,
    0,
    "Archived university suppresses programmes",
  );
  await asRole(
    "service_role",
    "update featured_universities set archived_at=null",
  );
  await asRole("service_role", "update programs set university_id=null");
  await asRole(
    "service_role",
    "update featured_universities set is_published=false",
  );
  assert.equal(
    (await asRole("anon", "select * from programs")).rows.length,
    0,
    "Legacy text parent is also visibility protected",
  );
  await asRole(
    "service_role",
    "update featured_universities set is_published=true",
  );
  await asRole(
    "service_role",
    "update programs set deadline=null,degree='doctorate'",
  );
  assert.equal(
    (await db.query("select deadline from programs")).rows[0].deadline,
    null,
    "Unknown deadline supported without invention",
  );
  await assert.rejects(
    () =>
      asRole(
        "service_role",
        "update programs set university_id='99999999-9999-4999-8999-999999999999'",
      ),
    /foreign key/,
  );
  await db.exec("begin");
  try {
    await db.exec(
      "update programs set university_id='22222222-2222-4222-8222-222222222222'",
    );
    await assert.rejects(
      () =>
        db.query(
          "delete from featured_universities where id='22222222-2222-4222-8222-222222222222'",
        ),
      /foreign key/,
    );
  } finally {
    await db.exec("rollback");
  }
  await assert.rejects(
    () =>
      asRole(
        "service_role",
        "insert into countries(id,name)values('99999999-9999-4999-8999-999999999999','italy')",
      ),
    /already exists/,
  );
  await assert.rejects(
    () =>
      asRole(
        "service_role",
        "insert into featured_universities(id,name,country)values('99999999-9999-4999-8999-999999999999','existing UNIVERSITY','Italy')",
      ),
    /already exists/,
  );
  console.log(
    "PASS: actual PostgreSQL migration applies twice without data resets; grants block direct staff/anonymous writes even with legacy broad policies; public RLS hides descendants including legacy text relationships; FK integrity, retained children, unknown deadline, expanded degree choices and duplicate identity protection. In-memory only; production untouched.",
  );
} finally {
  await db.close();
}
