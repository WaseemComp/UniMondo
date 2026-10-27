import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JSZip from "jszip";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import { calculateAgreementFinancials } from "../src/lib/agreements/financials.ts";
import { buildAgreementDocument, agreementDocument } from "../src/lib/agreements/document-content.ts";
import { generateAgreementDocx } from "../src/lib/agreements/docx-generator.ts";
import { generateAgreementPdf } from "../src/lib/agreements/pdf-generator.ts";
import { generateLegacyAgreementDocx } from "../src/lib/agreements/legacy-docx-generator.ts";
import { generateLegacyAgreementPdf } from "../src/lib/agreements/legacy-pdf-generator.ts";
import { PrintAgreementClient } from "../src/components/admin/agreements/print-agreement-client.tsx";

const output = "/tmp/unimondo-standardization/samples";
fs.mkdirSync(output, { recursive: true });
const base = {
  id: "standardization-test", status: "draft", templateVersion: "3.0", referenceNumber: "UM/2026/QA-01", agreementDate: "27 October 2026",
  consultantEntityName: "UniMondo Ltd", consultantRegNumber: "14829023", consultantAddress: "Tripoli Tower, Suite 22, Block A, Floor 47, Tripoli, Libya",
  repName: "Sample Representative", repDesignation: "Admissions Director", repDate: "27 October 2026", studentSignatureDate: "27 October 2026",
  studentTitle: "Mr.", studentFullName: "Sample Student", studentParentGuardian: "Sample Guardian", studentRelationship: "son of",
  studentIdType: "Passport", studentCnicPassport: "SAMPLE-123456", studentAddress: "Sample address, Rome, Italy", studentEmail: "", studentPhone: "",
  degreeLevel: "Master’s", fieldOfStudy: "Social Sciences or Geosciences", preferredDestination: "Italy", academicYearIntake: "Fall 2027",
  createdAt: "2026-10-27T10:00:00Z", updatedAt: "2026-10-27T10:00:00Z",
};
const master = JSON.parse(fs.readFileSync("src/lib/agreements/standard-contract.json", "utf8"));
const source = await JSZip.loadAsync(fs.readFileSync("templates/UniMondo_Agreement_Standard.docx"));
assert.equal(crypto.createHash("sha256").update(fs.readFileSync("templates/UniMondo_Agreement_Standard.docx")).digest("hex"), master.sourceSha256);
const decode = text => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
const sourceParagraphs = [...(await source.file("word/document.xml").async("text")).matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map(([p]) => decode([...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join("")));
for (const section of master.sections) {
  assert(sourceParagraphs.includes(section.heading));
  for (const p of section.paragraphs) if (p.runs) assert(sourceParagraphs.includes(p.runs.map(r => r.text).join("")), "Every static paragraph must exactly match the retained master");
}
for (const currency of ["EUR", "PKR", "LYD", "TND", "TRY", "USD", "BDT"]) {
  for (const discountType of ["percentage", "amount"]) {
    const financials = calculateAgreementFinancials({ paymentCurrency: currency, agreedExchangeRate: 3.123456,
      exchangeRateDate: "2026-10-27", pricingMode: "custom", customGrossFee: 1234.567, discountType, discountValue: discountType === "percentage" ? 10 : 12.345 });
    const record = { ...base, financials };
    const document = buildAgreementDocument(record);
    assert.equal(document.sections.length, 8);
    assert.equal(document.sections[4].paragraphs.length, 3);
    assert.equal(document.sections[5].paragraphs.length, 6);
    const fullText = JSON.stringify(document);
    assert(!fullText.includes("Agreed exchange rate:"));
    assert(!fullText.includes("(("));
    const paragraphs = document.sections.flatMap(s => [s.heading, ...s.paragraphs.map(p => p.runs.map(r => r.text).join(""))]);
    const zip = await JSZip.loadAsync(await generateAgreementDocx(record));
    const xml = await zip.file("word/document.xml").async("text");
    const xmlText = decode(xml.replace(/<[^>]*>/g, ""));
    for (const p of paragraphs) assert(xmlText.includes(p));
    assert(xml.includes('w:w="11906" w:h="16838"'));
    assert(xml.includes('w:top="1008" w:right="1008" w:bottom="1008" w:left="1008"'));
    assert(xml.includes('w:line="276"') && xml.includes('w:after="100"'));
    assert(xml.includes('w:sz w:val="28"') && xml.includes('w:sz w:val="22"'));
    assert(xml.includes('w:jc w:val="both"') && xml.includes("<w:cantSplit/>"));
    assert(xml.includes('<w:contextualSpacing w:val="0"/>'), "Title paragraphs must retain their explicit spacing");
    assert(xml.includes('w:line="20" w:lineRule="exact"'), "Trailing table paragraph must not create a blank page");
    assert(!xml.includes("w:highlight") && !xml.includes("w:shd"));
    const styles = await zip.file("word/styles.xml").async("text");
    assert(!styles.match(/<w:style\b[^>]*w:styleId="Title"[^>]*>[\s\S]*?<\/w:style>/)?.[0].includes("w:pBdr"));
    const footer = await zip.file("word/footer1.xml").async("text");
    assert(footer.includes('w:instr="PAGE"') && footer.includes('w:instr="NUMPAGES"'));
    assert(footer.includes(record.referenceNumber));
    const html = renderToStaticMarkup(createElement(PrintAgreementClient, { agreement: record }));
    assert(html.includes("format=pdf") && html.includes("@page { size: A4"));
    assert(html.includes("counter(pages)"));
    const pdf = await generateAgreementPdf(record);
    const loaded = await PDFDocument.load(pdf);
    assert(loaded.getPageCount() >= 2 && loaded.getPageCount() <= 3);
    for (const page of loaded.getPages()) {
      assert(Math.abs(page.getWidth() - 595.3) < .1);
      assert(Math.abs(page.getHeight() - 841.9) < .1);
    }
    const fontNames = loaded.context.enumerateIndirectObjects().flatMap(([, obj]) => obj instanceof PDFDict && obj.has(PDFName.of("BaseFont")) ? [String(obj.get(PDFName.of("BaseFont")))] : []);
    assert(fontNames.some(name => name.includes("TimesNewRoman")), "PDF must embed actual Times New Roman");
    // Saved contractual text wins over later changes to the record or master.
    const finalized = { ...record, status: "finalized", documentSnapshot: structuredClone(document) };
    assert.deepEqual(agreementDocument({ ...finalized, studentFullName: "Changed later" }), document);
    assert.throws(() => agreementDocument({ ...finalized, documentSnapshot: undefined }), /missing its contractual snapshot/);
    if (discountType === "percentage" && ["EUR", "TND"].includes(currency)) {
      fs.writeFileSync(`${output}/${currency}.docx`, await generateAgreementDocx(record));
      fs.writeFileSync(`${output}/${currency}.pdf`, pdf);
      fs.writeFileSync(`${output}/${currency}.html`, html);
      fs.writeFileSync(`${output}/${currency}.json`, JSON.stringify(document, null, 2));
    }
  }
}
const optional = { ...base, consultantEntityName: "", consultantRegNumber: "", consultantAddress: "", repDesignation: "", studentParentGuardian: "", studentAddress: "", academicYearIntake: "",
  studentFullName: "José Łukasz & Family <Example> $1", financials: calculateAgreementFinancials({ paymentCurrency: "EUR", discountType: "amount", discountValue: 0 }) };
const optionalText = buildAgreementDocument(optional).sections.flatMap(s => s.paragraphs.map(p => p.runs.map(r => r.text).join(""))).join("\n");
for (const missing of ["registration number", "residing in", "child of", "son of", "[]", "[", ", ,", "for the  intake"]) assert(!optionalText.includes(missing));
fs.writeFileSync(`${output}/optional.docx`, await generateAgreementDocx(optional));
fs.writeFileSync(`${output}/optional.pdf`, await generateAgreementPdf(optional));
const long = { ...optional, studentFullName: "Sample Student With A Long Family Name ".repeat(3).trim(), repName: "Sample Representative With A Long Family Name ".repeat(3).trim(), consultantAddress: "Long business address with building and floor details ".repeat(4).trim() };
fs.writeFileSync(`${output}/long.docx`, await generateAgreementDocx(long));
fs.writeFileSync(`${output}/long.pdf`, await generateAgreementPdf(long));
const historic = { ...optional, studentFullName: "Historic Student", status: "finalized", templateVersion: "2.0" };
const oldZip = await JSZip.loadAsync(await generateLegacyAgreementDocx(historic));
const dispatchedZip = await JSZip.loadAsync(await generateAgreementDocx(historic));
assert.equal(await oldZip.file("word/document.xml").async("text"), await dispatchedZip.file("word/document.xml").async("text"));
const oldPdf = await PDFDocument.load(await generateLegacyAgreementPdf(historic));
const dispatchedPdf = await PDFDocument.load(await generateAgreementPdf(historic));
assert.equal(dispatchedPdf.getPageCount(), oldPdf.getPageCount());
assert.equal(dispatchedPdf.getPage(0).getWidth(), 612);
console.log("PASS: reference wording, 14 currency/discount cases, A4/typography/footers/signatures, optional/long/Unicode fields, saved text and legacy dispatch");
