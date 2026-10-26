import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { POST } from "../src/app/api/admin/agreements/route.ts";
import { PUT, PATCH, DELETE } from "../src/app/api/admin/agreements/[id]/route.ts";
import { GET as EXPORT } from "../src/app/api/admin/agreements/[id]/export/route.ts";
import { getAgreementById, getAgreementRevision, getAgreementRevisions, getAgreementsList } from "../src/lib/agreements/persistence.ts";
import { calculateLegacyAgreementFinancials } from "../src/lib/agreements/financials.ts";
import { NextRequest } from "next/server";

// Real PostgreSQL transactions/locks/RLS; only auth and the PostgREST HTTP transport are substituted.
// Requires the disposable local container documented in supabase/AGREEMENT_REVISIONS.md.
const container = process.env.AGREEMENT_TEST_CONTAINER || "unimondo-agreement-test";
const database = `agreements_${Date.now()}`;
execFileSync("docker", ["exec", container, "createdb", "-U", "postgres", database]);
const args = ["exec", "-i", container, "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-Atq"];
const sqlSync = sql => execFileSync("docker", args, { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const literal = value => value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${literal(JSON.stringify(value))}::jsonb`;
const sql = statement => new Promise((resolve, reject) => {
  const child = spawn("docker", args); let output = "", error = "";
  child.stdout.on("data", chunk => output += chunk); child.stderr.on("data", chunk => error += chunk);
  child.on("close", code => code ? reject(Object.assign(new Error(error), { code: error.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1] })) : resolve(output.trim()));
  child.stdin.end(statement);
});
let bootstrap = readFileSync("supabase/tests/agreement-bootstrap.sql", "utf8");
bootstrap = bootstrap.replace(/create role (\w+)( bypassrls)?;/g, (_, role, options = "") => `do $$ begin create role ${role}${options}; exception when duplicate_object then null; end $$;`);
sqlSync(bootstrap);
sqlSync(readFileSync("supabase/migrations/20260426120000_agreements.sql", "utf8"));
sqlSync("grant select,insert,update,delete on public.agreements to anon, authenticated, service_role;");
const historicId = "00000000-0000-4000-8000-000000000001";
const legacy = { id: "legacy-fallback", referenceNumber: "UM/LEGACY/1", status: "finalized", financials: { netFeeEUR: 863, agreedExchangeRate: 305, discountValue: 137 }, studentFullName: "HISTORIC FALLBACK", createdBy: "historic author" };
const historicalFinance = { ...calculateLegacyAgreementFinancials({ paymentCurrency: 'EUR', discountType: 'amount', discountValue: 137.25 }), netFeeEUR: 123.45, grossFee: 999.12 };
sqlSync(`insert into agreements(id,reference_number,status,payload) values ('${historicId}','UM/HISTORIC/1','finalized',${json({ financials: historicalFinance })});
insert into site_content(key,value,page,section) values ('agreement:legacy-fallback',${literal(JSON.stringify(legacy))},'admin','agreements');
insert into site_content(key,value) values ('public-copy','before');`);
const before = sqlSync("select jsonb_build_object('agreements',(select jsonb_agg(to_jsonb(a)) from agreements a),'fallback',(select value from site_content where key='agreement:legacy-fallback'));");
const migration = readFileSync("supabase/migrations/20261026120000_agreement_revisions.sql", "utf8");
// Transactional rollback rehearsal: all new structures disappear and original data is unchanged.
sqlSync(migration.replace(/commit;\s*$/, "rollback;"));
assert.equal(sqlSync("select to_regclass('public.agreement_state') is null;"), "t");
assert.equal(sqlSync("select jsonb_build_object('agreements',(select jsonb_agg(to_jsonb(a)) from agreements a),'fallback',(select value from site_content where key='agreement:legacy-fallback'));"), before);
sqlSync(migration);
assert.deepEqual(sqlSync(readFileSync("supabase/tests/agreement-production-verification.sql", "utf8")).split("\n"), ["1|1|2|2", "0", "0", "0", "f|f|f|f|f"]);
assert.equal(sqlSync("select jsonb_build_object('agreements',(select jsonb_agg(to_jsonb(a)) from agreements a),'fallback',(select value from site_content where key='agreement:legacy-fallback'));"), before);
assert.equal(sqlSync(`select snapshot = (select to_jsonb(a) from agreements a where id='${historicId}') from agreement_revisions where agreement_id='${historicId}';`), "t");
assert.deepEqual(JSON.parse(sqlSync("select snapshot from agreement_revisions where agreement_id='legacy-fallback';")), legacy);
sqlSync("update site_content set value='after' where key='public-copy';");
assert.equal(sqlSync("select value from site_content where key='public-copy';"), "after");
console.log("PASS: migration preserves original rows and exact legacy financial snapshots; rollback rehearsed");

let offline = false, writesFail = false;
const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const client = createClient("https://test.invalid", "local-test-key", { auth: { persistSession: false }, global: {
  fetch: async (input, options = {}) => {
    const url = new URL(input); const resource = url.pathname.split("/").at(-1); const method = options.method || "GET";
    if (offline || (writesFail && method !== "GET")) return respond({ code: "08006", message: "Simulated storage failure" }, 503);
    try {
      if (resource === "agreement_mutate") {
        const p = JSON.parse(options.body);
        const result = await sql(`set role service_role; select public.agreement_mutate(${literal(p.p_id)},${literal(p.p_action)},${p.p_expected == null ? "null" : Number(p.p_expected)},${literal(p.p_actor)},${Boolean(p.p_super)},${p.p_record == null ? "null" : json(p.p_record)},${p.p_row == null ? "null" : json(p.p_row)});`);
        return respond(JSON.parse(result));
      }
      assert(["agreement_state", "agreement_revisions"].includes(resource), `Unexpected resource ${resource}`);
      assert.equal(method, "GET");
      const conditions = [];
      for (const [key, value] of url.searchParams) {
        if (["select", "order"].includes(key)) continue;
        assert(/^[a-z_]+$/.test(key));
        if (value === "is.null") conditions.push(`${key} is null`);
        else { assert(value.startsWith("eq.")); conditions.push(`${key} = ${literal(value.slice(3))}`); }
      }
      let order = "";
      if (url.searchParams.has("order")) {
        const [column, direction] = url.searchParams.get("order").split("."); assert(/^[a-z_]+$/.test(column));
        order = ` order by ${column} ${direction === "desc" ? "desc" : "asc"}`;
      }
      const result = await sql(`set role service_role; select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select * from ${resource}${conditions.length ? ` where ${conditions.join(" and ")}` : ""}${order}) r;`);
      return respond(JSON.parse(result));
    } catch (error) { return respond({ code: error.code || "XX000", message: error.message }, 400); }
  },
} });
const superadmin = { id: "superadmin", email: "super@example.invalid", admin: true, super: true, discount: true };
const approver = { id: "approver", email: "approver@example.invalid", admin: true, discount: true };
const staff = { id: "staff", email: "staff@example.invalid", admin: true, discount: false };
globalThis.__agreementTestServices = { client, user: approver };
let counter = 0;
const fixture = () => ({ referenceNumber: `UM/TEST/${++counter}`, consultantEntityName: "", consultantRegNumber: "", consultantAddress: "",
  studentFullName: "TEST STUDENT", studentParentGuardian: "", studentCnicPassport: "TEST-ID", studentAddress: "", studentEmail: "", studentPhone: "",
  degreeLevel: "TEST DEGREE", fieldOfStudy: "Manually entered field", preferredDestination: "Manually entered destination", academicYearIntake: "",
  paymentCurrency: "USD", agreedExchangeRate: 1.12, exchangeRateDate: "2026-10-26", discountType: "percentage", discountValue: 10, pricingMode: "reference",
  repName: "TEST REPRESENTATIVE", repDesignation: "", repDate: "", studentSignatureDate: "", agreementDate: "2026-10-26" });
const request = body => new NextRequest("https://test.invalid/api/admin/agreements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const context = id => ({ params: Promise.resolve({ id }) });
async function expect(response, status) { const r = await response; assert.equal(r.status, status, await r.clone().text()); return r.json(); }
const input = fixture();
const { agreement: initial } = await expect(POST(request(input)), 201);
assert.equal(initial.status, "draft");
assert.equal(initial.version, 1);
await expect(POST(request(input)), 409);
await expect(POST(request({ ...fixture(), status: "finalized" })), 403);
globalThis.__agreementTestServices.user = staff;
for (const change of [{ discountValue: 0 }, { agreedExchangeRate: 2 }, { pricingMode: "custom", customGrossFee: 100 }]) {
  await expect(PUT(request({ ...input, version: initial.version, ...change }), context(initial.id)), 403);
}
await expect(PATCH(request({ status: "finalized", version: initial.version }), context(initial.id)), 403);
await expect(DELETE(request({ version: initial.version }), context(initial.id)), 403);
const { agreement: edited } = await expect(PUT(request({ ...input, version: initial.version, repName: "MANUAL NAME", repDesignation: "MANUAL DESIGNATION" }), context(initial.id)), 200);
assert.equal(edited.repName, "MANUAL NAME");
await expect(PUT(request({ ...input, version: initial.version }), context(initial.id)), 409);
globalThis.__agreementTestServices.user = approver;
await expect(PATCH(request({ status: "finalized", version: edited.version }), context(initial.id)), 403);
globalThis.__agreementTestServices.user = superadmin;
const { agreement: finalized } = await expect(PATCH(request({ status: "finalized", version: edited.version }), context(initial.id)), 200);
assert.equal(finalized.revisionNumber, 1);
assert.equal(finalized.financials.pricingApprovedBy, superadmin.email);
const snapshot1 = await getAgreementRevision(initial.id, 1);
globalThis.__agreementTestServices.user = staff;
const revisedInput = { ...input, version: finalized.version, studentFullName: "NEW DRAFT STUDENT" };
const { agreement: draft } = await expect(PUT(request(revisedInput), context(initial.id)), 200);
assert.equal(draft.status, "draft");
assert.equal((await getAgreementById(initial.id)).status, "finalized");
assert.equal((await getAgreementById(initial.id)).studentFullName, snapshot1.studentFullName);
assert.equal((await getAgreementById(initial.id, true)).studentFullName, "NEW DRAFT STUDENT");
assert.deepEqual(await getAgreementRevision(initial.id, 1), snapshot1);
assert.deepEqual(draft.financials, finalized.financials, "Content edits must preserve approved financial snapshots exactly");
console.log("PASS: staff/approver/Superadmin permissions, pending draft revision and immutable finalized snapshot");

// Both real DB sessions read the same version; advisory and row locks allow exactly one mutation.
globalThis.__agreementTestServices.user = superadmin;
const races = await Promise.all([
  PATCH(request({ status: "finalized", version: draft.version }), context(initial.id)),
  PUT(request({ ...revisedInput, version: draft.version, repDesignation: "RACING EDIT" }), context(initial.id)),
]);
assert.deepEqual(races.map(r => r.status).sort(), [200, 409]);
let current = await getAgreementById(initial.id, true);
if (current.status === "draft") {
  ({ agreement: current } = await expect(PATCH(request({ status: "finalized", version: current.version }), context(initial.id)), 200));
}
assert.equal((await getAgreementRevisions(initial.id)).length, 2);
assert.deepEqual(await getAgreementRevision(initial.id, 1), snapshot1);
await expect(PATCH(request({ status: "draft", version: current.version }), context(initial.id)), 200);
current = await getAgreementById(initial.id, true);
assert.equal(current.status, "draft");
const deleteRace = await Promise.all([
  PATCH(request({ status: "finalized", version: current.version }), context(initial.id)),
  DELETE(request({ version: current.version }), context(initial.id)),
]);
assert.equal(deleteRace.filter(r => r.status === 200).length, 1);
assert(deleteRace.some(r => [404, 409].includes(r.status)));
console.log("PASS: concurrent save/finalize and delete/finalize reject stale writers; reopen retains all prior revisions");

for (const role of ["anon", "authenticated"]) {
  await assert.rejects(sql(`set role ${role}; select public.agreement_mutate('x','delete',1,'forged',true);`), error => error.code === "42501");
  await assert.rejects(sql(`set role ${role}; delete from agreements where id='${historicId}';`), error => error.code === "42501");
  await assert.rejects(sql(`set role ${role}; update agreement_state set status='draft';`), error => error.code === "42501");
  assert.equal(await sql(`set role ${role}; select count(*) from site_content where key like 'agreement:%';`), "0");
}
await assert.rejects(sql("set role service_role; update agreement_revisions set author='forged';"), error => error.code === "42501");
await assert.rejects(sql("set role service_role; truncate agreement_revisions;"), error => error.code === "42501");
await assert.rejects(sql("update agreement_revisions set author='forged';"), error => error.code === "42501");
await assert.rejects(sql(`update agreements set student_full_name='forged' where id='${historicId}';`), error => error.code === "42501");
await assert.rejects(sql("delete from site_content where key='agreement:legacy-fallback';"), error => error.code === "42501");
console.log("PASS: SQL role/RLS checks block direct status/deletion, legacy disclosure and audit mutation/truncation");

// Content-only edits of an imported legacy record preserve even nonstandard stored values exactly.
globalThis.__agreementTestServices.user = staff;
const legacyEdit = { ...fixture(), referenceNumber: "UM/HISTORIC/1", version: 1, paymentCurrency: "EUR",
  agreedExchangeRate: null, exchangeRateDate: null, discountType: historicalFinance.discountType, discountValue: historicalFinance.discountValue };
const { agreement: legacyDraft } = await expect(PUT(request(legacyEdit), context(historicId)), 200);
assert.deepEqual(legacyDraft.financials, historicalFinance);
assert.deepEqual((await getAgreementRevision(historicId, 1)).financials, historicalFinance);

// Archived finalized revisions can be viewed/exported by authorized staff; no new validation can invalidate legacy snapshots.
globalThis.__agreementTestServices.user = staff;
for (const format of ["docx", "pdf"]) {
  const result = await EXPORT(new NextRequest(`https://test.invalid/api/admin/agreements/${historicId}/export?format=${format}&revision=1`), context(historicId));
  assert.equal(result.status, 200, await result.clone().text());
}
globalThis.__agreementTestServices.user = null;
await expect(PUT(request(input), context(historicId)), 401);
await expect(PATCH(request({ status: "draft", version: 1 }), context(historicId)), 401);
await expect(DELETE(request({ version: 1 }), context(historicId)), 401);
const denied = await EXPORT(new NextRequest(`https://test.invalid/api/admin/agreements/${historicId}/export?format=pdf&revision=1`), context(historicId));
assert.equal(denied.status, 401);
globalThis.__agreementTestServices.user = superadmin;
await expect(DELETE(request({ version: legacyDraft.version }), context(historicId)), 200);
assert.equal(await getAgreementById(historicId), null);
assert.equal(sqlSync(`select count(*) from agreement_revisions where agreement_id='${historicId}';`), "1");
assert.equal(sqlSync(`select count(*) from agreement_events where agreement_id='${historicId}' and action='delete' and snapshot is not null;`), "1");
assert(!(await getAgreementsList()).some(record => record.id === historicId));
console.log("PASS: history downloads, unauthorized requests and soft deletion with retained audit snapshots");

for (const failure of ["unconfigured", "offline", "write"]) {
  globalThis.__agreementTestServices.client = failure === "unconfigured" ? null : client;
  offline = failure === "offline"; writesFail = failure === "write";
  await expect(POST(request(fixture())), 503);
}
offline = writesFail = false; globalThis.__agreementTestServices.client = client;
const incomplete = { ...fixture(), studentFullName: "", studentCnicPassport: "", fieldOfStudy: "", paymentCurrency: "BDT", agreedExchangeRate: null, exchangeRateDate: "", discountValue: 0 };
const { agreement: incompleteDraft } = await expect(POST(request(incomplete)), 201);
await expect(PATCH(request({ status: "finalized", version: incompleteDraft.version }), context(incompleteDraft.id)), 400);
console.log("PASS: fail-closed storage errors; incomplete drafts save while finalization enforces essential information");
console.log(`All agreement regressions passed against isolated PostgreSQL (${database}). No production data accessed.`);
