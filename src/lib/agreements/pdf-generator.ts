import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AgreementRecord } from "../../types/agreement";
import {
  AGREEMENT_LAYOUT as layout,
  agreementDocument,
  usesStandardAgreement,
  type ContractRun,
} from "./document-content";
import { generateLegacyAgreementPdf } from "./legacy-pdf-generator";
import { generateAgreementPdf as generateV3 } from "./v3-pdf-generator";
type Fragment = { text: string; font: PDFFont; width: number };
type Word = Fragment[];

/** Flow the shared saved contract through the existing PDF engine, without fragmenting styled words. */
export async function generateAgreementPdf(
  record: AgreementRecord,
): Promise<Buffer> {
  if (!usesStandardAgreement(record)) return generateLegacyAgreementPdf(record);
  const content = agreementDocument(record);
  if (content.version === "3.0") return generateV3(record);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const data = [
    "times-new-roman.ttf",
    "times-new-roman-bold.ttf",
    "times-new-roman-italic.ttf",
  ].map((file) =>
    fs.readFileSync(path.join(process.cwd(), "templates/fonts", file)),
  );
  const [regular, bold, italic] = await Promise.all(
    data.map((bytes) => doc.embedFont(bytes, { subset: true })),
  );
  const { width, height, margin } = layout,
    available = width - 2 * margin;
  const metrics = fontkit.create(data[0]);
  const leading =
    (regular.heightAtSize(11) + (metrics.lineGap / metrics.unitsPerEm) * 11) *
    layout.lineSpacing;
  let page!: PDFPage,
    y = height - margin;
  const newPage = () => {
    page = doc.addPage([width, height]);
    y = height - margin;
  };
  const ensure = (space: number) => {
    if (y - space < margin) newPage();
  };
  newPage();
  function wrap(
    runs: ContractRun[],
    size = 11,
    span = available,
  ): Fragment[][] {
    const words: Word[] = [];
    let word: Word = [];
    const flush = () => {
      if (word.length) {
        words.push(word);
        word = [];
      }
    };
    for (const run of runs) {
      const font = run.bold ? bold : run.italic ? italic : regular;
      for (const token of run.text.match(/\S+|\s+/gu) ?? []) {
        if (/^\s+$/.test(token)) {
          flush();
          continue;
        }
        // Only exceptionally long identifiers split; adjacent styled fragments stay one word.
        for (const char of token) {
          if (
            word.reduce((sum, f) => sum + f.width, 0) +
              font.widthOfTextAtSize(char, size) >
            span
          )
            flush();
          const last = word.at(-1);
          if (last?.font === font) {
            last.text += char;
            last.width = font.widthOfTextAtSize(last.text, size);
          } else
            word.push({
              text: char,
              font,
              width: font.widthOfTextAtSize(char, size),
            });
        }
      }
    }
    flush();
    const lines: Fragment[][] = [];
    let line: Fragment[] = [],
      used = 0;
    const space: Fragment = {
      text: " ",
      font: regular,
      width: regular.widthOfTextAtSize(" ", size),
    };
    for (const parts of words) {
      const wordWidth = parts.reduce((sum, f) => sum + f.width, 0);
      if (line.length && used + space.width + wordWidth > span) {
        lines.push(line);
        line = [];
        used = 0;
      }
      if (line.length) {
        line.push(space);
        used += space.width;
      }
      line.push(...parts);
      used += wordWidth;
    }
    if (line.length) lines.push(line);
    return lines;
  }
  function line(
    parts: Fragment[],
    size: number,
    align: "left" | "center" | "right" | "justify",
    x: number = margin,
    span = available,
  ) {
    const used = parts.reduce((sum, f) => sum + f.width, 0),
      spaces = parts.filter((f) => f.text === " ").length;
    const extra = align === "justify" && spaces ? (span - used) / spaces : 0;
    let cursor =
      x +
      (align === "center"
        ? (span - used) / 2
        : align === "right"
          ? span - used
          : 0);
    for (const f of parts) {
      if (f.text !== " ")
        page.drawText(f.text, {
          x: cursor,
          y: y - size,
          font: f.font,
          size,
          color: rgb(0, 0, 0),
        });
      cursor += f.width + (f.text === " " ? extra : 0);
    }
  }
  function paragraph(
    runs: ContractRun[],
    options: {
      title?: boolean;
      heading?: boolean;
      left?: boolean;
      keep?: number;
    } = {},
  ) {
    const size = options.title ? 14 : 11,
      step = (leading * size) / 11,
      lines = wrap(runs, size);
    ensure(Math.min(2, lines.length) * step + (options.keep ?? 0));
    let at = 0;
    while (at < lines.length) {
      let count = Math.min(
        lines.length - at,
        Math.floor((y - margin + 0.01) / step),
      );
      if (count < lines.length - at && lines.length - at - count === 1) count--;
      if (count < Math.min(2, lines.length - at)) {
        newPage();
        continue;
      }
      for (let i = 0; i < count; i++) {
        const last = at === lines.length - 1;
        line(
          lines[at++],
          size,
          options.title
            ? "center"
            : options.heading || options.left || last
              ? "left"
              : "justify",
        );
        y -= step;
      }
      if (at < lines.length) newPage();
    }
    y -= layout.paragraphAfter;
  }
  paragraph([{ text: content.brand, bold: true }], {
    title: true,
    keep: leading * 5,
  });
  paragraph([{ text: content.title, bold: true }], {
    title: true,
    keep: leading * 4,
  });
  paragraph([{ text: `Agreement Reference: ${content.reference}` }], {
    left: true,
    keep: leading * 3,
  });
  paragraph([{ text: `Date: ${content.date}` }], {
    left: true,
    keep: leading * 2,
  });
  const columnStarts = [margin, margin + available * layout.signatureSplit];
  const columnWidths = [
    available * layout.signatureSplit - 9,
    available * (1 - layout.signatureSplit) - 9,
  ];
  const signatureRows = content.signatures.map((s, column) => [
    wrap([{ text: s.heading, bold: true }], 11, columnWidths[column]),
    wrap([{ text: "Signature" }], 11, columnWidths[column]),
    wrap([{ text: `Name: ${s.name}` }], 11, columnWidths[column]),
    wrap(
      [
        {
          text: s.designation
            ? `Designation: ${s.designation}`
            : (s.identity ?? ""),
        },
      ],
      11,
      columnWidths[column],
    ),
    wrap([{ text: `Date: ${s.date}` }], 11, columnWidths[column]),
  ]);
  const rowHeights = [0, 1, 2, 3, 4].map(
    (i) =>
      Math.max(...signatureRows.map((rows) => rows[i].length)) * leading +
      layout.paragraphAfter +
      (i === 0 ? layout.signatureSpace + 2 : 0),
  );
  const signatureHeight =
    rowHeights.reduce((sum, h) => sum + h, 0) + layout.stampSpace + 12;
  if (signatureHeight > height - 2 * margin - leading * 5)
    throw new Error(
      "Signature details are too long. Shorten them before exporting.",
    );
  for (const section of content.sections) {
    if (section.heading.startsWith("8."))
      ensure(
        signatureHeight +
          wrap(section.paragraphs[0].runs).length * leading +
          layout.paragraphAfter +
          leading +
          layout.paragraphAfter,
      );
    // A three-line opening paragraph cannot split 2/1 under widow control.
    // Reserve all three lines so its heading cannot be stranded above a page break.
    const openingLines = wrap(section.paragraphs[0].runs).length;
    paragraph([{ text: section.heading, bold: true }], {
      heading: true,
      keep:
        (openingLines === 3 ? 3 : Math.min(2, openingLines)) * leading +
        layout.paragraphAfter,
    });
    for (const p of section.paragraphs) paragraph(p.runs);
    if (section.financialTable) {
      const rows = [
          section.financialTable.headers,
          ...section.financialTable.rows,
        ],
        widths = [279.5, 90, available - 369.5];
      const cells = rows.map((row, i) =>
        row.map((text, j) =>
          wrap([{ text, bold: i === 0 || i === 3 }], 11, widths[j] - 10),
        ),
      );
      const heights = cells.map(
        (row) =>
          Math.max(...row.map((lines) => lines.length)) * leading +
          layout.tablePadding * 2,
      );
      ensure(heights.reduce((sum, h) => sum + h, 0) + layout.paragraphAfter);
      cells.forEach((row, i) => {
        const top = y;
        let x = margin;
        row.forEach((lines, j) => {
          y = top - layout.tablePadding;
          for (const parts of lines) {
            line(
              parts,
              11,
              j === 2 ? "right" : j === 1 ? "center" : "left",
              x + 5,
              widths[j] - 10,
            );
            y -= leading;
          }
          page.drawRectangle({
            x,
            y: top - heights[i],
            width: widths[j],
            height: heights[i],
            borderWidth: 0.5,
            borderColor: rgb(0, 0, 0),
          });
          x += widths[j];
        });
        y = top - heights[i];
      });
      y -= layout.paragraphAfter;
    }
  }
  ensure(signatureHeight);
  for (let i = 0; i < 5; i++) {
    const top = y;
    signatureRows.forEach((rows, column) => {
      y = top;
      for (const parts of rows[i]) {
        line(parts, 11, "left", columnStarts[column], columnWidths[column]);
        y -= leading;
      }
      if (i === 0)
        page.drawLine({
          start: {
            x: columnStarts[column],
            y: top - rowHeights[0] + 8,
          },
          end: {
            x: columnStarts[column] + 99.2,
            y: top - rowHeights[0] + 8,
          },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });
    });
    y = top - rowHeights[i];
  }
  y -= layout.stampSpace;
  page.drawLine({
    start: { x: width / 2 - 49.6, y },
    end: { x: width / 2 + 49.6, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  y -= 4;
  line(wrap([{ text: "Official Stamp of UniMondo" }], 6)[0], 6, "center");
  doc.getPages().forEach((p, i) => {
    const text = `UniMondo | Agreement Reference ${content.reference} | Page ${i + 1} of ${doc.getPageCount()}`;
    const size = Math.min(9, available / regular.widthOfTextAtSize(text, 1));
    p.drawText(text, {
      x: margin + (available - regular.widthOfTextAtSize(text, size)) / 2,
      y: 26,
      font: regular,
      size,
      color: rgb(0, 0, 0),
    });
  });
  return Buffer.from(await doc.save());
}
