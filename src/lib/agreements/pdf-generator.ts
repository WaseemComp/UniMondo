import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AgreementRecord } from "../../types/agreement";
import { CURRENCY_DECIMALS } from "../../types/agreement";
import { formatForeignAmount } from "./financials";

/**
 * Generates a selectable-text PDF matching the UniMondo Retainer Agreement.
 *
 * Specs:
 * - US Letter: 8.5 × 11 in (612 × 792 pt)
 * - 0.7-inch margins (50.4 pt) on all sides
 * - Times New Roman throughout
 * - Unboxed Reference / Date header
 * - Numbered parties clause per revised wording
 * - Continuous cancellation subclauses (no forced mid-paragraph breaks)
 * - Blank stamp space + short rule + small label (no box)
 * - Full multi-currency support with per-currency decimal precision
 */
export async function generateAgreementPdf(record: AgreementRecord): Promise<Buffer> {
  const doc = await PDFDocument.create();

  const fontRegular = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 50.4; // 0.7 in
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
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /** Draw a paragraph with optional leading bold segment on the same line. */
  function drawParagraph(
    text: string,
    options: {
      font?: PDFFont;
      fontSize?: number;
      lineHeight?: number;
      align?: "left" | "center" | "right";
      spaceAfter?: number;
      /** Bold prefix drawn inline on the first line before the regular text. */
      boldPrefix?: string;
    } = {}
  ) {
    const font = options.font || fontRegular;
    const fontSize = options.fontSize || 9.5;
    const lineHeight = options.lineHeight || fontSize * 1.25;
    const align = options.align || "left";
    const spaceAfter = options.spaceAfter ?? 6;

    if (options.boldPrefix) {
      const prefixWidth = fontBold.widthOfTextAtSize(options.boldPrefix, fontSize);
      const restLines = wrapText(text, font, fontSize, CONTENT_WIDTH - prefixWidth);

      checkNewPage(Math.max(1, restLines.length) * lineHeight + spaceAfter);

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
          font,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight;
        for (let i = 1; i < restLines.length; i++) {
          checkNewPage(lineHeight);
          currentPage.drawText(restLines[i], {
            x: MARGIN,
            y: currentY - fontSize,
            font,
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
        x = MARGIN + (CONTENT_WIDTH - font.widthOfTextAtSize(line, fontSize)) / 2;
      } else if (align === "right") {
        x = MARGIN + CONTENT_WIDTH - font.widthOfTextAtSize(line, fontSize);
      }
      currentPage.drawText(line, { x, y: currentY - fontSize, font, size: fontSize, color: rgb(0, 0, 0) });
      currentY -= lineHeight;
    }
    currentY -= spaceAfter;
  }

  function drawSectionHeading(title: string) {
    checkNewPage(24);
    drawParagraph(title, { font: fontBold, fontSize: 10, lineHeight: 13, spaceAfter: 4 });
  }

  // ─── Currency helpers ────────────────────────────────────────────────────────
  const isNonEur = record.financials.paymentCurrency !== "EUR";
  const currency = record.financials.paymentCurrency;
  const fin = record.financials;

  function fmt(amount: number): string {
    return formatForeignAmount(amount, currency);
  }

  // ─── PAGE 1 ─────────────────────────────────────────────────────────────────

  // Document title (centred)
  drawParagraph("UNIMONDO", { font: fontBold, fontSize: 14, align: "center", spaceAfter: 2 });
  drawParagraph("STUDENT EDUCATIONAL CONSULTANCY & SERVICE RETAINER AGREEMENT", {
    font: fontBold, fontSize: 10, align: "center", spaceAfter: 10,
  });

  // ── Reference / Date — plain, unboxed ───────────────────────────────────────
  const refText = record.referenceNumber.startsWith("UM/")
    ? record.referenceNumber
    : `UM/${record.referenceNumber}`;
  const dateStr = `Date: ${record.agreementDate || "_________________"}`;
  const refLine = `Reference: ${refText}`;

  checkNewPage(22);
  currentPage.drawText(refLine, {
    x: MARGIN, y: currentY - 11,
    font: fontBold, size: 9.5, color: rgb(0, 0, 0),
  });
  currentPage.drawText(dateStr, {
    x: MARGIN + CONTENT_WIDTH - fontBold.widthOfTextAtSize(dateStr, 9.5),
    y: currentY - 11,
    font: fontBold, size: 9.5, color: rgb(0, 0, 0),
  });
  currentY -= 22;

  // ── 1. PARTIES AND ENGAGEMENT ────────────────────────────────────────────────
  drawSectionHeading("1. PARTIES AND ENGAGEMENT");

  drawParagraph("This Agreement is entered into between:", { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 4 });

  const consultantLine =
    `(1) ${record.consultantEntityName}, registration number ${record.consultantRegNumber}` +
    (record.consultantAddress ? `, with its address at ${record.consultantAddress}` : "") +
    `, acting through its duly authorised representative, ${record.repName || "__________________"}, ` +
    `${record.repDesignation || "__________________"}, hereinafter referred to as the \u201cConsultant\u201d; and`;
  drawParagraph(consultantLine, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 4 });

  const studentLine =
    `(2) ${record.studentFullName || "__________________"}, son/daughter of ` +
    `${record.studentParentGuardian || "__________________"}, holding CNIC/Passport No. ` +
    `${record.studentCnicPassport || "__________________"}, residing at ` +
    `${record.studentAddress || "__________________"}, email ` +
    `${record.studentEmail || "__________________"}, telephone ` +
    `${record.studentPhone || "__________________"}, hereinafter referred to as the \u201cStudent\u201d.`;
  drawParagraph(studentLine, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 4 });

  drawParagraph(
    "The Consultant and the Student are each referred to individually as a \u201cParty\u201d and collectively as the \u201cParties\u201d.",
    { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 5 }
  );

  const engagementText =
    `Following preliminary assessment, the Student engages UniMondo for educational consultancy ` +
    `and university admission assistance concerning ${record.degreeLevel || "__________________"}, ` +
    `${record.fieldOfStudy || "__________________"}, ${record.preferredDestination || "__________________"} ` +
    `and the ${record.academicYearIntake || "__________________"}. The Parties agree as follows.`;
  drawParagraph(engagementText, { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 8 });

  // ── 2. SCOPE OF EDUCATIONAL SERVICES ────────────────────────────────────────
  drawSectionHeading("2. SCOPE OF EDUCATIONAL SERVICES");
  drawParagraph(
    "UniMondo will provide reasonable professional assistance with academic profile assessment; " +
    "selection and shortlisting of suitable universities and programmes; eligibility and admission requirements; " +
    "preparation and submission of agreed university applications; supporting academic documentation, statements " +
    "and motivation letters; scholarship information and application guidance where relevant; correspondence and " +
    "application status follow-up; and general post-admission educational and enrolment guidance. Any university, " +
    "destination or intake not agreed under this engagement may require a separate written arrangement.",
    { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 8 }
  );

  // ── 3. PROFESSIONAL FEE AND AUTHORISED DISCOUNT ──────────────────────────────
  drawSectionHeading("3. PROFESSIONAL FEE AND AUTHORISED DISCOUNT");
  drawParagraph(
    "The Parties agree that UniMondo\u2019s educational consultancy services shall be provided against a professional " +
    "service fee. The base consultancy fee is EUR 1,000, or an agreed equivalent in the selected payment currency. " +
    "The authorised UniMondo administrator may approve a discount within delegated authority. The discounted net " +
    "amount entered below shall be the final agreed fee upon signature.",
    { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 4 }
  );

  // Exchange rate line (italic)
  const rateText = isNonEur && fin.agreedExchangeRate
    ? `Agreed exchange rate: 1 EUR = ${currency} ${fin.agreedExchangeRate.toLocaleString("en", { minimumFractionDigits: CURRENCY_DECIMALS[currency], maximumFractionDigits: CURRENCY_DECIMALS[currency] })}, as mutually agreed on ${fin.exchangeRateDate || record.agreementDate || "____ / ____ / ______"}. Applicable only where payment is in ${currency}.`
    : `Agreed exchange rate: 1 EUR = ${currency} N/A, as mutually agreed on N/A. Applicable only where payment is in ${currency}.`;
  drawParagraph(rateText, { font: fontItalic, fontSize: 9, lineHeight: 12, spaceAfter: 6 });

  // Table 2: Fees
  const colWidths = [190, 60, 130, 131.2];
  const rowHeight = 17;
  const baseForeignAmt = isNonEur && fin.agreedExchangeRate
    ? `${fmt(fin.baseFeeEUR * fin.agreedExchangeRate)}/-`
    : "\u2014";
  const tableRows = [
    ["Particulars", "%", "EUR", currency],
    ["Consultancy Fee:", "n/a", "1,000/-", baseForeignAmt],
    ["Discount:", `${fin.discountPercent}%`, `${fin.discountEUR.toLocaleString()}/-`,
      isNonEur && fin.discountForeign != null ? `${fmt(fin.discountForeign)}/-` : "\u2014"],
    ["Net Consultancy Fee:", "n/a", `${fin.netFeeEUR.toLocaleString()}/-`,
      isNonEur && fin.netFeeForeign != null ? `${fmt(fin.netFeeForeign)}/-` : "\u2014"],
  ];

  checkNewPage(tableRows.length * rowHeight + 10);
  let tblY = currentY;
  tableRows.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    const rowFont = isHeader ? fontBold : fontRegular;
    currentPage.drawRectangle({
      x: MARGIN, y: tblY - rowHeight, width: CONTENT_WIDTH, height: rowHeight,
      borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 0.5,
      color: isHeader ? rgb(0.95, 0.95, 0.95) : undefined,
    });
    let curX = MARGIN;
    row.forEach((cellText, cIdx) => {
      const colW = colWidths[cIdx];
      if (cIdx > 0) {
        currentPage.drawLine({
          start: { x: curX, y: tblY }, end: { x: curX, y: tblY - rowHeight },
          color: rgb(0.2, 0.2, 0.2), thickness: 0.5,
        });
      }
      const tw = rowFont.widthOfTextAtSize(cellText, 9);
      let cx = curX + 6;
      if (cIdx === 1) cx = curX + (colW - tw) / 2;
      else if (cIdx >= 2) cx = curX + colW - tw - 8;
      currentPage.drawText(cellText, { x: cx, y: tblY - 12, font: rowFont, size: 9, color: rgb(0, 0, 0) });
      curX += colW;
    });
    tblY -= rowHeight;
  });
  currentY = tblY - 8;

  // ── 4. FIXED THREE-INSTALMENT PAYMENT SCHEDULE ───────────────────────────────
  drawSectionHeading("4. FIXED THREE-INSTALMENT PAYMENT SCHEDULE");

  const i1EurStr = `EUR ${fin.firstInstalmentEUR.toLocaleString()}`;
  const i1Str = isNonEur && fin.firstInstalmentForeign != null
    ? `${i1EurStr} / ${currency} ${fmt(fin.firstInstalmentForeign)}`
    : i1EurStr;
  drawParagraph(
    `First Instalment \u2014 30% (${i1Str}) payable upon signing this Agreement and commencement of the engagement.`,
    { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 3 }
  );

  const i2EurStr = `EUR ${fin.secondInstalmentEUR.toLocaleString()}`;
  const i2Str = isNonEur && fin.secondInstalmentForeign != null
    ? `${i2EurStr} / ${currency} ${fmt(fin.secondInstalmentForeign)}`
    : i2EurStr;
  drawParagraph(
    `Second Instalment \u2014 40% (${i2Str}) payable upon submission of the first agreed university admission application.`,
    { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 3 }
  );

  const i3EurStr = `EUR ${fin.thirdInstalmentEUR.toLocaleString()}`;
  const i3Str = isNonEur && fin.thirdInstalmentForeign != null
    ? `${i3EurStr} / ${currency} ${fmt(fin.thirdInstalmentForeign)}`
    : i3EurStr;
  drawParagraph(
    `Third Instalment \u2014 30% (${i3Str}) (payable upon the Student\u2019s receipt of an embassy/consulate visa appointment date).`,
    { fontSize: 9.5, lineHeight: 12.5, spaceAfter: 3 }
  );

  drawParagraph(
    "The third instalment is an agreed payment timing milestone only: UniMondo does not arrange or guarantee appointments, undertake visa applications, or provide immigration services under this Agreement.",
    { font: fontItalic, fontSize: 8.5, lineHeight: 11.5, spaceAfter: 8 }
  );

  // ── 5. CANCELLATION AND REFUND ───────────────────────────────────────────────
  drawSectionHeading("5. CANCELLATION AND REFUND");

  drawParagraph(
    " If no admission offer is obtained following completion of the agreed application cycle despite the Student\u2019s compliance with this Agreement, UniMondo shall refund 70% of the consultancy fees actually paid, subject to mandatory law.",
    { boldPrefix: "No admission:", fontSize: 9, lineHeight: 12, spaceAfter: 4 }
  );
  drawParagraph(
    " If the Student voluntarily cancels before receiving an admission offer, UniMondo shall refund 50% of the first instalment received. Payments relating to completed later milestones, if any, shall be settled according to services performed and applicable law.",
    { boldPrefix: "Student cancellation before admission:", fontSize: 9, lineHeight: 12, spaceAfter: 4 }
  );
  drawParagraph(
    " If the Student cancels after receiving an admission offer, UniMondo shall retain the first instalment (30% of the final agreed fee) and refund all additional consultancy fees actually paid, subject to mandatory law. Statutory withdrawal and refund rights prevail over any inconsistent term.",
    { boldPrefix: "Student cancellation after admission:", fontSize: 9, lineHeight: 12, spaceAfter: 12 }
  );

  // ─── PAGE 2 ─────────────────────────────────────────────────────────────────
  currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  currentY = PAGE_HEIGHT - MARGIN;

  // ── 6. DISCLAIMERS, EXCLUSIONS AND UNDERTAKINGS ──────────────────────────────
  drawSectionHeading("6. DISCLAIMERS, EXCLUSIONS AND UNDERTAKINGS");
  drawParagraph(
    " University admission, academic recognition, scholarships and funding decisions are determined independently by the relevant institutions. UniMondo undertakes reasonable care and diligence, but does not guarantee admission, scholarships, an acceptance date or any particular result.",
    { boldPrefix: "Educational outcomes:", fontSize: 9, lineHeight: 12, spaceAfter: 3 }
  );
  drawParagraph(
    " UniMondo is an educational consultancy, not a visa or immigration consultancy or legal representative under this Agreement. Visa applications, appointments, evidence, submissions and immigration compliance are the Student\u2019s responsibility, assisted by appropriately authorised professionals if needed. Any general public information shared by UniMondo is incidental orientation, not individual immigration advice. UniMondo does not promise or guarantee visa or residence approval. Visa refusal or delay alone does not establish non-performance of educational services.",
    { boldPrefix: "Visa and immigration:", fontSize: 9, lineHeight: 12, spaceAfter: 3 }
  );
  drawParagraph(
    " Payments shall be made only through officially designated UniMondo channels and acknowledged by receipt. Additional consultancy charges require prior written agreement.",
    { boldPrefix: "Official payments and additional charges:", fontSize: 9, lineHeight: 12, spaceAfter: 3 }
  );
  drawParagraph(
    " The Student shall provide complete, accurate and authentic documents; disclose relevant academic circumstances; review and approve applications; cooperate promptly; meet examinations, interviews and deadlines; share important university correspondence; and pay the agreed fees. UniMondo may suspend or end the engagement on reasonable written notice for material non-cooperation, fraudulent documents or non-payment of an amount properly due, subject to applicable law.",
    { boldPrefix: "Student obligations:", fontSize: 9, lineHeight: 12, spaceAfter: 3 }
  );
  drawParagraph(
    " University application and tuition fees, tests, translations, attestations, legalisation, visa-related charges, insurance, travel and accommodation are not included unless expressly stated otherwise in writing. The Student must be informed of material known third-party costs before agreeing to incur them.",
    { boldPrefix: "Excluded third-party charges:", fontSize: 9, lineHeight: 12, spaceAfter: 3 }
  );
  drawParagraph(
    " Nothing in this Agreement excludes liability for negligence, misrepresentation, failure to perform agreed services, or other liability that cannot lawfully be excluded.",
    { boldPrefix: "Liability:", fontSize: 9, lineHeight: 12, spaceAfter: 8 }
  );

  // ── 7. CONFIDENTIALITY, DURATION AND GENERAL TERMS ──────────────────────────
  drawSectionHeading("7. CONFIDENTIALITY, DURATION AND GENERAL TERMS");
  drawParagraph(
    "Both Parties shall treat personal and academic information confidentially. UniMondo may process and share necessary information with relevant educational institutions in accordance with applicable data-protection law and its privacy notice. This Agreement takes effect on signature and continues for the agreed application cycle, unless completed or lawfully terminated sooner. Amendments must be recorded in writing and accepted by both Parties. Concerns shall first be raised and discussed in good faith, without limiting available legal rights.",
    { fontSize: 9, lineHeight: 12, spaceAfter: 8 }
  );

  // ── 8. ACCEPTANCE AND SIGNATURES ────────────────────────────────────────────
  drawSectionHeading("8. ACCEPTANCE AND SIGNATURES");
  drawParagraph(
    "By signing, the Student acknowledges the agreed services, total fee and discount, fixed three-instalment schedule, refund terms and the express exclusion of visa and immigration consultancy services.",
    { fontSize: 9, lineHeight: 12, spaceAfter: 10 }
  );

  // Signature table (2 columns, no borders)
  const halfW = CONTENT_WIDTH / 2;
  const sigRowH = 22;
  const sigRows: { left: string; right: string; bold?: boolean }[] = [
    { left: "FOR UNIMONDO", right: "FOR THE STUDENT", bold: true },
    { left: "Signature: ____________________________________", right: "Signature: ____________________________________" },
    { left: `Name: ${record.repName || "_______________________________________"}`, right: `Name: ${record.studentFullName || "_______________________________________"}` },
    { left: `Designation: ${record.repDesignation || "__________________________________"}`, right: `CNIC/Passport: ${record.studentCnicPassport || "_______________________________"}` },
    { left: `Date: ${record.repDate || record.agreementDate || "________________________________________"}`, right: `Date: ${record.studentSignatureDate || record.agreementDate || "_______________________________________"}` },
  ];

  checkNewPage(sigRows.length * sigRowH + 80);
  let sigY = currentY;
  sigRows.forEach((row) => {
    const f = row.bold ? fontBold : fontRegular;
    currentPage.drawText(row.left, { x: MARGIN, y: sigY - 14, font: f, size: 9.5, color: rgb(0, 0, 0) });
    currentPage.drawText(row.right, { x: MARGIN + halfW, y: sigY - 14, font: f, size: 9.5, color: rgb(0, 0, 0) });
    sigY -= sigRowH;
  });
  currentY = sigY - 20;

  // ── Stamp area — blank space, horizontal rule, small label ──────────────────
  checkNewPage(80);
  currentY -= 50; // blank space for physical stamp

  currentPage.drawLine({
    start: { x: MARGIN, y: currentY },
    end: { x: MARGIN + 120, y: currentY },
    color: rgb(0, 0, 0),
    thickness: 0.6,
  });

  const stampLabel = "Official Stamp of UniMondo";
  currentPage.drawText(stampLabel, {
    x: MARGIN,
    y: currentY - 12,
    font: fontItalic,
    size: 8,
    color: rgb(0.35, 0.35, 0.35),
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
