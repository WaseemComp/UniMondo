import fs from "fs";
import path from "path";
import JSZip from "jszip";
import type { AgreementRecord } from "../../types/agreement";

/**
 * Generates an authentic .docx Word document by filling a controlled copy
 * of templates/UniMondo_Retainer_Agreement.docx.
 * 
 * Preserves original Word XML styles, tables, headings, and Times New Roman typography.
 * Sets all four page margins to exactly 0.7 inches (1008 dxa).
 * Corrects the third-instalment unmatched parenthesis.
 * Preserves blank handwritten signature lines and stamp area.
 */
export async function generateAgreementDocx(record: AgreementRecord): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "templates", "UniMondo_Retainer_Agreement.docx");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`DOCX template not found at ${templatePath}`);
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }

  let xml = await docXmlFile.async("text");

  // 1. Set all four margins to exactly 0.7 inches (0.7 * 1440 = 1008 dxa)
  const exactPgMar = '<w:pgMar w:top="1008" w:right="1008" w:bottom="1008" w:left="1008" w:header="720" w:footer="720" w:gutter="0"/>';
  xml = xml.replace(/<w:pgMar[^>]+>/, exactPgMar);

  // 2. Correct the third-instalment unmatched parenthesis defect
  xml = xml.replace(
    "(payable upon the Student’s receipt of an embassy/consulate visa appointment date",
    "(payable upon the Student’s receipt of an embassy/consulate visa appointment date)"
  );

  // 3. Table 1: Agreement Reference and Date
  const refText = record.referenceNumber.startsWith("UM/") 
    ? record.referenceNumber.substring(3) 
    : record.referenceNumber;
  xml = xml.replace("UM/__________________", `UM/${refText}`);
  xml = xml.replace("Date: _________________", `Date: ${record.agreementDate || "_________________"}`);

  // 4. Consultant registered entity details in Section 1
  const consultantDetails = `${record.consultantEntityName}${record.consultantRegNumber ? `, Reg. No. ${record.consultantRegNumber}` : ""}${record.consultantAddress ? `, ${record.consultantAddress}` : ""}`;
  xml = xml.replace("[registered legal entity, registration number and address]", consultantDetails);

  // 5. Student details in Section 1 (Party identification)
  xml = xml.replace("[full legal name]", record.studentFullName || "__________________");
  xml = xml.replace("[parent/guardian]", record.studentParentGuardian || "__________________");
  xml = xml.replace("holding CNIC/Passport No. [number]", `holding CNIC/Passport No. ${record.studentCnicPassport || "__________________"}`);
  xml = xml.replace("residing at [address]", `residing at ${record.studentAddress || "__________________"}`);
  xml = xml.replace("email [email]", `email ${record.studentEmail || "__________________"}`);
  xml = xml.replace("contact [number]", `contact ${record.studentPhone || "__________________"}`);

  // 6. Educational engagement details in Section 1
  xml = xml.replace("[degree level]", record.degreeLevel || "__________________");
  xml = xml.replace("[field of study]", record.fieldOfStudy || "__________________");
  xml = xml.replace("[preferred destination]", record.preferredDestination || "__________________");
  xml = xml.replace("[academic year/intake]", record.academicYearIntake || "__________________");

  // 7. Exchange rate line in Section 3
  const isPkr = record.financials.paymentCurrency === "PKR";
  if (isPkr && record.financials.agreedExchangeRate) {
    const rateFormatted = record.financials.agreedExchangeRate.toLocaleString();
    const rateDateFormatted = record.financials.exchangeRateDate || record.agreementDate || "____ / ____ / ______";
    xml = xml.replace(
      "Agreed exchange rate: 1 EUR = PKR __________, as mutually agreed on ____ / ____ / ______. Applicable only where payment is in PKR.",
      `Agreed exchange rate: 1 EUR = PKR ${rateFormatted}, as mutually agreed on ${rateDateFormatted}. Applicable only where payment is in PKR.`
    );
  } else {
    xml = xml.replace(
      "Agreed exchange rate: 1 EUR = PKR __________, as mutually agreed on ____ / ____ / ______. Applicable only where payment is in PKR.",
      "Agreed exchange rate: 1 EUR = PKR N/A, as mutually agreed on N/A. Applicable only where payment is in PKR."
    );
  }

  // 8. Populate Table 2 (Fee & Discount Breakdown)
  // Each target cell in Table 2 has a distinct paragraph ID:
  function populateTableCell(targetXml: string, paraId: string, text: string): string {
    const regex = new RegExp(`(<w:p[^>]*w14:paraId="${paraId}"[^>]*>.*?<\\/w:pPr>)(<\\/w:p>)`);
    return targetXml.replace(regex, `$1<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${text}</w:t></w:r>$2`);
  }

  const fin = record.financials;
  const pkrFee = isPkr && fin.agreedExchangeRate ? `${(fin.baseFeeEUR * fin.agreedExchangeRate).toLocaleString()}/-` : "—";
  const discountPct = `${fin.discountPercent}%`;
  const discountEur = `${fin.discountEUR.toLocaleString()}/-`;
  const discountPkr = isPkr && fin.discountPKR != null ? `${fin.discountPKR.toLocaleString()}/-` : "—";
  const netEur = `${fin.netFeeEUR.toLocaleString()}/-`;
  const netPkr = isPkr && fin.netFeePKR != null ? `${fin.netFeePKR.toLocaleString()}/-` : "—";

  xml = populateTableCell(xml, "7837ADEA", pkrFee);       // Row 1 Col 3: Fee PKR
  xml = populateTableCell(xml, "04523E70", discountPct);   // Row 2 Col 1: Discount %
  xml = populateTableCell(xml, "7D29DFBC", discountEur);   // Row 2 Col 2: Discount EUR
  xml = populateTableCell(xml, "4A792AC7", discountPkr);   // Row 2 Col 3: Discount PKR
  xml = populateTableCell(xml, "27CAE1E7", netEur);        // Row 3 Col 2: Net EUR
  xml = populateTableCell(xml, "2D491058", netPkr);        // Row 3 Col 3: Net PKR

  // 9. Table 3: Acceptance & Signatures
  // Preserves signature blank lines: Signature: ____________________________________
  xml = xml.replace("Name: _______________________________________          ", `Name: ${record.repName || "_______________________________________"}          `);
  xml = xml.replace("Name: _______________________________________", `Name: ${record.studentFullName || "_______________________________________"}`);
  xml = xml.replace("Designation: __________________________________", `Designation: ${record.repDesignation || "__________________________________"}`);
  xml = xml.replace("CNIC/Passport: _______________________________", `CNIC/Passport: ${record.studentCnicPassport || "_______________________________"}`);
  xml = xml.replace("Date: ________________________________________         ", `Date: ${record.repDate || record.agreementDate || "________________________________________"}         `);
  xml = xml.replace("Date: _______________________________________", `Date: ${record.studentSignatureDate || record.agreementDate || "_______________________________________"}`);

  zip.file("word/document.xml", xml);
  const generatedBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return generatedBuffer;
}
