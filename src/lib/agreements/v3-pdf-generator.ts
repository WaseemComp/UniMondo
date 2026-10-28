import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AgreementRecord } from "../../types/agreement";
import { AGREEMENT_LAYOUT as layout, agreementDocument, usesStandardAgreement, type ContractRun } from "./v3-document-content";
import { generateLegacyAgreementPdf } from "./legacy-pdf-generator";

type Word = { text: string; font: PDFFont; width: number };

/** Reuses pdf-lib with shared paragraphs, embedded Times New Roman and flowing A4 pagination. */
export async function generateAgreementPdf(record: AgreementRecord): Promise<Buffer> {
  if (!usesStandardAgreement(record)) return generateLegacyAgreementPdf(record);
  const content = agreementDocument(record);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontData = ["times-new-roman.ttf", "times-new-roman-bold.ttf", "times-new-roman-italic.ttf"].map(file =>
    fs.readFileSync(path.join(process.cwd(), "templates/fonts", file)));
  const fonts = await Promise.all(fontData.map(data => doc.embedFont(data, { subset: true })));
  const [regular, bold, italic] = fonts;
  const { width, height, margin } = layout;
  const contentWidth = width - 2 * margin;
  // Word's auto line spacing uses the font's natural line box (not just its point size).
  const metrics = fontkit.create(fontData[0]);
  const lineHeight = (regular.heightAtSize(11) + metrics.lineGap / metrics.unitsPerEm * 11) * layout.lineSpacing;
  let page: PDFPage;
  let y = height - margin;
  const newPage = () => { page = doc.addPage([width, height]); y = height - margin; };
  newPage();
  function ensure(space: number) { if (y - space < margin) newPage(); }
  function wrap(runs: ContractRun[], size: number, available = contentWidth): Word[][] {
    const words: Word[] = [];
    // Preserve run boundaries inside a word (e.g. quoted defined terms).
    for (const run of runs) {
      const font = run.bold ? bold : run.italic ? italic : regular;
      for (const token of run.text.match(/\S+|\s+/gu) || []) {
        if (/^\s+$/.test(token)) { if (words.length) words.push({ text: " ", font, width: font.widthOfTextAtSize(" ", size) }); continue; }
        const tokenWidth = font.widthOfTextAtSize(token, size);
        if (tokenWidth <= available) { words.push({ text: token, font, width: tokenWidth }); continue; }
        // Split pathological long identifiers so they cannot leave the printable area.
        let part = "";
        for (const char of token) {
          if (part && font.widthOfTextAtSize(part + char, size) > available) {
            words.push({ text: part, font, width: font.widthOfTextAtSize(part, size) }); part = "";
          }
          part += char;
        }
        if (part) words.push({ text: part, font, width: font.widthOfTextAtSize(part, size) });
      }
    }
    const lines: Word[][] = []; let line: Word[] = []; let used = 0;
    for (const word of words) {
      if (used + word.width > available && line.length) {
        while (line.at(-1)?.text === " ") line.pop();
        lines.push(line); line = []; used = 0;
      }
      if (!line.length && word.text === " ") continue;
      line.push(word); used += word.width;
    }
    while (line.at(-1)?.text === " ") line.pop();
    if (line.length) lines.push(line);
    return lines;
  }
  function drawLines(lines: Word[][], size: number, leading: number, align: "left" | "center" | "justify", x: number = margin, available = contentWidth) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]; const used = line.reduce((sum, w) => sum + w.width, 0);
      const spaces = line.filter(w => w.text === " ").length;
      const extra = align === "justify" && i < lines.length - 1 && spaces ? (available - used) / spaces : 0;
      let cursor = x + (align === "center" ? (available - used) / 2 : 0);
      for (const word of line) {
        if (word.text !== " ") page.drawText(word.text, { x: cursor, y: y - size, font: word.font, size, color: rgb(0, 0, 0) });
        cursor += word.width + (word.text === " " ? extra : 0);
      }
      y -= leading;
    }
  }
  function paragraph(runs: ContractRun[], options: { title?: boolean; heading?: boolean; keepHeight?: number; left?: boolean } = {}) {
    const size = options.title ? layout.titleSize : layout.fontSize;
    const leading = options.title ? lineHeight * size / 11 : lineHeight;
    const lines = wrap(runs, size);
    // Word collapses adjacent 6pt paragraph-after/heading-before spacing to 6pt.
    const before = 0;
    // Word allows paragraph-after spacing to fall beyond the bottom text margin.
    // Reserve it only when keeping this paragraph with the next block.
    ensure(before + lines.length * leading + (options.keepHeight ? layout.paragraphAfter + options.keepHeight : 0));
    y -= before;
    // Paragraphs are kept together, preventing orphan lines and split refund clauses.
    drawLines(lines, size, leading, options.title ? "center" : options.heading || options.left ? "left" : "justify");
    y -= layout.paragraphAfter;
  }
  paragraph([{ text: content.brand, bold: true }], { title: true, keepHeight: lineHeight * 4 });
  paragraph([{ text: content.title, bold: true }], { title: true, keepHeight: lineHeight * 3 });
  paragraph([{ text: `Reference: ${content.reference}${content.date ? `     Date: ${content.date}` : ""}` }], { left: true, keepHeight: lineHeight * 3 });
  const signatureWidth = contentWidth / 2 - 9;
  const signatureRows = content.signatures.map(s => [
    wrap([{ text: s.heading, bold: true }], 11, signatureWidth),
    wrap([{ text: "Signature: _______________________" }], 11, signatureWidth),
    wrap([{ text: `Name: ${s.name}` }], 11, signatureWidth),
    wrap([{ text: `Date: ${s.date || "__________________________"}` }], 11, signatureWidth),
  ]);
  const signatureHeights = [0, 1, 2, 3].map(i => Math.max(...signatureRows.map(rows => rows[i].length)) * lineHeight + (i === 0 ? 24 : layout.paragraphAfter));
  const signatureHeight = signatureHeights.reduce((a, b) => a + b, 0) + 6;
  for (const section of content.sections) {
    const acceptance = section.heading.startsWith("8.");
    const firstHeight = wrap(section.paragraphs[0].runs, 11).length * lineHeight + (acceptance ? layout.paragraphAfter : 0);
    paragraph([{ text: section.heading, bold: true }], { heading: true, keepHeight: firstHeight + (acceptance ? signatureHeight : 0) });
    for (const p of section.paragraphs) paragraph(p.runs, { keepHeight: acceptance ? signatureHeight : 0 });
  }
  ensure(signatureHeight); y -= 6;
  for (let i = 0; i < 4; i++) {
    const rowY = y;
    signatureRows.forEach((rows, column) => {
      y = rowY;
      drawLines(rows[i], 11, lineHeight, "left", margin + column * contentWidth / 2, signatureWidth);
    });
    y = rowY - signatureHeights[i];
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const text = `UniMondo | Agreement Reference ${content.reference} | Page ${i + 1} of ${pages.length}`;
    const size = Math.min(9, contentWidth / regular.widthOfTextAtSize(text, 1));
    p.drawText(text, { x: margin + (contentWidth - regular.widthOfTextAtSize(text, size)) / 2, y: 26, font: regular, size, color: rgb(0, 0, 0) });
  });
  return Buffer.from(await doc.save());
}
