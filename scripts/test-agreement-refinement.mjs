import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/admin/agreements/route.ts";
import {
  PUT,
  PATCH,
  DELETE,
} from "../src/app/api/admin/agreements/[id]/route.ts";
import {
  getAgreementById,
  getAgreementRevision,
} from "../src/lib/agreements/persistence.ts";
import {
  calculateAgreementFinancials,
  formatForeignAmount,
} from "../src/lib/agreements/financials.ts";
import {
  buildAgreementDocument,
  agreementDocument,
} from "../src/lib/agreements/document-content.ts";
import {
  validateClauseEdits,
  STANDARD_CLAUSES,
} from "../src/lib/agreements/clauses.ts";
import { formatAgreementDate } from "../src/lib/agreements/dates.ts";
import { generateAgreementDocx } from "../src/lib/agreements/docx-generator.ts";
import { generateAgreementPdf } from "../src/lib/agreements/pdf-generator.ts";
const input = {
  referenceNumber: "UM/QA/APPENDIX",
  templateVersion: "4.0",
  consultantEntityName: "UniMondo Ltd",
  consultantRegNumber: "QA-REG",
  consultantAddress: "QA office address",
  studentFullName: "QA Student",
  studentParentGuardian: "",
  studentCnicPassport: "QA-PASSPORT",
  studentIdType: "Passport",
  studentAddress: "QA address",
  studentEmail: "hidden@example.invalid",
  studentPhone: "HIDDEN-PHONE",
  degreeLevel: "Master's Degree",
  fieldOfStudy: "QA discipline",
  preferredDestination: "Italy",
  academicYearIntake: "Fall 2027",
  paymentCurrency: "EUR",
  agreedExchangeRate: null,
  exchangeRateDate: null,
  discountType: "percentage",
  discountValue: 10,
  repName: "QA Representative",
  repDesignation: "Admissions Manager",
  repDate: "2026-10-28",
  studentSignatureDate: "2026-10-28",
  agreementDate: "2026-10-28",
};
const record = (change = {}) => ({
  ...input,
  id: "qa",
  status: "draft",
  createdAt: "",
  updatedAt: "",
  ...change,
  financials: calculateAgreementFinancials({ ...input, ...change }),
});
assert.equal(formatAgreementDate("2026-10-28"), "28-Oct-2026");
assert.equal(formatAgreementDate(""), "");
const source = fs.readFileSync(
  "src/lib/agreements/appendix-contract.json",
  "utf8",
);
const v4 = buildAgreementDocument(record());
assert.equal(v4.sections.length, 8);
assert.equal(v4.sections[4].paragraphs.length, 3);
assert.equal(v4.sections[5].paragraphs.length, 6);
assert(
  JSON.stringify(v4).includes("subject to payment of university expenses"),
);
assert(!JSON.stringify(v4).includes("hidden@example.invalid"));
assert(!JSON.stringify(v4).includes("HIDDEN-PHONE"));
assert(!JSON.stringify(v4).includes("[" + "Passport"));
assert(!JSON.stringify(v4).includes("«"));
for (const section of STANDARD_CLAUSES)
  for (const p of section.paragraphs) {
    if (!p.text.includes("«"))
      assert(
        JSON.stringify(v4).includes(p.text.replaceAll('"', '\\"')),
        `Exact Appendix text: ${p.id}`,
      );
  }
