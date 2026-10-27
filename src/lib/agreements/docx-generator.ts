import fs from "fs";
import path from "path";
import JSZip from "jszip";
import type { AgreementRecord } from "../../types/agreement";
import { agreementDocument, usesStandardAgreement, type ContractRun } from "./document-content";
import { generateLegacyAgreementDocx } from "./legacy-docx-generator";

const escapeXml = (value: string) => value.replace(/[&<>"\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || ""));

/** Keep the existing OOXML package workflow; all live wording comes from one saved structure. */
export async function generateAgreementDocx(record: AgreementRecord): Promise<Buffer> {
  if (!usesStandardAgreement(record)) return generateLegacyAgreementDocx(record);
  const content = agreementDocument(record);
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(process.cwd(), "templates/UniMondo_Agreement_Standard.docx")));
  const run = (r: ContractRun, size = 22) => `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b w:val="${r.bold ? 1 : 0}"/><w:i w:val="${r.italic ? 1 : 0}"/><w:color w:val="000000"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
  const paragraph = (runs: ContractRun[], options: { title?: boolean; heading?: boolean; keep?: boolean; left?: boolean; before?: number; after?: number } = {}) =>
    `<w:p><w:pPr><w:pStyle w:val="${options.title ? "Title" : "Normal"}"/><w:keepNext w:val="${options.heading || options.keep ? 1 : 0}"/><w:keepLines/><w:widowControl/><w:contextualSpacing w:val="0"/><w:spacing w:before="${options.before ?? (options.heading ? 100 : 0)}" w:after="${options.after ?? 100}" w:line="276" w:lineRule="auto"/><w:jc w:val="${options.title ? "center" : options.heading || options.left ? "left" : "both"}"/></w:pPr>${runs.map(r => run({ ...r, bold: options.title || options.heading || r.bold }, options.title ? 28 : 22)).join("")}</w:p>`;
  let body = paragraph([{ text: content.brand }], { title: true, keep: true }) +
    paragraph([{ text: content.title }], { title: true, keep: true }) +
    paragraph([{ text: `Reference: ${content.reference}${content.date ? `     Date: ${content.date}` : ""}` }], { left: true, keep: true });
  for (const section of content.sections) {
    body += paragraph([{ text: section.heading }], { heading: true, keep: true });
    section.paragraphs.forEach((p, i) => {
      body += paragraph(p.runs, { keep: section.heading.startsWith("8.") && i === section.paragraphs.length - 1 });
    });
  }
  // Keep four paired rows together, so wrapped names cannot misalign the dates.
  const width = 4945;
  const signatureRows = [
    content.signatures.map(s => [{ text: s.heading, bold: true }]),
    content.signatures.map(() => [{ text: "Signature: _______________________" }]),
    content.signatures.map(s => [{ text: `Name: ${s.name}` }]),
    content.signatures.map(s => [{ text: `Date: ${s.date || "__________________________"}` }]),
  ];
  const signatureTable = signatureRows.map((row, i) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${row.map(runs => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>${paragraph(runs, { left: true, keep: i < signatureRows.length - 1, before: i === 0 ? 120 : 0, after: i === 0 ? 480 : 100 })}</w:tc>`).join("")}</w:tr>`).join("");
  body += `<w:tbl><w:tblPr><w:tblW w:w="9890" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tblCellMar><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(side => `<w:${side} w:val="nil"/>`).join("")}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${width}"/><w:gridCol w:w="${width}"/></w:tblGrid>${signatureTable}</w:tbl>`;
  // Word requires a paragraph after a table; a normal-height one can create a blank last page.
  body += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
  const xml = await zip.file("word/document.xml")!.async("text");
  const section = `<w:sectPr><w:footerReference w:type="default" r:id="rId8"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1008" w:right="1008" w:bottom="1008" w:left="1008" w:header="360" w:footer="480" w:gutter="0"/><w:pgNumType w:start="1"/></w:sectPr>`;
  zip.file("word/document.xml", xml.replace(/<w:body>[\s\S]*<\/w:body>/, () => `<w:body>${body}${section}</w:body>`));
  const field = (name: string) => `<w:fldSimple w:instr="${name}">${run({ text: "1" }, 18)}</w:fldSimple>`;
  zip.file("word/footer1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>${run({ text: `UniMondo | Agreement Reference ${content.reference} | Page ` }, 18)}${field("PAGE")}${run({ text: " of " }, 18)}${field("NUMPAGES")}</w:p></w:ftr>`);
  const settings = await zip.file("word/settings.xml")!.async("text");
  // The source's unused built-in Title style carries a blue bottom border.
  // Remove it when assigning the title role; run/paragraph formatting above is explicitly black.
  const styles = await zip.file("word/styles.xml")!.async("text");
  zip.file("word/styles.xml", styles.replace(/<w:style\b[^>]*w:styleId="Title"[^>]*>[\s\S]*?<\/w:style>/g,
    style => style.replace(/<w:pBdr>[\s\S]*?<\/w:pBdr>/g, "")));
  zip.file("word/settings.xml", settings.replace(/<w:updateFields[^>]*\/>/g, "").replace("</w:settings>", '<w:updateFields w:val="true"/></w:settings>'));
  return zip.generateAsync({ type: "nodebuffer" });
}
