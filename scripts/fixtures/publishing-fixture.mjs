// Actual workflow SQL in isolated PostgreSQL + actual Supabase SDK, no application env/network.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { mediaFixture } from "./media-fixture.mjs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
export async function publishingFixture({ footer = false } = {}) {
  const { PGlite } = require(
      process.env.PGLITE_MODULE || "@electric-sql/pglite",
    ),
    db = new PGlite(),
    { state, user } = mediaFixture();
  const tables = [
    "countries",
    "featured_universities",
    "programs",
    "cms_content_blocks",
    "site_content",
    "success_stories",
    "site_settings",
    "news_ticker_items",
    "region_groups",
  ];
  for (const name of [
    "cms_publishing_settings",
    "cms_content_workflows",
    "cms_content_revisions",
    "site_settings",
    "news_ticker_items",
  ])
    state.tables[name] ??= [];
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create function is_cms_admin()returns boolean language sql as $$select false$$;
 create table region_groups(id int primary key,label text,continent text,sort_order int default 0);
 create table countries(id uuid primary key,name text not null unique,slug text,region_group_id int references region_groups(id),flag_emoji text,description text,why_study text,why_study_there text,living_cost text,living_cost_approx text,visa_info text,popular_unis jsonb default '[]',popular_universities text[] default '{}',highlighted boolean default false,sort_order int default 0,destination_guide jsonb default '{}',catalogue jsonb default '{}',is_published boolean default true,archived_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
 create table featured_universities(id uuid primary key,name text not null,country text not null,country_id uuid references countries(id)on delete restrict,profile jsonb default '{}',flag_emoji text default '',prestige_line text default '',qs_label text,hero_image_url text default '',hero_image_alt text default '',logo_url text,logo_initials text default '',programs jsonb default '[]',apply_program_summary text,is_published boolean default true,sort_order int default 0,archived_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
 create table programs(id text primary key,title text not null,university text not null,country text not null,university_id uuid references featured_universities(id)on delete restrict,degree text check(degree in('bachelor','master','doctorate','other')),intake text not null,deadline date,tuition_range text not null,description text default '',logo_url text,logo_text text,continent text default 'Europe',region text default '',details jsonb default '{}',is_published boolean default true,sort_order int default 0,archived_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
 create table cms_content_blocks(id uuid primary key default gen_random_uuid(),page_slug text,section_key text,block_key text,block_type text,content jsonb default '{}',media jsonb default '{}',is_active boolean default true,sort_order int default 0,created_at timestamptz default now(),updated_at timestamptz default now(),unique(page_slug,section_key,block_key,sort_order));
 create table site_content(key text primary key,value text not null default '',page text default 'general',section text default 'default',label text,sort_order int default 0,updated_at timestamptz default now());
 create table success_stories(id uuid primary key default gen_random_uuid(),profile_image_url text,full_name text,testimonial text,country text,program text,university text,sort_order int default 0,is_published boolean default true,created_at timestamptz default now(),updated_at timestamptz default now());
 create table site_settings(id smallint primary key,ticker_text text,ticker_active boolean,updated_at timestamptz default now());
 create table news_ticker_items(id uuid primary key default gen_random_uuid(),message text,href text,sort_order int default 0,is_published boolean default true,updated_at timestamptz default now());
 grant usage on schema public to anon,authenticated,service_role;
 grant all on all tables in schema public to anon,authenticated,service_role;`);
  const source = readFileSync(
    new URL(
      "../../supabase/migrations/20261030090000_content_publishing.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(source);
  await db.exec(source);
  if (footer) {
    const extension = readFileSync(new URL("../../supabase/migrations/20261031090000_footer_publishing.sql", import.meta.url), "utf8");
    await db.exec(extension);
    await db.exec(extension);
  }
  const privateNames = [
    "cms_publishing_settings",
    "cms_content_workflows",
    "cms_content_revisions",
  ];
  const syncPrivate = async () => {
    for (const table of privateNames) {
      const { rows } = await db.query(
        `select to_jsonb(t)as value from ${table} t`,
      );
      state.tables[table] = rows.map((row) => row.value);
    }
  };
  const syncIn = async () => {
    await db.exec(
      "begin;select set_config('unimondo.content_publication','active',true)",
    );
    try {
      for (const table of [
        "programs",
        "featured_universities",
        "countries",
        ...tables.filter(
          (name) =>
            ![
              "programs",
              "featured_universities",
              "countries",
              "region_groups",
            ].includes(name),
        ),
        "region_groups",
      ])
        await db.query("delete from " + table);
      for (const table of [
        "region_groups",
        ...tables.filter((name) => name !== "region_groups"),
      ])
        for (const row of state.tables[table] ?? []) {
          const cols = Object.keys(row).filter(
              (key) =>
                key !== "updated_at" || !String(row[key]).startsWith("draft:"),
            ),
            attrs = await db.query(
              "select attname from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped",
              [table],
            ),
            allowed = new Set(attrs.rows.map((attr) => attr.attname)),
            keys = cols.filter((key) => allowed.has(key));
          if (!keys.length) continue;
          const select = keys.map((key) => 'v."' + key + '"').join(",");
          await db.query(
            `insert into ${table}(${keys.map((key) => '"' + key + '"').join(",")})select ${select} from jsonb_populate_record(null::${table},$1::jsonb)v`,
            [JSON.stringify(row)],
          );
        }
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  };
  const syncOut = async () => {
    for (const table of tables) {
      const { rows } = await db.query(
        `select to_jsonb(t)as value from ${table} t`,
      );
      state.tables[table] = rows.map((row) => row.value);
    }
  };
  const functions = {
    cms_content_snapshot: ["t", "k"],
    cms_content_save_draft: [
      "t",
      "k",
      "p_title",
      "p_expected",
      "p_base",
      "p_proposed",
      "p_actor",
      "p_label",
      "p_initial_effective",
    ],
    cms_content_transition: [
      "p_id",
      "p_expected",
      "p_action",
      "p_actor",
      "p_label",
      "p_note",
      "p_revision",
    ],
  };
  const fetcher = async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(url.hostname, "media-tests.invalid");
    const privateTable = url.pathname.split("/").at(-1);
    if (
      privateNames.includes(privateTable) &&
      (options.method ?? "GET") === "GET"
    ) {
      const quote = (name) => {
        assert(/^[a-z_]+$/.test(name));
        return '"' + name + '"';
      };
      const conditions = [],
        values = [];
      for (const [field, filter] of url.searchParams) {
        if (["select", "limit", "offset", "order"].includes(field)) continue;
        const index = filter.indexOf("."),
          operator = filter.slice(0, index),
          value = filter.slice(index + 1);
        assert(["eq", "lt"].includes(operator));
        values.push(value);
        conditions.push(
          quote(field) + (operator === "eq" ? "=" : "<") + "$" + values.length,
        );
      }
      const columns = url.searchParams.get("select") ?? "*",
        selected =
          columns === "*" ? "*" : columns.split(",").map(quote).join(","),
        order = url.searchParams.get("order")?.split(".");
      const query =
        "select " +
        selected +
        " from " +
        privateTable +
        (conditions.length ? " where " + conditions.join(" and ") : "") +
        (order
          ? " order by " +
            quote(order[0]) +
            (order[1] === "desc" ? " desc" : " asc")
          : "") +
        " limit " +
        Number(url.searchParams.get("limit") ?? 1000) +
        " offset " +
        Number(url.searchParams.get("offset") ?? 0);
      const result = await db.query(query, values),
        single = (new Headers(options.headers).get("accept") ?? "").includes(
          "vnd.pgrst.object",
        );
      state.requests.push({ pathname: url.pathname, method: "GET" });
      return new Response(
        JSON.stringify(single ? (result.rows[0] ?? null) : result.rows),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (!url.pathname.startsWith("/rest/v1/rpc/"))
      return state.transport(input, options);
    const name = url.pathname.split("/").at(-1);
    assert(name in functions, "Only workflow RPCs allowed");
    const args =
      options.method === "POST"
        ? JSON.parse(options.body)
        : Object.fromEntries(url.searchParams);
    state.requests.push({
      pathname: url.pathname,
      method: options.method ?? "GET",
    });
    try {
      await syncIn();
      const values = functions[name].map((key) =>
        args[key] !== undefined ? args[key] : null,
      );
      const result = await db.query(
        `select to_jsonb(public.${name}(${values.map((_, index) => "$" + (index + 1)).join(",")}))as value`,
        values,
      );
      await syncOut();
      await syncPrivate();
      return new Response(JSON.stringify(result.rows[0].value), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      await syncPrivate();
      return new Response(
        JSON.stringify({ code: error.code ?? "P0001", message: error.message }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
  };
  state.client = createClient(
    "https://media-tests.invalid",
    "synthetic-publishing-key",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetcher },
    },
  );
  state.activate = async () => {
    await db.query(
      "update cms_publishing_settings set enabled=true where id=1",
    );
    await syncPrivate();
  };
  state.sync = async () => {
    await syncIn();
    await syncPrivate();
  };
  await syncPrivate();
  return { state, user, db, close: () => db.close() };
}