assert.throws(() =>
  validateClauseEdits({
    paragraphs: { "1-3": { text: "Missing the student field" } },
  }),
);
assert.throws(() =>
  validateClauseEdits({
    paragraphs: { "6-2": { text: "<script>unsafe</script>" } },
  }),
);
assert.throws(() =>
  validateClauseEdits({ paragraphs: { "4-a": { text: "Pay 90% upfront" } } }),
);
assert.throws(() => validateClauseEdits({ headings: { 9: "Extra" } }));
assert.throws(() =>
  validateClauseEdits({ paragraphs: { "2-1": { text: " " } } }),
);
assert.deepEqual(validateClauseEdits({}), {});
for (const currency of ["EUR", "PKR", "LYD", "TND", "TRY", "USD", "BDT"])
  for (const discountType of ["amount", "percentage"]) {
    const r = record({
      paymentCurrency: currency,
      agreedExchangeRate: currency === "EUR" ? null : 1.234567,
      exchangeRateDate: currency === "EUR" ? null : "2026-10-28",
      discountType,
      discountValue: 10,
    });
    const d = buildAgreementDocument(r),
      f = r.financials;
    assert.equal(
      Math.round(
        (f.firstInstalmentEUR + f.secondInstalmentEUR + f.thirdInstalmentEUR) *
          100,
      ),
      Math.round(f.netFeeEUR * 100),
    );
    assert.equal(d.sections[2].financialTable.headers[2], currency);
    assert.equal(
      d.sections[2].financialTable.rows[2][2],
      formatForeignAmount(
        currency === "EUR" ? f.netFeeEUR : f.netFeeForeign,
        currency,
      ),
    );
    const zip = await JSZip.loadAsync(await generateAgreementDocx(r));
    const xml = await zip.file("word/document.xml").async("text");
    assert(xml.includes('w:w="11906"') && xml.includes('w:top="1008"'));
    assert(xml.includes("Official Stamp of UniMondo"));
    assert(!xml.includes("Signature: ____"));
    assert(!xml.includes("hidden@example.invalid"));
    assert(xml.includes("28-Oct-2026"));
    assert(xml.includes("<w:tbl>"));
    assert(xml.includes("w:widowControl"));
    assert(!xml.includes("<w:keepLines/>"));
    assert(
      (await zip.file("word/footer1.xml").async("text")).includes("NUMPAGES"),
    );
    const pdf = await generateAgreementPdf(r);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  }
const out = path.resolve("output/agreement-refinement");
fs.mkdirSync(out, { recursive: true });
for (const [name, r] of [
  ["appendix-a-eur", record()],
  [
    "appendix-a-tnd-long",
    record({
      paymentCurrency: "TND",
      agreedExchangeRate: 3.34127,
      exchangeRateDate: "2026-10-28",
      discountType: "amount",
      discountValue: 137.125,
      studentFullName:
        "QA Student With A Deliberately Long Multi Part Family Name",
      repName: "QA Representative With A Long Professional Name",
      repDesignation:
        "Senior Manager, International Admissions and Student Affairs",
      studentParentGuardian: "QA Parent Name",
      studentRelationship: "daughter of",
      studentAddress:
        "A deliberately long isolated QA address for wrapping verification only",
    }),
  ],
]) {
  fs.writeFileSync(
    path.join(out, `${name}.docx`),
    await generateAgreementDocx(r),
  );
  fs.writeFileSync(
    path.join(out, `${name}.pdf`),
    await generateAgreementPdf(r),
  );
}
console.log(
  "PASS: exact Appendix wording, eight sections, required fields, seven currencies, fee tables, dates and DOCX/PDF generation. Isolated samples: " +
    out,
);
// Real SQL migration and atomic mutation function, in an ephemeral in-memory PostgreSQL engine.
const db = new PGlite();
await db.exec(
  fs.readFileSync("supabase/tests/agreement-bootstrap.sql", "utf8"),
);
await db.exec(
  fs.readFileSync("supabase/migrations/20260426120000_agreements.sql", "utf8"),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261026120000_agreement_revisions.sql",
    "utf8",
  ),
);
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
const client = createClient("https://isolated.invalid", "isolated-key", {
  auth: { persistSession: false },
  global: {
    fetch: async (url, opts = {}) => {
      const u = new URL(url),
        table = u.pathname.split("/").at(-1);
      try {
        if (table === "agreement_mutate") {
          const p = JSON.parse(opts.body);
          const { rows } = await db.query(
            "select public.agreement_mutate($1,$2,$3,$4,$5,$6,$7) as result",
            [
              p.p_id,
              p.p_action,
              p.p_expected,
              p.p_actor,
              p.p_super,
              p.p_record,
              p.p_row,
            ],
          );
          return response(rows[0].result);
        }
        assert.equal(opts.method ?? "GET", "GET");
        assert(["agreement_state", "agreement_revisions"].includes(table));
        const values = [],
          where = [];
        for (const [key, value] of u.searchParams) {
          if (["select", "order"].includes(key)) continue;
          assert(/^[a-z_]+$/.test(key));
          if (value === "is.null") where.push(`${key} is null`);
          else {
            assert(value.startsWith("eq."));
            values.push(value.slice(3));
            where.push(`${key}=$${values.length}`);
          }
        }
        const { rows } = await db.query(
          `select * from ${table}${where.length ? " where " + where.join(" and ") : ""}`,
          values,
        );
        return response(rows);
      } catch (e) {
        return response({ code: e.code ?? "XX000", message: e.message }, 400);
      }
    },
  },
});
const staff = {
    id: "qa-staff",
    email: "qa-staff@example.invalid",
    admin: true,
  },
  superuser = {
    id: "qa-super",
    email: "qa-super@example.invalid",
    admin: true,
    super: true,
    discount: true,
  };
