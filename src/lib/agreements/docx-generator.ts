import fs from "fs";
import path from "path";
import JSZip from "jszip";
import type { AgreementRecord } from "../../types/agreement";
import { CURRENCY_DECIMALS } from "../../types/agreement";
import { formatForeignAmount } from "./financials";

/**
 * Generates an authentic .docx Word document by filling a controlled copy of
 * templates/UniMondo_Retainer_Agreement.docx.
 *
 * Changes applied:
 * - Page margins set to exactly 0.7 inches (1008 dxa) on all sides.
 * - Reference / Date table borders removed (no visible box).
 * - Parties clause updated to numbered format with new wording.
 * - Third-instalment unmatched parenthesis corrected.
 * - Stamp box replaced with blank space + line placeholder + small label.
 * - Full multi-currency exchange-rate line.
 * - Preserves blank signature lines.
 */
export async function generateAgreementDocx(record: AgreementRecord): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "templates", "UniMondo_Retainer_Agreement.docx");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`DOCX template not found at ${templatePath}`);
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) throw new Error("Invalid DOCX: missing word/document.xml");

  let xml = await docXmlFile.async("text");
  // Escape user data before interpolating it into Word XML.
  const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/\$/g, "&#36;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  record = Object.fromEntries(Object.entries(record).map(([key, value]) => [key, typeof value === "string" ? escapeXml(value) : value])) as AgreementRecord;


  record.financials = { ...record.financials, exchangeRateDate: record.financials.exchangeRateDate ? escapeXml(record.financials.exchangeRateDate) : null };

  // 1. Set all four margins to exactly 0.7 inches (1008 dxa)
  xml = xml.replace(
    /<w:pgMar[^>]+>/,
    '<w:pgMar w:top="1008" w:right="1008" w:bottom="1008" w:left="1008" w:header="720" w:footer="720" w:gutter="0"/>'
  );

  // 2. Remove borders from the first table (Reference / Date header box)
  //    Find the first <w:tblBorders> block and replace with all-none borders.
  const noBorders =
    '<w:tblBorders>' +
    '<w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
    '<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
    '<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
    '<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
    '<w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
    '<w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
    '</w:tblBorders>';
  // Replace only the first occurrence (the reference/date table)
  xml = xml.replace(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/, noBorders);

  // 3. Table 1: Agreement Reference and Date (plain text, no box)
  const refText = record.referenceNumber.startsWith("UM/")
    ? record.referenceNumber.substring(3)
    : record.referenceNumber;
  xml = xml.replace("UM/__________________", `UM/${refText}`);
  xml = xml.replace("Date: _________________", `Date: ${record.agreementDate || "_________________"}`);

  // 4. Parties clause: replace old wording with numbered format
  //    Match the consulting party placeholder
  const consultantDetails =
    `${record.consultantEntityName}, registration number ${record.consultantRegNumber}` +
    (record.consultantAddress ? `, with its address at ${record.consultantAddress}` : "") +
    `, acting through its duly authorised representative, ${record.repName || "__________________"}, ${record.repDesignation || "__________________"}, hereinafter referred to as the \u201cConsultant\u201d; and`;

  // Replace the old single-paragraph consultant placeholder
  xml = xml.replace(
    "UniMondo, acting through its duly authorised representative on behalf of [registered legal entity, registration number and address] (\u201cConsultant\u201d)",
    `UniMondo — (1) ${consultantDetails}`
  );
  // Fallback plain-quotes version
  xml = xml.replace(
    'UniMondo, acting through its duly authorised representative on behalf of [registered legal entity, registration number and address] ("Consultant")',
    `UniMondo \u2014 (1) ${consultantDetails}`
  );

  // 5. Student details in parties clause
  xml = xml.replace("[full legal name]", `(2) ${record.studentFullName || "__________________"}`);
  xml = xml.replace("[parent/guardian]", record.studentParentGuardian || "__________________");
  xml = xml.replace(
    "holding CNIC/Passport No. [number]",
    `holding CNIC/Passport No. ${record.studentCnicPassport || "__________________"}`
  );
  xml = xml.replace(
    "residing at [address]",
    `residing at ${record.studentAddress || "__________________"}`
  );
  xml = xml.replace("email [email]", `email ${record.studentEmail || "__________________"}`);
  xml = xml.replace("contact [number]", `telephone ${record.studentPhone || "__________________"}, hereinafter referred to as the \u201cStudent\u201d`);

  // 6. Educational engagement details
  xml = xml.replace("[degree level]", record.degreeLevel || "__________________");
  xml = xml.replace("[field of study]", record.fieldOfStudy || "__________________");
  xml = xml.replace("[preferred destination]", record.preferredDestination || "__________________");
  xml = xml.replace("[academic year/intake]", record.academicYearIntake || "__________________");

  // 7. Exchange rate line (generalised for all non-EUR currencies)
  const isNonEur = record.financials.paymentCurrency !== "EUR";
  const currency = record.financials.paymentCurrency;
  const dec = CURRENCY_DECIMALS[currency];
  const rateFormatted = record.financials.agreedExchangeRate != null
    ? record.financials.agreedExchangeRate.toLocaleString("en", { minimumFractionDigits: dec, maximumFractionDigits: record.financials.pricingVersion === 2 ? 12 : dec })
    : "N/A";
  const rateDate = record.financials.exchangeRateDate || record.agreementDate || "____ / ____ / ______";

  const newRateLine = isNonEur && record.financials.agreedExchangeRate
    ? `Agreed exchange rate: 1 EUR = ${currency} ${rateFormatted}, as mutually agreed on ${rateDate}. Applicable only where payment is in ${currency}.`
    : `Agreed exchange rate: 1 EUR = ${currency} N/A, as mutually agreed on N/A. Applicable only where payment is in ${currency}.`;

  xml = xml.replace(
    "Agreed exchange rate: 1 EUR = PKR __________, as mutually agreed on ____ / ____ / ______. Applicable only where payment is in PKR.",
    newRateLine
  );

  // 8. Correct third-instalment unmatched parenthesis
  xml = xml.replace(
    "(payable upon the Student\u2019s receipt of an embassy/consulate visa appointment date",
    "(payable upon the Student\u2019s receipt of an embassy/consulate visa appointment date)"
  );
  // ASCII apostrophe fallback
  xml = xml.replace(
    "(payable upon the Student's receipt of an embassy/consulate visa appointment date",
    "(payable upon the Student's receipt of an embassy/consulate visa appointment date)"
  );

  // 9. Populate Table 2 fee breakdown using paraId approach
  function populateTableCell(targetXml: string, paraId: string, text: string): string {
    const regex = new RegExp(
      `(<w:p[^>]*w14:paraId="${paraId}"[^>]*>.*?<\\/w:pPr>)(<\\/w:p>)`
    );
    return targetXml.replace(
      regex,
      `$1<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${text}</w:t></w:r>$2`
    );
  }

  const fin = record.financials;
  const fmtF = (v: number) => formatForeignAmount(v, currency);

  const baseForeignAmt = isNonEur && fin.agreedExchangeRate
    ? `${fmtF(fin.grossFee ?? fin.baseFeeEUR * fin.agreedExchangeRate)}/-`
    : "\u2014";
  const discountPct = fin.pricingVersion === 2 && fin.discountType === "amount" ? "n/a" : `${fin.discountPercent}%`;
  const discountEur = `${(fin.pricingVersion === 2 ? formatForeignAmount(fin.discountEUR, "EUR") : fin.discountEUR.toLocaleString())}/-`;
  const discountFgn = isNonEur && fin.discountForeign != null ? `${fmtF(fin.discountForeign)}/-` : "\u2014";
  const netEur = `${(fin.pricingVersion === 2 ? formatForeignAmount(fin.netFeeEUR, "EUR") : fin.netFeeEUR.toLocaleString())}/-`;
  const netFgn = isNonEur && fin.netFeeForeign != null ? `${fmtF(fin.netFeeForeign)}/-` : "\u2014";

  if (fin.pricingVersion === 2) {
    // Word may split placeholders across runs; replace the controlled paragraph
    // contents while retaining paragraph layout instead of matching plain XML text.
    const setParagraph = (id: string, text: string) => {
      const pattern = new RegExp(`(<w:p[^>]*w14:paraId="${id}"[^>]*>)([\\s\\S]*?)(<\\/w:p>)`);
      xml = xml.replace(pattern, (_match, open: string, body: string, close: string) => {
        const properties = body.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || "";
        return `${open}${properties}<w:r><w:t xml:space="preserve">${text}</w:t></w:r>${close}`;
      });
    };
    const contractAmount = (eur: number, foreign: number | null) => fmtF(isNonEur ? foreign ?? 0 : eur);
    const cell = (value: string) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${value}</w:t></w:r></w:p></w:tc>`;
    const rows = [
      ["Particulars", "Discount %", currency],
      ["Gross consultancy fee", "—", fmtF(fin.grossFee ?? 0)],
      ["Authorised discount", discountPct, contractAmount(fin.discountEUR, fin.discountForeign)],
      ["Net consultancy fee", "—", contractAmount(fin.netFeeEUR, fin.netFeeForeign)],
    ];
    const table = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(side => `<w:${side} w:val="single" w:sz="4"/>`).join("")}</w:tblBorders></w:tblPr>${rows.map(row => `<w:tr>${row.map(cell).join("")}</w:tr>`).join("")}</w:tbl>`;
    xml = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, original => original.includes('w14:paraId="307BA910"') ? table : original);
    xml = xml.replace("Mr./Ms. (2)", `(2) ${record.studentTitle || ""}`).replace("son/daughter of", record.studentRelationship || "son/daughter of").replace("holding CNIC/Passport No.", `holding ${record.studentIdType || "CNIC/Passport"} No.`);
    setParagraph("64AA1854", newRateLine);
    setParagraph("59B152CA", "Official Stamp of UniMondo");
    for (const id of ["29DC4BEB", "0F455465", "35FDDC09", "7D6CB3A5"]) {
      xml = xml.replace(new RegExp(`<w:p[^>]*w14:paraId="${id}"[^>]*>[\\s\\S]*?<\\/w:p>`), "");
    }

    xml = xml.replace("The base consultancy fee is EUR 1,000, or an agreed PKR equivalent.", "The agreed gross consultancy fee, authorised discount and net consultancy fee are set out below in the selected payment currency.");
    xml = xml.replace("1,000/-", `${formatForeignAmount(fin.grossFeeEUR ?? 1000, "EUR")}/-`);
    xml = xml.replace(/(<w:p[^>]*w14:paraId="24D2A444"[\s\S]*?<w:t[^>]*>)PKR(<\/w:t>)/, `$1${currency}$2`);
    const amounts = [fin.firstInstalmentEUR, fin.secondInstalmentEUR, fin.thirdInstalmentEUR];
    const foreign = [fin.firstInstalmentForeign, fin.secondInstalmentForeign, fin.thirdInstalmentForeign];
    ["First Instalment — 30%", "Second Instalment — 40%", "Third Instalment — 30%"].forEach((label, i) => {
      const amount = `${currency} ${contractAmount(amounts[i], foreign[i])}`;
      xml = xml.replace(label, `${label}: ${amount}`);
    });
    xml = xml.replace(/<w:highlight[^>]*\/>/g, "").replace(/<w:shd[^>]*\/>/g, "").replace(/<w:color[^>]*\/>/g, '<w:color w:val="000000"/>');
  }
  xml = populateTableCell(xml, "7837ADEA", baseForeignAmt);
  xml = populateTableCell(xml, "04523E70", discountPct);
  xml = populateTableCell(xml, "7D29DFBC", discountEur);
  xml = populateTableCell(xml, "4A792AC7", discountFgn);
  xml = populateTableCell(xml, "27CAE1E7", netEur);
  xml = populateTableCell(xml, "2D491058", netFgn);

  // 10. Table 3: Signatures
  xml = xml.replace(
    "Name: _______________________________________          ",
    `Name: ${record.repName || "_______________________________________"}          `
  );
  xml = xml.replace(
    "Name: _______________________________________",
    `Name: ${record.studentFullName || "_______________________________________"}`
  );
  xml = xml.replace(
    "Designation: __________________________________",
    `Designation: ${record.repDesignation || "__________________________________"}`
  );
  xml = xml.replace(
    "CNIC/Passport: _______________________________",
    `CNIC/Passport: ${record.studentCnicPassport || "_______________________________"}`
  );
  xml = xml.replace(
    "Date: ________________________________________         ",
    `Date: ${record.repDate || record.agreementDate || "________________________________________"}         `
  );
  xml = xml.replace(
    "Date: _______________________________________",
    `Date: ${record.studentSignatureDate || record.agreementDate || "_______________________________________"}`
  );

  // 11. Stamp area: replace the boxed placeholder with plain label text
  xml = xml.replace(
    "[Official Stamp of UniMondo]",
    "Official Stamp of UniMondo"
  );

  if (fin.pricingVersion === 2) {
    xml = xml.replace("CNIC/Passport:", `${record.studentIdType || "CNIC/Passport"}:`);
    xml = xml.replace("; and, and (2)", "; and (2)").replace("“Student” (“Student”)", "“Student”");
  }
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer" });
}
