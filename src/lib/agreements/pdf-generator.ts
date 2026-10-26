import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AgreementRecord } from "../../types/agreement";

/**
 * Generates an authentic, selectable-text PDF matching the UniMondo Retainer Agreement
 * in pure Node.js (runs reliably on Vercel serverless runtime without external dependencies).
 * 
 * Specs:
 * - US Letter page size: 8.5 x 11 inches (612 x 792 pt)
 * - Exact 0.7-inch margins: 50.4 pt on all sides (drawable width: 511.2 pt)
 * - Typography: Times New Roman (TimesRoman, TimesRomanBold, TimesRomanItalic)
 * - Punctuation correction: Third instalment closing parenthesis
 * - Preserves blank signature lines and stamp area
 */
export async function generateAgreementPdf(record: AgreementRecord): Promise<Buffer> {
  const doc = await PDFDocument.create();

  const fontRegular = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 50.4; // 0.7 inches
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 511.2 pt
  const BOTTOM_LIMIT = MARGIN + 20;

  let currentPage: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - MARGIN;

  function checkNewPage(neededHeight: number) {
    if (currentY - neededHeight < BOTTOM_LIMIT) {
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN;
    }
  }

  function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function drawParagraph(
    text: string,
    options: {
      font?: PDFFont;
      fontSize?: number;
      lineHeight?: number;
      align?: "left" | "center" | "right";
      spaceAfter?: number;
      boldPrefix?: string;
    } = {}
  ) {
    const font = options.font || fontRegular;
    const fontSize = options.fontSize || 9.5;
    const lineHeight = options.lineHeight || fontSize * 1.25;
    const align = options.align || "left";
    const spaceAfter = options.spaceAfter ?? 6;

    if (options.boldPrefix) {
      // Split bold prefix and rest of text
      const prefixWidth = fontBold.widthOfTextAtSize(options.boldPrefix, fontSize);
      const remainingWidth = CONTENT_WIDTH - prefixWidth;
      const restLines = wrapText(text, font, fontSize, remainingWidth);

      checkNewPage(Math.max(1, restLines.length) * lineHeight + spaceAfter);

      // Draw first line with bold prefix
      currentPage.drawText(options.boldPrefix, {
        x: MARGIN,
        y: currentY - fontSize,
        font: fontBold,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      if (restLines.length > 0) {
        currentPage.drawText(restLines[0], {
          x: MARGIN + prefixWidth,
          y: currentY - fontSize,
          font: font,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight;

        for (let i = 1; i < restLines.length; i++) {
          checkNewPage(lineHeight);
          currentPage.drawText(restLines[i], {
            x: MARGIN,
            y: currentY - fontSize,
            font: font,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
          currentY -= lineHeight;
        }
      } else {
        currentY -= lineHeight;
      }

      currentY -= spaceAfter;
      return;
    }

    const lines = wrapText(text, font, fontSize, CONTENT_WIDTH);
    checkNewPage(lines.length * lineHeight + spaceAfter);

    for (const line of lines) {
      let x = MARGIN;
      if (align === "center") {
        const textWidth = font.widthOfTextAtSize(line, fontSize);
        x = MARGIN + (CONTENT_WIDTH - textWidth) / 2;
      } else if (align === "right") {
        const textWidth = font.widthOfTextAtSize(line, fontSize);
        x = MARGIN + CONTENT_WIDTH - textWidth;
      }

      currentPage.drawText(line, {
        x,
        y: currentY - fontSize,
        font,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }
    currentY -= spaceAfter;
  }

  function drawSectionHeading(numAndTitle: string) {
    checkNewPage(24);
    drawParagraph(numAndTitle, {
      font: fontBold,
      fontSize: 10,
      lineHeight: 13,
      spaceAfter: 4,
    });
  }

  // ================= PAGE 1 =================
  // Header: UNIMONDO
  drawParagraph("UNIMONDO", {
    font: fontBold,
    fontSize: 14,
    align: "center",
    spaceAfter: 2,
  });
  drawParagraph("STUDENT EDUCATIONAL CONSULTANCY & SERVICE RETAINER AGREEMENT", {
    font: fontBold,
    fontSize: 10,
    align: "center",
    spaceAfter: 12,
  });

  // Table 1: Agreement Reference & Date Box
  const refText = record.referenceNumber.startsWith("UM/") ? record.referenceNumber : `UM/${record.referenceNumber}`;
  const dateText = record.agreementDate || "_________________";
  const t1Height = 22;
  checkNewPage(t1Height + 8);
  currentPage.drawRectangle({
    x: MARGIN,
    y: currentY - t1Height,
    width: CONTENT_WIDTH,
    height: t1Height,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 0.75,
  });
  currentPage.drawText(`Agreement Reference: ${refText}`, {
    x: MARGIN + 8,
    y: currentY - 14,
    font: fontBold,
    size: 9.5,
    color: rgb(0, 0, 0),
  });
  const dateStr = `Date: ${dateText}`;
  const dateWidth = fontBold.widthOfTextAtSize(dateStr, 9.5);
  currentPage.drawText(dateStr, {
    x: MARGIN + CONTENT_WIDTH - dateWidth - 8,
    y: currentY - 14,
    font: fontBold,
    size: 9.5,
    color: rgb(0, 0, 0),
  });
  currentY -= t1Height + 10;

  // 1. PARTIES AND ENGAGEMENT
  drawSectionHeading("1. PARTIES AND ENGAGEMENT");
  const consultantDetails = `${record.consultantEntityName}${record.consultantRegNumber ? `, registration number ${record.consultantRegNumber}` : ""}${record.consultantAddress ? ` and address ${record.consultantAddress}` : ""}`;
  const p1Text = `This Agreement is made between UniMondo, acting through its duly authorised representative on behalf of ${consultantDetails} (“Consultant”), and Mr./Ms. ${record.studentFullName || "__________________"}, son/daughter of ${record.studentParentGuardian || "__________________"}, holding CNIC/Passport No. ${record.studentCnicPassport || "__________________"}, residing at ${record.studentAddress || "__________________"}, email ${record.studentEmail || "__________________"}, contact ${record.studentPhone || "__________________"} (“Student”).`;
  drawParagraph(p1Text, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 5 });

  const p2Text = `Following preliminary assessment, the Student engages UniMondo for educational consultancy and university admission assistance concerning ${record.degreeLevel || "__________________"}, ${record.fieldOfStudy || "__________________"}, ${record.preferredDestination || "__________________"} and the ${record.academicYearIntake || "__________________"}. The Parties agree as follows.`;
  drawParagraph(p2Text, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 8 });

  // 2. SCOPE OF EDUCATIONAL SERVICES
  drawSectionHeading("2. SCOPE OF EDUCATIONAL SERVICES");
  const scopeText = `UniMondo will provide reasonable professional assistance with academic profile assessment; selection and shortlisting of suitable universities and programmes; eligibility and admission requirements; preparation and submission of agreed university applications; supporting academic documentation, statements and motivation letters; scholarship information and application guidance where relevant; correspondence and application status follow-up; and general post-admission educational and enrolment guidance. Any university, destination or intake not agreed under this engagement may require a separate written arrangement.`;
  drawParagraph(scopeText, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 8 });

  // 3. PROFESSIONAL FEE AND AUTHORISED DISCOUNT
  drawSectionHeading("3. PROFESSIONAL FEE AND AUTHORISED DISCOUNT");
  const feeText = `The Parties agree that UniMondo’s educational consultancy services shall be provided against a professional service fee. The base consultancy fee is EUR 1,000, or an agreed PKR equivalent. The authorised UniMondo administrator may approve a discount within delegated authority. The discounted net amount entered below shall be the final agreed fee upon signature.`;
  drawParagraph(feeText, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 4 });

  const isPkr = record.financials.paymentCurrency === "PKR";
  const rateText = isPkr && record.financials.agreedExchangeRate
    ? `Agreed exchange rate: 1 EUR = PKR ${record.financials.agreedExchangeRate.toLocaleString()}, as mutually agreed on ${record.financials.exchangeRateDate || record.agreementDate || "____ / ____ / ______"}. Applicable only where payment is in PKR.`
    : `Agreed exchange rate: 1 EUR = PKR N/A, as mutually agreed on N/A. Applicable only where payment is in PKR.`;
  drawParagraph(rateText, { font: fontItalic, fontSize: 9, lineHeight: 12, spaceAfter: 6 });

  // Table 2: Fees Table (Particulars, %, EUR, PKR)
  const colWidths = [190, 60, 130, 131.2]; // total = 511.2
  const rowHeight = 17;
  const tableRows = [
    ["Particulars", "%", "EUR", "PKR"],
    [
      "Consultancy Fee:",
      "n/a",
      "1,000/-",
      isPkr && record.financials.agreedExchangeRate ? `${(record.financials.baseFeeEUR * record.financials.agreedExchangeRate).toLocaleString()}/-` : "—",
    ],
    [
      "Discount:",
      `${record.financials.discountPercent}%`,
      `${record.financials.discountEUR.toLocaleString()}/-`,
      isPkr && record.financials.discountPKR != null ? `${record.financials.discountPKR.toLocaleString()}/-` : "—",
    ],
    [
      "Net Consultancy Fee:",
      "n/a",
      `${record.financials.netFeeEUR.toLocaleString()}/-`,
      isPkr && record.financials.netFeePKR != null ? `${record.financials.netFeePKR.toLocaleString()}/-` : "—",
    ],
  ];

  checkNewPage(tableRows.length * rowHeight + 10);
  let tblY = currentY;

  tableRows.forEach((row, rIdx) => {
    let curX = MARGIN;
    const isHeader = rIdx === 0;
    const rowFont = isHeader ? fontBold : fontRegular;

    // Row border
    currentPage.drawRectangle({
      x: MARGIN,
      y: tblY - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 0.5,
      color: isHeader ? rgb(0.95, 0.95, 0.95) : undefined,
    });

    row.forEach((cellText, cIdx) => {
      const colW = colWidths[cIdx];
      // Vertical cell divider
      if (cIdx > 0) {
        currentPage.drawLine({
          start: { x: curX, y: tblY },
          end: { x: curX, y: tblY - rowHeight },
          color: rgb(0.2, 0.2, 0.2),
          thickness: 0.5,
        });
      }

      const cellTextWidth = rowFont.widthOfTextAtSize(cellText, 9);
      let cellX = curX + 6;
      if (cIdx === 1) {
        // Center aligned for %
        cellX = curX + (colW - cellTextWidth) / 2;
      } else if (cIdx >= 2) {
        // Right aligned for EUR / PKR
        cellX = curX + colW - cellTextWidth - 8;
      }

      currentPage.drawText(cellText, {
        x: cellX,
        y: tblY - 12,
        font: rowFont,
        size: 9,
        color: rgb(0, 0, 0),
      });

      curX += colW;
    });

    tblY -= rowHeight;
  });
  currentY = tblY - 8;

  // 4. FIXED THREE-INSTALMENT PAYMENT SCHEDULE
  drawSectionHeading("4. FIXED THREE-INSTALMENT PAYMENT SCHEDULE");
  const firstInstText = isPkr && record.financials.firstInstalmentPKR != null
    ? `First Instalment — 30% (EUR ${record.financials.firstInstalmentEUR.toLocaleString()} / PKR ${record.financials.firstInstalmentPKR.toLocaleString()}) payable upon signing this Agreement and commencement of the engagement.`
    : `First Instalment — 30% (EUR ${record.financials.firstInstalmentEUR.toLocaleString()}) payable upon signing this Agreement and commencement of the engagement.`;
  drawParagraph(firstInstText, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 3 });

  const secondInstText = isPkr && record.financials.secondInstalmentPKR != null
    ? `Second Instalment — 40% (EUR ${record.financials.secondInstalmentEUR.toLocaleString()} / PKR ${record.financials.secondInstalmentPKR.toLocaleString()}) payable upon submission of the first agreed university admission application.`
    : `Second Instalment — 40% (EUR ${record.financials.secondInstalmentEUR.toLocaleString()}) payable upon submission of the first agreed university admission application.`;
  drawParagraph(secondInstText, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 3 });

  // Corrected third-instalment unmatched parenthesis
  const thirdInstText = isPkr && record.financials.thirdInstalmentPKR != null
    ? `Third Instalment — 30% (EUR ${record.financials.thirdInstalmentEUR.toLocaleString()} / PKR ${record.financials.thirdInstalmentPKR.toLocaleString()}) (payable upon the Student’s receipt of an embassy/consulate visa appointment date).`
    : `Third Instalment — 30% (EUR ${record.financials.thirdInstalmentEUR.toLocaleString()}) (payable upon the Student’s receipt of an embassy/consulate visa appointment date).`;
  drawParagraph(thirdInstText, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 3 });

  drawParagraph(
    "The third instalment is an agreed payment timing milestone only: UniMondo does not arrange or guarantee appointments, undertake visa applications, or provide immigration services under this Agreement.",
    { font: fontItalic, fontSize: 8.5, lineHeight: 11.5, spaceAfter: 8 }
  );

  // 5. CANCELLATION AND REFUND
  drawSectionHeading("5. CANCELLATION AND REFUND");
  drawParagraph(" If no admission offer is obtained following completion of the agreed application cycle despite the Student’s compliance with this Agreement, UniMondo shall refund 70% of the consultancy fees actually paid, subject to mandatory law.", {
    boldPrefix: "No admission:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 3,
  });
  drawParagraph(" If the Student voluntarily cancels before receiving an admission offer, UniMondo shall refund 50% of the first instalment received. Payments relating to completed later milestones, if any, shall be settled according to services performed and applicable law.", {
    boldPrefix: "Student cancellation before admission:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 3,
  });
  drawParagraph(" If the Student cancels after receiving an admission offer, UniMondo shall retain the first instalment (30% of the final agreed fee) and refund all additional consultancy fees actually paid, subject to mandatory law. Statutory withdrawal and refund rights prevail over any inconsistent term.", {
    boldPrefix: "Student cancellation after admission:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 12,
  });

  // ================= PAGE 2 =================
  // Transition cleanly to page 2 (as in Word template)
  currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  currentY = PAGE_HEIGHT - MARGIN;

  // 6. DISCLAIMERS, EXCLUSIONS AND UNDERTAKINGS
  drawSectionHeading("6. DISCLAIMERS, EXCLUSIONS AND UNDERTAKINGS");
  drawParagraph(" University admission, academic recognition, scholarships and funding decisions are determined independently by the relevant institutions. UniMondo undertakes reasonable care and diligence, but does not guarantee admission, scholarships, an acceptance date or any particular result.", {
    boldPrefix: "Educational outcomes:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 3,
  });
  drawParagraph(" UniMondo is an educational consultancy, not a visa or immigration consultancy or legal representative under this Agreement. Visa applications, appointments, evidence, submissions and immigration compliance are the Student’s responsibility, assisted by appropriately authorised professionals if needed. Any general public information shared by UniMondo is incidental orientation, not individual immigration advice. UniMondo does not promise or guarantee visa or residence approval. Visa refusal or delay alone does not establish non-performance of educational services.", {
    boldPrefix: "Visa and immigration:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 3,
  });
  drawParagraph(" Payments shall be made only through officially designated UniMondo channels and acknowledged by receipt. Additional consultancy charges require prior written agreement.", {
    boldPrefix: "Official payments and additional charges:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 3,
  });
  drawParagraph(" The Student shall provide complete, accurate and authentic documents; disclose relevant academic circumstances; review and approve applications; cooperate promptly; meet examinations, interviews and deadlines; share important university correspondence; and pay the agreed fees. UniMondo may suspend or end the engagement on reasonable written notice for material non-cooperation, fraudulent documents or non-payment of an amount properly due, subject to applicable law.", {
    boldPrefix: "Student obligations:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 3,
  });
  drawParagraph(" University application and tuition fees, tests, translations, attestations, legalisation, visa-related charges, insurance, travel and accommodation are not included unless expressly stated otherwise in writing. The Student must be informed of material known third-party costs before agreeing to incur them.", {
    boldPrefix: "Excluded third-party charges:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 3,
  });
  drawParagraph(" Nothing in this Agreement excludes liability for negligence, misrepresentation, failure to perform agreed services, or other liability that cannot lawfully be excluded.", {
    boldPrefix: "Liability:",
    fontSize: 9,
    lineHeight: 12,
    spaceAfter: 8,
  });

  // 7. CONFIDENTIALITY, DURATION AND GENERAL TERMS
  drawSectionHeading("7. CONFIDENTIALITY, DURATION AND GENERAL TERMS");
  const genTerms = `Both Parties shall treat personal and academic information confidentially. UniMondo may process and share necessary information with relevant educational institutions in accordance with applicable data-protection law and its privacy notice. This Agreement takes effect on signature and continues for the agreed application cycle, unless completed or lawfully terminated sooner. Amendments must be recorded in writing and accepted by both Parties. Concerns shall first be raised and discussed in good faith, without limiting available legal rights.`;
  drawParagraph(genTerms, { fontSize: 9, lineHeight: 12, spaceAfter: 8 });

  // 8. ACCEPTANCE AND SIGNATURES
  drawSectionHeading("8. ACCEPTANCE AND SIGNATURES");
  const ackText = `By signing, the Student acknowledges the agreed services, total fee and discount, fixed three-instalment schedule, refund terms and the express exclusion of visa and immigration consultancy services.`;
  drawParagraph(ackText, { fontSize: 9, lineHeight: 12, spaceAfter: 10 });

  // Table 3: Signature Blocks (2 Columns)
  const halfColWidth = CONTENT_WIDTH / 2;
  const sigRowHeight = 22;
  const sigRows = [
    { left: "FOR UNIMONDO", right: "FOR THE STUDENT", isHeader: true },
    { left: "Signature: ____________________________________", right: "Signature: ____________________________________" },
    { left: `Name: ${record.repName || "_______________________________________"}`, right: `Name: ${record.studentFullName || "_______________________________________"}` },
    { left: `Designation: ${record.repDesignation || "__________________________________"}`, right: `CNIC/Passport: ${record.studentCnicPassport || "_______________________________"}` },
    { left: `Date: ${record.repDate || record.agreementDate || "________________________________________"}`, right: `Date: ${record.studentSignatureDate || record.agreementDate || "_______________________________________"}` },
  ];

  checkNewPage(sigRows.length * sigRowHeight + 50);
  let sigY = currentY;

  sigRows.forEach((row) => {
    const isHdr = Boolean(row.isHeader);
    const rowFnt = isHdr ? fontBold : fontRegular;

    // Left column
    currentPage.drawText(row.left, {
      x: MARGIN,
      y: sigY - 14,
      font: rowFnt,
      size: 9.5,
      color: rgb(0, 0, 0),
    });

    // Right column
    currentPage.drawText(row.right, {
      x: MARGIN + halfColWidth,
      y: sigY - 14,
      font: rowFnt,
      size: 9.5,
      color: rgb(0, 0, 0),
    });

    sigY -= sigRowHeight;
  });

  currentY = sigY - 15;

  // Stamp Area (Blank for physical official stamp)
  const stampWidth = 200;
  const stampHeight = 50;
  checkNewPage(stampHeight + 10);
  currentPage.drawRectangle({
    x: MARGIN + (CONTENT_WIDTH - stampWidth) / 2,
    y: currentY - stampHeight,
    width: stampWidth,
    height: stampHeight,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.75,
  });
  const stampLabel = "[Official Stamp of UniMondo]";
  const stampLabelWidth = fontRegular.widthOfTextAtSize(stampLabel, 9);
  currentPage.drawText(stampLabel, {
    x: MARGIN + (CONTENT_WIDTH - stampLabelWidth) / 2,
    y: currentY - stampHeight / 2 - 3,
    font: fontRegular,
    size: 9,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