globalThis.__agreementTestServices = { client, user: superuser };
const req = (body) =>
  new NextRequest("https://isolated.invalid/api/admin/agreements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const ctx = (id) => ({ params: Promise.resolve({ id }) });
const expect = async (p, status) => {
  const r = await p;
  assert.equal(r.status, status, await r.clone().text());
  return r.json();
};
let { agreement: a } = await expect(POST(req(input)), 201);
assert.equal(a.templateVersion, "4.0");
const edits = {
  paragraphs: {
    "5-1": {
      text:
        STANDARD_CLAUSES[4].paragraphs[0].text +
        " QA approved supplementary wording.",
      label: "No admission:",
    },
  },
};
globalThis.__agreementTestServices.user = staff;
await expect(
  PUT(
    req({
      ...input,
      version: a.version,
      clauseEdits: edits,
      clausesConfirmed: true,
    }),
    ctx(a.id),
  ),
  403,
);
globalThis.__agreementTestServices.user = { ...staff, discount: true };
await expect(
  PUT(
    req({
      ...input,
      version: a.version,
      clauseEdits: edits,
      clausesConfirmed: true,
    }),
    ctx(a.id),
  ),
  403,
);
globalThis.__agreementTestServices.user = superuser;
await expect(
  PUT(req({ ...input, version: a.version, clauseEdits: edits }), ctx(a.id)),
  400,
);
({ agreement: a } = await expect(
  PUT(
    req({
      ...input,
      version: a.version,
      clauseEdits: edits,
      clausesConfirmed: true,
    }),
    ctx(a.id),
  ),
  200,
));
assert.equal(a.clauseApproval.by, superuser.email);
({ agreement: a } = await expect(
  PATCH(req({ status: "finalized", version: a.version }), ctx(a.id)),
  200,
));
const frozen = await getAgreementRevision(a.id, 1);
assert.deepEqual(agreementDocument(frozen), frozen.documentSnapshot);
globalThis.__agreementTestServices.user = staff;
let { agreement: draft } = await expect(
  PUT(
    req({
      ...input,
      version: a.version,
      repDesignation: "QA revision designation",
    }),
    ctx(a.id),
  ),
  200,
);
assert.deepEqual(draft.clauseEdits, edits);
assert.deepEqual(draft.financials, a.financials);
assert.deepEqual(await getAgreementRevision(a.id, 1), frozen);
assert.equal((await getAgreementById(a.id)).status, "finalized");
await expect(PUT(req({ ...input, version: a.version }), ctx(a.id)), 409);
await expect(
  PUT(
    req({ ...input, version: draft.version, templateVersion: "3.0" }),
    ctx(a.id),
  ),
  400,
);
await expect(
  PUT(
    req({
      ...input,
      version: draft.version,
      clauseEdits: { paragraphs: { "2-1": { text: "" } } },
    }),
    ctx(a.id),
  ),
  400,
);
await expect(DELETE(req({ version: draft.version }), ctx(a.id)), 403);
await expect(
  PATCH(req({ version: draft.version, status: "finalized" }), ctx(a.id)),
  403,
);
for (const role of ["anon", "authenticated"]) {
  try {
    await db.exec(
      `set role ${role}; select public.agreement_mutate('fake','delete',1,'forged',true);`,
    );
    assert.fail("must deny");
  } catch (e) {
    assert.equal(e.code, "42501");
  } finally {
    await db.exec("reset role;");
  }
}
globalThis.__agreementTestServices.user = superuser;
await expect(DELETE(req({ version: draft.version }), ctx(a.id)), 200);
assert.equal(await getAgreementById(a.id), null);
assert.equal(
  (await db.query("select count(*)::int as n from agreement_revisions")).rows[0]
    .n,
  1,
);
globalThis.__agreementTestServices.user = null;
await expect(POST(req(input)), 401);
await db.close();
console.log(
  "PASS: isolated SQL/API create, protected-clause authority and confirmation, atomic history, frozen finances, omitted-edit retention, stale writes, downgrade denial, anonymous denial and soft deletion. No production access.",
);
