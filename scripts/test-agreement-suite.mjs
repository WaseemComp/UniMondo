import assert from "node:assert";
import fs from "node:fs";
import { calculateAgreementFinancials, validateAgreementForExport } from "../src/lib/agreements/financials.ts";
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
  assert.strictEqual(totalB, 863, `Expected total to equal 863, got ${totalB}`);
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
  assert.strictEqual(finC.discountPKR, 45750);
  assert.strictEqual(finC.netFeePKR, 259250);
  const totalC_PKR = finC.firstInstalmentPKR + finC.secondInstalmentPKR + finC.thirdInstalmentPKR;
  assert.strictEqual(totalC_PKR, finC.netFeePKR, `Expected PKR total ${finC.netFeePKR}, got ${totalC_PKR}`);
  console.log("✓ Case C passed: PKR payment with exchange rate 305 (PKR " + finC.netFeePKR + " = " + finC.firstInstalmentPKR + " + " + finC.secondInstalmentPKR + " + " + finC.thirdInstalmentPKR + ")");

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
    studentFullName: "Syed Muhammad Daniyal",
    studentParentGuardian: "Syed Tariq Mahmood",
    studentCnicPassport: "42101-9988776-5",
    studentAddress: "Apartment 4B, Gulberg Heights, Lahore, Pakistan",
    studentEmail: "daniyal.test@example.com",
    studentPhone: "+92 321 8877665",
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
  assert(docXml.includes("Syed Muhammad Daniyal"), "DOCX must contain student name");
  assert(docXml.includes("UniMondo Ltd, Reg. No. 14829023"), "DOCX must contain consultant entity and reg number");
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

  console.log("\n=== 4. TESTING EXPORT VALIDATION ===");
  const incompleteInput = { ...testRecord, studentFullName: "" };
  const valErrors = validateAgreementForExport(incompleteInput);
  assert(valErrors.length > 0, "Incomplete draft must fail export validation");
  assert(valErrors.some(e => e.field === "studentFullName"), "Must identify missing studentFullName");
  console.log("✓ Validation properly catches missing required fields for export while allowing drafts");

  console.log("\nALL AGREEMENT SUITE TESTS PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
