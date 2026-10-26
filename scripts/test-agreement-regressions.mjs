import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { POST } from "../src/app/api/admin/agreements/route.ts";
import { PUT, DELETE } from "../src/app/api/admin/agreements/[id]/route.ts";
import { saveAgreement, getAgreementById, deleteAgreement, getAgreementsList } from "../src/lib/agreements/persistence.ts";
import { generateAgreementDocx } from "../src/lib/agreements/docx-generator.ts";
import { generateAgreementPdf } from "../src/lib/agreements/pdf-generator.ts";
import { PrintAgreementClient } from "../src/components/admin/agreements/print-agreement-client.tsx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JSZip from "jszip";

// Real Supabase query builders, isolated HTTP transport and auth. No production I/O.
const tables = { agreements: new Map(), site_content: new Map() };
let offline = false, writesFail = false, missingPrimary = false;
const writes = [];
const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const client = createClient("https://test.invalid", "test-only-key", { auth: { persistSession: false }, global: {
  fetch: async (input, options = {}) => {
    const url = new URL(input);
    const table = url.pathname.split("/").at(-1);
    assert(table in tables, `Unexpected test request: ${table}`);
    const method = options.method || "GET";
    if (offline || (writesFail && method !== "GET")) return respond({ code: "08006", message: "Simulated storage failure" }, 503);
    if (missingPrimary && table === "agreements") return respond({ code: "PGRST205", message: "Missing test table" }, 404);
    const rows = tables[table];
    const matches = row => [...url.searchParams].every(([key, filter]) => {
      if (["select", "order"].includes(key)) return true;
      assert(filter.startsWith("eq."), `Unexpected filter ${filter}`);
      return String(row[key]) === filter.slice(3);
    });
    if (method === "GET") return respond([...rows.values()].filter(matches));
    writes.push({ table, method, filters: Object.fromEntries(url.searchParams) });
    if (method === "POST") {
      const row = JSON.parse(options.body);
      const key = table === "agreements" ? row.id : row.key;
      if (rows.has(key) || (table === "agreements" && [...rows.values()].some(r => r.reference_number === row.reference_number))) {
        return respond({ code: "23505", message: "Duplicate reference" }, 409);
      }
      rows.set(key, structuredClone(row));
      return respond([row], 201);
    }
    const selected = [...rows.entries()].filter(([, row]) => matches(row));
    const result = [];
    for (const [key, old] of selected) {
      if (method === "DELETE") { rows.delete(key); result.push(old); }
      else { const row = { ...old, ...JSON.parse(options.body) }; rows.set(key, row); result.push(row); }
    }
    return respond(result);
  },
} });
const admin = { id: "test-admin", email: "admin@example.invalid", admin: true, discount: true };
const staff = { id: "test-staff", email: "staff@example.invalid", admin: true, discount: false };
globalThis.__agreementTestServices = { client, user: admin };
let counter = 0;
const fixture = () => ({
  referenceNumber: `UM/TEST/REGRESSION-${++counter}`, status: "draft", consultantEntityName: "TEST CONSULTANT",
  consultantRegNumber: "TEST-REG", consultantAddress: "TEST ADDRESS", studentFullName: "TEST STUDENT",
  studentParentGuardian: "TEST GUARDIAN", studentCnicPassport: "TEST-ID", studentAddress: "TEST ADDRESS",
  studentEmail: "student@example.invalid", studentPhone: "TEST-PHONE", degreeLevel: "TEST DEGREE", fieldOfStudy: "TEST FIELD",
  preferredDestination: "TEST DESTINATION", academicYearIntake: "TEST INTAKE", paymentCurrency: "USD", agreedExchangeRate: 1.12,
  exchangeRateDate: "26 October 2026", discountType: "percentage", discountValue: 10, pricingMode: "reference",
  repName: "TEST REPRESENTATIVE", repDesignation: "TEST STAFF", repDate: "26 October 2026",
  studentSignatureDate: "26 October 2026", agreementDate: "26 October 2026",
});
const request = input => new Request("https://test.invalid/api/admin/agreements", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
});
const context = id => ({ params: Promise.resolve({ id }) });

