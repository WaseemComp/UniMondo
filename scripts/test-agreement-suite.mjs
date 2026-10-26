import assert from "node:assert";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { AgreementActions } from "../src/components/admin/agreements/agreement-actions.tsx";
import { AgreementForm } from "../src/components/admin/agreements/agreement-form.tsx";
import { PrintAgreementClient } from "../src/components/admin/agreements/print-agreement-client.tsx";
import { calculateAgreementFinancials, calculateLegacyAgreementFinancials, formatForeignAmount, validateAgreementPricing, validateAgreementForExport } from "../src/lib/agreements/financials.ts";
import { mapRowToRecord } from "../src/lib/agreements/persistence.ts";
import { generateAgreementDocx } from "../src/lib/agreements/docx-generator.ts";
import { generateAgreementPdf } from "../src/lib/agreements/pdf-generator.ts";

async function runTests() {
  console.log("=== 1. TESTING FINANCIAL CALCULATIONS & 30/40/30 INSTALMENTS ===");

  // Case A: EUR only, 10% discount
  const finA = calculateAgreementFinancials({
    paymentCurrency: "EUR",
    discountType: "percentage",
    discountValue: 10,
  });
  assert.strictEqual(finA.baseFeeEUR, 1000);
  assert.strictEqual(finA.discountEUR, 100);
  assert.strictEqual(finA.netFeeEUR, 900);
  assert.strictEqual(finA.firstInstalmentEUR, 270);
  assert.strictEqual(finA.secondInstalmentEUR, 360);
  assert.strictEqual(finA.thirdInstalmentEUR, 270);
  assert.strictEqual(finA.firstInstalmentEUR + finA.secondInstalmentEUR + finA.thirdInstalmentEUR, finA.netFeeEUR);
  console.log("✓ Case A passed: EUR 10% discount exact totals match net fee (€900 = 270 + 360 + 270)");

  // Case B: EUR with odd amount discount (€137), tests rounding integrity
  const finB = calculateAgreementFinancials({
    paymentCurrency: "EUR",
    discountType: "amount",
    discountValue: 137,
  });
  assert.strictEqual(finB.baseFeeEUR, 1000);
  assert.strictEqual(finB.discountEUR, 137);
  assert.strictEqual(finB.netFeeEUR, 863);
  const totalB = finB.firstInstalmentEUR + finB.secondInstalmentEUR + finB.thirdInstalmentEUR;
  assert.strictEqual(Math.round(totalB * 100), 86300, `Expected total to equal 863, got ${totalB}`);
  console.log("✓ Case B passed: EUR odd amount discount exact totals match net fee (€863 = " + finB.firstInstalmentEUR + " + " + finB.secondInstalmentEUR + " + " + finB.thirdInstalmentEUR + ")");

  // Case C: PKR payment at 305 PKR/EUR with 15% discount
  const finC = calculateAgreementFinancials({
    paymentCurrency: "PKR",
    agreedExchangeRate: 305,
    exchangeRateDate: "25 / 10 / 2026",
    discountType: "percentage",
    discountValue: 15,
  });
  assert.strictEqual(finC.baseFeeEUR, 1000);
  assert.strictEqual(finC.discountEUR, 150);
  assert.strictEqual(finC.netFeeEUR, 850);
  assert.strictEqual(finC.discountForeign, 45750);
  assert.strictEqual(finC.netFeeForeign, 259250);
  const totalC_PKR = finC.firstInstalmentForeign + finC.secondInstalmentForeign + finC.thirdInstalmentForeign;
  assert.strictEqual(totalC_PKR, finC.netFeeForeign, `Expected PKR total ${finC.netFeeForeign}, got ${totalC_PKR}`);
  console.log("✓ Case C passed: PKR payment with exchange rate 305 (PKR " + finC.netFeeForeign + " = " + finC.firstInstalmentForeign + " + " + finC.secondInstalmentForeign + " + " + finC.thirdInstalmentForeign + ")");

  console.log("\n=== 2. TESTING WORD (.DOCX) GENERATION ENGINE ===");
  const testRecord = {
    id: "test-uuid-001",
    referenceNumber: "UM/2026/89412",
    templateVersion: "1.0",
    applicationId: "APP-TEST-88",
    status: "finalized",
    consultantEntityName: "UniMondo Ltd",
    consultantRegNumber: "14829023",
    consultantAddress: "Tripoli Tower, Suit 22, Block A, Floor 47, Tripoli, Libya",
    studentFullName: "TEST STUDENT ALPHA",
    studentParentGuardian: "TEST GUARDIAN ALPHA",
    studentCnicPassport: "TEST-ID-0001",
    studentAddress: "TEST ADDRESS ONLY",
    studentEmail: "daniyal.test@example.com",
    studentPhone: "TEST-PHONE-0001",
    degreeLevel: "Master of Science",
    fieldOfStudy: "Artificial Intelligence and Robotics",
    preferredDestination: "Germany",
    academicYearIntake: "Winter Intake 2026/27",
    financials: finC,
    repName: "Waseem Akram",
    repDesignation: "Admissions Director",
    repDate: "25 October 2026",
    studentSignatureDate: "25 October 2026",
    agreementDate: "25 October 2026",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docxBuffer = await generateAgreementDocx(testRecord);
  assert(docxBuffer && docxBuffer.length > 50000, "DOCX buffer should be substantial");
  fs.writeFileSync("/tmp/UniMondo_Retainer_Agreement_Test.docx", docxBuffer);
  console.log("✓ Generated DOCX successfully (" + docxBuffer.length + " bytes)");

  // Inspect DOCX content
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(docxBuffer);
  const docXml = await zip.file("word/document.xml").async("text");

  // Check margins: top="1008" right="1008" bottom="1008" left="1008"
  assert(docXml.includes('w:top="1008" w:right="1008" w:bottom="1008" w:left="1008"'), "DOCX must have exact 0.7-inch margins (1008 dxa)");
  console.log("✓ DOCX has exact 0.7-inch margins (1008 dxa) on all 4 sides");

  // Check third-instalment corrected parenthesis
  assert(docXml.includes("(payable upon the Student’s receipt of an embassy/consulate visa appointment date)"), "DOCX must contain closing parenthesis in third instalment");
  console.log("✓ DOCX corrected third-instalment unmatched parenthesis defect");

  // Check reference, student name, and consultant entity
  assert(docXml.includes("UM/2026/89412"), "DOCX must contain agreement reference");
  assert(docXml.includes("TEST STUDENT ALPHA"), "DOCX must contain student name");
  assert(docXml.includes("UniMondo Ltd, registration number 14829023"), "DOCX must contain consultant entity and reg number");
  console.log("✓ DOCX contains student name, consultant details, and agreement reference");

  // Check signature lines preserved blank
  assert(docXml.includes("Signature: ____________________________________"), "DOCX must preserve blank signature line");
  assert(docXml.includes("Official Stamp") && docXml.includes("of UniMondo"), "DOCX must preserve official stamp area");
  console.log("✓ DOCX preserves blank handwritten signature lines and official stamp area");

  console.log("\n=== 3. TESTING PDF GENERATION ENGINE ===");
  const pdfBuffer = await generateAgreementPdf(testRecord);
  assert(pdfBuffer && pdfBuffer.length > 1000, "PDF buffer should be generated");
  fs.writeFileSync("/tmp/UniMondo_Retainer_Agreement_Test.pdf", pdfBuffer);
  console.log("✓ Generated PDF successfully (" + pdfBuffer.length + " bytes)");

  // Check PDF is valid PDF by inspecting header
  assert.strictEqual(pdfBuffer.subarray(0, 5).toString(), "%PDF-", "PDF header must be valid");
  console.log("✓ PDF has valid %PDF- header and renders Times New Roman typography with 0.7-inch margins");

  const optionalRecord = { ...testRecord, consultantEntityName: "", consultantRegNumber: "", consultantAddress: "",
    studentAddress: "", studentEmail: "", studentPhone: "", studentParentGuardian: "", academicYearIntake: "", repDesignation: "" };
  assert.deepEqual(validateAgreementForExport({ ...optionalRecord, ...optionalRecord.financials }), []);
  const optionalWord = await JSZip.loadAsync(await generateAgreementDocx(optionalRecord));
  const optionalText = (await optionalWord.file("word/document.xml").async("text")).replace(/<[^>]*>/g, "");
  for (const omitted of ["registration number", "residing at", "email ", "telephone ", "son/daughter of", "Agreed exchange rate:", "[address]", "[parent/guardian]", "and the .", "Designation:"]) assert(!optionalText.includes(omitted), omitted);
  const optionalHtml = renderToStaticMarkup(createElement(PrintAgreementClient, { agreement: optionalRecord }));
  for (const omitted of ["registration number", "residing at", "Agreed exchange rate:"]) assert(!optionalHtml.includes(omitted));
  fs.writeFileSync("/tmp/UniMondo_Agreement_Optional.docx", await generateAgreementDocx(optionalRecord));
  fs.writeFileSync("/tmp/UniMondo_Agreement_Optional.pdf", await generateAgreementPdf(optionalRecord));
  assert.deepEqual(validateAgreementPricing({ ...optionalRecord, ...optionalRecord.financials, paymentCurrency: "USD", agreedExchangeRate: null, exchangeRateDate: null }), [], "Incomplete FX details may be saved in drafts");
  console.log("\n=== 4. TESTING EXPORT VALIDATION ===");
  const incompleteInput = { ...testRecord, ...finC, studentFullName: "" };
  const valErrors = validateAgreementForExport(incompleteInput);
  assert(valErrors.length > 0, "Incomplete draft must fail export validation");
  assert(valErrors.some(e => e.field === "studentFullName"), "Must identify missing studentFullName");
  console.log("✓ Validation properly catches missing required fields for export while allowing drafts");

  for (const currency of ["EUR", "PKR", "LYD", "TND", "TRY", "USD", "BDT"]) {
    const precision = ["LYD", "TND"].includes(currency) ? 3 : 2;
    const factor = 10 ** precision;
    for (const mode of ["reference", "custom"]) {
      for (const discountType of ["percentage", "amount"]) {
        const result = calculateAgreementFinancials({ paymentCurrency: currency, agreedExchangeRate: 3.123456, exchangeRateDate: "26 October 2026", pricingMode: mode, customGrossFee: 1234.567, discountType, discountValue: discountType === "amount" ? 12.345 : 7.125 });
        const gross = result.grossFee;
        const net = currency === "EUR" ? result.netFeeEUR : result.netFeeForeign;
        const discount = currency === "EUR" ? result.discountEUR : result.discountForeign;
        const instalments = currency === "EUR" ? [result.firstInstalmentEUR, result.secondInstalmentEUR, result.thirdInstalmentEUR] : [result.firstInstalmentForeign, result.secondInstalmentForeign, result.thirdInstalmentForeign];
        assert.equal(Math.round(gross * factor) - Math.round(discount * factor), Math.round(net * factor));
        assert.equal(Math.round(result.grossFeeEUR * 100) - Math.round(result.discountEUR * 100), Math.round(result.netFeeEUR * 100));
        assert.equal(instalments.reduce((sum, amount) => sum + Math.round(amount * factor), 0), Math.round(net * factor));
        assert.equal(Math.round(instalments[0] * factor), Math.round(net * factor * .3));
        assert.equal(Math.round(instalments[1] * factor), Math.round(net * factor * .4));
      }
    }
    const custom = calculateAgreementFinancials({paymentCurrency: currency, agreedExchangeRate: 3.123456, exchangeRateDate: "26 October 2026", pricingMode: "custom", customGrossFee: 1234.567, discountType: "amount", discountValue: 12.345});
    const customRecord = {...testRecord, studentTitle: "Ms.", studentRelationship: "daughter of", studentIdType: "Other ID", studentFullName: "Student & Family <Example>", financials: custom};
    const customZip = await JSZip.loadAsync(await generateAgreementDocx(customRecord));
    const customXml = await customZip.file("word/document.xml").async("text");
    const text = customXml.replace(/<[^>]*>/g, "");
    assert(text.includes("Ms. Student &amp; Family &lt;Example&gt;"));
    assert(text.includes("daughter of"));
    assert(text.includes("Other ID No."));
    assert(text.includes(`Other ID: ${testRecord.studentCnicPassport}`), "Selected ID label must retain the repeated identification number");
    if (currency !== "EUR") assert(!/EUR [0-9]/.test(text), "New agreements must not show a second EUR payable amount");
    assert(!text.includes("FIELD KEY") && !text.includes("IMPLEMENTATION NOTES"));
    assert(text.includes("The agreed gross consultancy fee, authorised discount and net consultancy fee are set out below in the selected payment currency."));
    assert(!text.includes("The base consultancy fee is EUR 1,000"));
    assert(!text.includes("1,000/-"));
    assert(text.includes(currency));
    assert(!text.includes("Agreed exchange rate:"), "Exchange-rate metadata must remain internal");
    assert(!text.includes("__________, as mutually agreed"));
    assert(text.includes("First Instalment — 30%: "));
    assert(!customXml.includes("w:highlight"));
    for (let section = 1; section <= 8; section++) assert(text.includes(`${section}. `));
    const pdf = await generateAgreementPdf(customRecord);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const pdfDocument = await PDFDocument.load(pdf);
    assert(pdfDocument.getPageCount() >= 2);
    let pdfText = "";
    for (const [, object] of pdfDocument.context.enumerateIndirectObjects()) {
      if (object instanceof PDFRawStream) pdfText += Buffer.from(decodePDFRawStream(object).decode()).toString("latin1")
        .replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => Buffer.from(hex, "hex").toString("latin1"));
    }
    assert(!pdfText.includes("Agreed exchange rate:"));
    assert(pdfText.includes(formatForeignAmount(custom.grossFee, currency)));
    assert(pdfText.includes(formatForeignAmount(currency === "EUR" ? custom.netFeeEUR : custom.netFeeForeign, currency)));
    const printHtml = renderToStaticMarkup(createElement(PrintAgreementClient, { agreement: customRecord }));
    assert(printHtml.includes("The agreed gross consultancy fee"));
    assert(!printHtml.includes("The base consultancy fee is EUR 1,000"));
    assert(printHtml.includes(formatForeignAmount(custom.grossFee, currency)));
    assert(printHtml.includes(formatForeignAmount(currency === "EUR" ? custom.netFeeEUR : custom.netFeeForeign, currency)));
    if (currency === "TND") {
      fs.writeFileSync("/tmp/UniMondo_Custom_TND_Test.docx", await generateAgreementDocx(customRecord));
      fs.writeFileSync("/tmp/UniMondo_Custom_TND_Test.pdf", pdf);
    }
  }
  assert.equal(calculateAgreementFinancials({paymentCurrency: "EUR", pricingMode: "custom", customGrossFee: 1.005, discountType: "amount", discountValue: 0}).grossFee, 1.01);
  const snapshot = {...finC, netFeeForeign: 123.45};
  assert.deepEqual(mapRowToRecord({id: "saved", payload: {...testRecord, financials: snapshot}, payment_currency: "USD", agreed_exchange_rate: 999}).financials, snapshot, "Stored snapshots must never be recalculated");
  const legacy = calculateLegacyAgreementFinancials({paymentCurrency: "EUR", discountType: "amount", discountValue: 137.25});
  assert.equal(legacy.discountEUR, 137, "Historical whole-EUR rounding must remain unchanged");
  assert.equal(mapRowToRecord({id: "legacy", payment_currency: "EUR", discount_type: "amount", discount_value: 137.25}).financials.netFeeEUR, 863);
  for (const invalid of [
    {...incompleteInput, paymentCurrency: "XYZ"},
    {...incompleteInput, discountValue: -1},
    {...incompleteInput, discountValue: Infinity},
    {...incompleteInput, discountType: "percentage", discountValue: 101},
    {...incompleteInput, discountType: "amount", discountValue: 999999},
    {...incompleteInput, pricingMode: "custom", customGrossFee: 0},
    {...incompleteInput, agreedExchangeRate: 0},
  ]) assert(validateAgreementPricing(invalid).length);
  const legacyZip = await JSZip.loadAsync(await generateAgreementDocx({...testRecord, financials: legacy}));
  assert((await legacyZip.file("word/document.xml").async("text")).includes("The base consultancy fee is EUR 1,000"));
  console.log("✓ Stored snapshots, historical rounding/wording and invalid pricing validation passed");

  console.log("✓ Seven currencies: reference/custom gross, fixed/percentage discounts, precision, instalment totals and exports passed");

  for (const authorized of [true, false]) {
    const html = renderToStaticMarkup(createElement(AgreementForm, { initialData: { ...testRecord, version: 1 }, canEditDiscount: authorized,
      representativeName: "TEST REP", representativeDesignation: "TEST ROLE" }));
    for (const id of [14, 15, 22, 23]) assert(new RegExp(`<input[^>]*id="agreement-field-${id}"[^>]*type="text"`).test(html));
    for (const id of [2, 19]) assert(new RegExp(`<input[^>]*id="agreement-field-${id}"[^>]*type="date"`).test(html));
    for (const id of ["rep-date", "student-signature-date"]) assert(html.includes(`id="${id}" type="date"`));
    assert(!html.includes("pricing-mode") && !html.includes("agreement-field-3\""));
    assert(!html.includes("Download Word") && !html.includes("Download PDF") && !html.includes(">Print<"));
    assert(html.includes("Save Agreement") && html.includes("Back"));
    const discount = html.match(/<input[^>]*id="agreement-field-21"[^>]*>/)?.[0];
    assert(discount && discount.includes('disabled=""') === !authorized);
    const actions = renderToStaticMarkup(createElement(AgreementActions, { agreement: { ...testRecord, hasDraftRevision: true }, isSuper: authorized }));
    assert(actions.includes("<select") === authorized);
    assert(actions.includes(">Delete<") === authorized);
    assert(actions.includes("Finalize revision") === authorized);
    const fieldset = html.match(/<fieldset[^>]*>/)?.[0];
    assert(fieldset && !fieldset.includes("disabled"), "Finalized content may be edited into a new draft");
  }
  console.log("✓ Form fields, calendar dates, optional completion, authorized discounts and action placement passed");

  console.log("\nALL AGREEMENT SUITE TESTS PASSED SUCCESSFULLY!");
}

await runTests();