const input = fixture();
let response = await POST(request(input));
assert.equal(response.status, 201, JSON.stringify({ response: await response.clone().json(), writes }));
const saved = (await response.json()).agreement;
globalThis.__agreementTestServices.user = staff;
for (const changes of [{ agreedExchangeRate: 2 }, { status: "finalized" }, { agreedExchangeRate: 3, status: "finalized" }, { discountValue: 0 }]) {
  assert.equal((await PUT(request({ ...input, ...changes }), context(saved.id))).status, 403);
}
assert.equal((await POST(request(fixture()))).status, 403);
assert.equal((await PUT(request({ ...input, studentFullName: "TEST STUDENT UPDATED" }), context(saved.id))).status, 200);
assert.equal((await getAgreementById(saved.id)).financials.pricingApprovedBy, undefined);
globalThis.__agreementTestServices.user = admin;
assert.equal((await PUT(request({ ...input, status: "finalized" }), context(saved.id))).status, 200);
const final = await getAgreementById(saved.id);
assert.equal(final.financials.pricingApprovedBy, admin.email);
assert(final.financials.pricingApprovedAt);
assert.equal((await PUT(request(input), context(saved.id))).status, 409);
assert.equal((await DELETE(request(input), context(saved.id))).status, 409);
console.log("PASS 1: exchange-rate changes, discount removal and finalization require pricing authority; approved snapshot retained");

for (const legacy of [false, true]) {
  missingPrimary = legacy;
  const draftInput = fixture();
  const draft = await saveAgreement(draftInput, admin.email);
  const results = await Promise.allSettled([
    saveAgreement({ ...draftInput, id: draft.id, status: "finalized" }, admin.email, draft.updatedAt),
    saveAgreement({ ...draftInput, id: draft.id, agreedExchangeRate: 4 }, admin.email, draft.updatedAt),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.status, 409);
  if (results[0].status === "rejected") {
    const current = await getAgreementById(draft.id);
    await saveAgreement({ ...draftInput, id: draft.id, status: "finalized" }, admin.email, current.updatedAt);
  }
  assert.equal((await getAgreementById(draft.id)).status, "finalized");
  await assert.rejects(deleteAgreement(draft.id), error => error.status === 409);
  const deletionInput = fixture();
  const deletionDraft = await saveAgreement(deletionInput, admin.email);
  const deletionRace = await Promise.allSettled([
    saveAgreement({ ...deletionInput, id: deletionDraft.id, status: "finalized" }, admin.email, deletionDraft.updatedAt),
    deleteAgreement(deletionDraft.id),
  ]);
  assert.equal(deletionRace.filter(r => r.status === "fulfilled").length, 1);
  if (deletionRace[0].status === "fulfilled") {
    assert.equal((await getAgreementById(deletionDraft.id)).status, "finalized");
  } else {
    assert.equal(deletionRace[0].reason.status, 409);
    assert.equal(await getAgreementById(deletionDraft.id), null);
  }
}
missingPrimary = false;
assert(writes.some(w => w.method === "PATCH" && w.table === "agreements" && w.filters.status === "eq.draft" && w.filters.updated_at));
assert(writes.some(w => w.method === "PATCH" && w.table === "site_content" && w.filters.value));
console.log("PASS 2: concurrent finalization/update/delete conflicts are rejected on both primary and legacy storage");

for (const failure of ["unconfigured", "offline", "write"]) {
  globalThis.__agreementTestServices.client = failure === "unconfigured" ? null : client;
  offline = failure === "offline"; writesFail = failure === "write";
  assert.equal((await POST(request(fixture()))).status, 503);
  await assert.rejects(saveAgreement(fixture(), admin.email), error => error.status === 503);
}
offline = writesFail = false; globalThis.__agreementTestServices.client = client;
console.log("PASS 3: unconfigured, unreachable and failing Supabase writes never return save success");

const reloaded = await getAgreementById(saved.id);
assert.equal(reloaded.referenceNumber, input.referenceNumber);
assert.equal(tables.agreements.get(saved.id).reference_number, input.referenceNumber);
assert.equal(tables.agreements.get(saved.id).payload.referenceNumber, input.referenceNumber);
assert.deepEqual(reloaded.financials, final.financials);
const word = await JSZip.loadAsync(await generateAgreementDocx(reloaded));
assert((await word.file("word/document.xml").async("text")).includes(input.referenceNumber));
assert(renderToStaticMarkup(createElement(PrintAgreementClient, { agreement: reloaded })).includes(input.referenceNumber));
// pdf-lib emits the reference as a hexadecimal text operand in the content stream.
const { PDFDocument, PDFRawStream, decodePDFRawStream } = await import("pdf-lib");
const pdf = await PDFDocument.load(await generateAgreementPdf(reloaded));
let operands = "";
for (const [, object] of pdf.context.enumerateIndirectObjects()) {
  if (object instanceof PDFRawStream) {
    const stream = Buffer.from(decodePDFRawStream(object).decode()).toString("latin1");
    operands += stream.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => Buffer.from(hex, "hex").toString("latin1"));
  }
}
assert(operands.includes(`Reference: ${input.referenceNumber}`));
assert((await getAgreementsList()).some(r => r.id === reloaded.id));
assert.equal((await POST(request(input))).status, 409);
console.log("PASS 4: submitted, database, API, reloaded, Word, PDF and print references match; duplicates rejected");
console.log("All four targeted regressions passed (local transport/auth mocks; no production data).");
