import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  DOCUMENT_CATEGORY_LABELS,
  PROGRAM_LEVEL_LABELS,
  type DocumentCategory,
} from "@/lib/apply/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationRecord, ApplicationType } from "@/types/application";

type ExportContext = {
  packageName: string;
  packageSlug: string;
  addonNames: string[];
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;

type PdfWriter = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
  pageWidth: number;
  pageHeight: number;
};

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function docCategoryLabel(category: string | undefined) {
  if (!category) return "Document";
  return DOCUMENT_CATEGORY_LABELS[category as DocumentCategory] ?? category.replace(/_/g, " ");
}

function safeFilePart(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim();
}

function applicationTypeLabel(type: ApplicationType): string {
  switch (type) {
    case "university":
      return "University Application";
    case "language_course":
      return "Language Course Application";
    case "work_with_us":
      return "Work With Us Submission";
    case "join_us":
      return "Join Us Submission";
    default:
      return "Application";
  }
}

function pdfFilename(record: ApplicationRecord): string {
  const studentName = safeFilePart(record.payload.personalInfo.fullName || "Applicant");
  return `${record.trackingId} - Application form - ${studentName}.pdf`;
}

async function createPdfWriter(): Promise<PdfWriter> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage(A4);
  const { width, height } = page.getSize();
  return { doc, page, font, boldFont, y: height - MARGIN, pageWidth: width, pageHeight: height };
}

function ensureSpace(writer: PdfWriter, needed: number) {
  if (writer.y - needed >= MARGIN) return;
  writer.page = writer.doc.addPage(A4);
  writer.y = writer.pageHeight - MARGIN;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawLines(
  writer: PdfWriter,
  lines: string[],
  opts?: { bold?: boolean; size?: number; indent?: number; gap?: number }
) {
  const size = opts?.size ?? 10;
  const font = opts?.bold ? writer.boldFont : writer.font;
  const indent = opts?.indent ?? 0;
  const gap = opts?.gap ?? 4;
  const maxWidth = writer.pageWidth - MARGIN * 2 - indent;

  for (const rawLine of lines) {
    for (const line of wrapText(rawLine, font, size, maxWidth)) {
      ensureSpace(writer, size + gap);
      writer.page.drawText(line, {
        x: MARGIN + indent,
        y: writer.y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
      writer.y -= size + gap;
    }
  }
}

function drawSection(writer: PdfWriter, title: string, lines: Array<[string, string] | string>) {
  drawLines(writer, [title], { bold: true, size: 12, gap: 6 });
  writer.y -= 2;

  for (const line of lines) {
    if (typeof line === "string") {
      drawLines(writer, [line]);
      continue;
    }
    const [label, value] = line;
    drawLines(writer, [`${label}: ${value || "—"}`]);
  }

  writer.y -= 8;
}

async function resolveAddonNames(addonIds: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(addonIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const supabase = createSupabaseServerClient();
  if (!supabase) return uniqueIds;

  const { data, error } = await supabase.from("add_ons").select("id,name").in("id", uniqueIds);
  if (error || !data?.length) return uniqueIds;

  const byId = new Map(data.map((row) => [String(row.id), String(row.name)]));
  return uniqueIds.map((id) => byId.get(id) ?? id);
}

async function buildExportContext(record: ApplicationRecord): Promise<ExportContext> {
  const packageSelection = record.payload.packageSelection;
  const addonIds = [
    ...(packageSelection?.addonIds ?? []),
    ...(record.formData?.selectedAddonIds ?? []),
  ];

  const addonNames = await resolveAddonNames(addonIds);

  return {
    packageName: packageSelection?.packageName || record.formData?.selectedPackageSlug || "—",
    packageSlug: packageSelection?.packageSlug || record.formData?.selectedPackageSlug || "—",
    addonNames,
  };
}

function buildPackageSummary(record: ApplicationRecord, context: ExportContext): string {
  const lines = [
    `Tracking ID: ${record.trackingId}`,
    `Submitted: ${new Date(record.submittedAt).toLocaleString()}`,
    `Applicant: ${record.payload.personalInfo.fullName}`,
    "",
    "Support package",
    `Name: ${context.packageName}`,
    `Slug: ${context.packageSlug}`,
    "",
    "Selected add-ons",
  ];

  if (!context.addonNames.length) {
    lines.push("None");
  } else {
    for (const name of context.addonNames) {
      lines.push(`- ${name}`);
    }
  }

  return lines.join("\n");
}

function academicResultLines(record: ApplicationRecord): Array<[string, string]> {
  const academic = record.formData?.academicInfo ?? {};
  const fallback = record.payload.academicBackground;
  const gradeType = asString(academic.gradeType);

  if (gradeType === "percentage") {
    const percentage = asNumber(academic.obtainedPercentage);
    return [
      ["Result format", "Percentage"],
      ["Obtained percentage", percentage != null ? `${percentage}%` : "—"],
    ];
  }

  if (gradeType === "gpa") {
    const obtained = asNumber(academic.obtainedGpa);
    const scale = asNumber(academic.totalGpaScale);
    return [
      ["Result format", "GPA"],
      ["Obtained GPA", obtained != null ? String(obtained) : "—"],
      ["Total GPA scale", scale != null ? String(scale) : "—"],
    ];
  }

  return [["Result (normalized to 4.0 scale)", fallback.gpa.toFixed(2)]];
}

function graduationLines(record: ApplicationRecord): Array<[string, string]> {
  const academic = record.formData?.academicInfo ?? {};
  const graduated = asBoolean(academic.graduated);

  if (graduated === true) {
    return [["Graduation date", asString(academic.graduationDate) || "—"]];
  }
  if (graduated === false) {
    return [["Expected graduation date", asString(academic.expectedGraduationDate) || "—"]];
  }

  return [["Graduation year", record.payload.academicBackground.graduationYear || "—"]];
}

function destinationLines(record: ApplicationRecord, prefs: Record<string, unknown>): string[] {
  const rawDestinations = Array.isArray(prefs.destinations)
    ? (prefs.destinations as Array<{ rank?: number; country?: string }>)
    : null;

  if (rawDestinations?.length) {
    return rawDestinations.map((d) => `Destination #${d.rank ?? "?"}: ${asString(d.country) || "—"}`);
  }

  return record.payload.programPreferences.destinationChoices.map(
    (d) => `Destination #${d.rank}: ${d.country}`
  );
}

function submissionDetailLines(record: ApplicationRecord): Array<[string, string] | string> {
  const data = record.payload.submission?.data;
  if (!data || typeof data !== "object") {
    return [["Details", "—"]];
  }

  const payload = data as Record<string, unknown>;
  const contact =
    payload.contact && typeof payload.contact === "object"
      ? (payload.contact as Record<string, unknown>)
      : null;

  const contactLines: Array<[string, string]> = contact
    ? [
        ["Full name", asString(contact.fullName)],
        ["Email", asString(contact.email)],
        ["Phone", asString(contact.phone)],
      ]
    : [];

  switch (record.applicationType) {
    case "language_course":
      return [
        ...contactLines,
        ["Country", asString(payload.country)],
        ["City", asString(payload.city)],
        ["Course duration", asString(payload.duration)],
        ["Notes", asString(payload.notes)],
      ];
    case "work_with_us":
      return [
        ...contactLines,
        ["Role / area of interest", asString(payload.role)],
        ["LinkedIn", asString(payload.linkedin)],
        ["Notes", asString(payload.notes)],
      ];
    case "join_us":
      return [
        ["Organization", asString(payload.organization)],
        ...contactLines,
        ["Country", asString(payload.country)],
        ["Message", asString(payload.message)],
      ];
    default:
      return Object.entries(payload).flatMap(([key, value]) => {
        if (key === "contact" && value && typeof value === "object") {
          return Object.entries(value as Record<string, unknown>).map(
            ([contactKey, contactValue]) =>
              [`Contact — ${contactKey}`, asString(contactValue)] as [string, string]
          );
        }
        if (typeof value === "object") {
          return [[`${key}`, JSON.stringify(value)]];
        }
        return [[`${key}`, asString(value)]];
      });
  }
}

export async function buildApplicationPdfBuffer(
  record: ApplicationRecord,
  context?: ExportContext
): Promise<Buffer> {
  const exportContext = context ?? (await buildExportContext(record));
  const type = (record.applicationType ?? "university") as ApplicationType;
  const personal = record.formData?.personalInfo ?? record.payload.personalInfo;
  const academic = record.formData?.academicInfo ?? {};
  const prefs = (record.formData?.studyPreferences ?? record.payload.programPreferences) as Record<
    string,
    unknown
  >;
  const programLevel = asString(prefs.programLevel);
  const levelLabel =
    programLevel && programLevel in PROGRAM_LEVEL_LABELS
      ? PROGRAM_LEVEL_LABELS[programLevel as keyof typeof PROGRAM_LEVEL_LABELS]
      : programLevel || "—";

  const writer = await createPdfWriter();

  drawLines(writer, ["UniMondo Application Form"], { bold: true, size: 18, gap: 8 });
  drawLines(writer, [applicationTypeLabel(type)], { size: 11, gap: 10 });
  writer.y -= 6;

  drawSection(writer, "Application summary", [
    ["Tracking ID", record.trackingId],
    ["Submitted", new Date(record.submittedAt).toLocaleString()],
    ["Screening", record.screeningTag],
    ["Review status", record.reviewStatus],
    ["Filing status", record.pipelineStatus ?? "submitted"],
  ]);

  drawSection(writer, "1. Personal information", [
    ["Full name", asString(personal.fullName)],
    ["Email", asString(personal.email)],
    ["Phone", asString(personal.phone)],
    ["Date of birth", asString(personal.dateOfBirth)],
    ["Nationality", asString(personal.nationality)],
  ]);

  if (type === "university") {
    drawSection(writer, "2. Academic information", [
      [
        "Highest qualification",
        asString(academic.highestQualification) || record.payload.academicBackground.highestQualification,
      ],
      [
        "Institution",
        asString(academic.institutionName) || record.payload.academicBackground.institutionName,
      ],
      ...academicResultLines(record),
      [
        "IELTS score",
        String(asNumber(academic.ieltsScore) ?? record.payload.academicBackground.ieltsScore),
      ],
      ...graduationLines(record),
    ]);

    const destinations = destinationLines(record, prefs);
    drawSection(writer, "3. Study preferences", [
      ["Intake", asString(prefs.intake) || record.payload.programPreferences.intake],
      ["Program level", levelLabel],
      [
        "Preferred region",
        asString(prefs.preferredContinent) || record.payload.programPreferences.preferredContinent,
      ],
      ...destinations,
      [
        "Program / field of interest",
        asString(prefs.programInterest) || record.payload.programPreferences.programInterest,
      ],
      ["Notes", asString(prefs.notes) || record.payload.programPreferences.notes || "—"],
    ]);

    drawSection(writer, "4. Support package", [
      ["Package", exportContext.packageName],
      ["Package slug", exportContext.packageSlug],
      [
        "Add-ons",
        exportContext.addonNames.length ? exportContext.addonNames.join(", ") : "None selected",
      ],
    ]);
  } else {
    drawSection(writer, "2. Submission details", submissionDetailLines(record));
  }

  if (record.payload.sourceCountry || record.payload.sourceProgram) {
    drawSection(writer, "Apply source", [
      ["Source country", record.payload.sourceCountry ?? "—"],
      ["Source program", record.payload.sourceProgram ?? "—"],
    ]);
  }

  drawSection(
    writer,
    type === "university" ? "5. Uploaded documents" : "3. Uploaded documents",
    record.documents.length
      ? record.documents.map(
          (document, index) =>
            `${index + 1}. ${document.name} (${docCategoryLabel(document.category)}${
              document.description?.trim() ? ` — ${document.description}` : ""
            })`
        )
      : ["No files attached."]
  );

  const pdfBytes = await writer.doc.save();
  return Buffer.from(pdfBytes);
}

async function fetchDocumentBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function buildApplicationZipBuffer(record: ApplicationRecord): Promise<Buffer> {
  const context = await buildExportContext(record);
  const zip = new JSZip();
  const root = zip.folder(record.trackingId);
  if (!root) {
    throw new Error("Failed to create archive folder.");
  }

  const pdfBuffer = await buildApplicationPdfBuffer(record, context);
  root.file(pdfFilename(record), pdfBuffer);
  root.file(`${record.trackingId} - Package and add-ons.txt`, buildPackageSummary(record, context));

  const attachments = root.folder("attachments");
  if (!attachments) {
    throw new Error("Failed to create attachments folder.");
  }

  const usedNames = new Map<string, number>();

  for (const [index, document] of record.documents.entries()) {
    const category = safeFilePart(document.category ?? "documents");
    const baseName = safeFilePart(document.name || `file-${index + 1}`);
    const count = usedNames.get(`${category}/${baseName}`) ?? 0;
    usedNames.set(`${category}/${baseName}`, count + 1);
    const fileName = count > 0 ? `${count + 1}-${baseName}` : baseName;
    const zipPath = `${category}/${fileName}`;

    const buffer = await fetchDocumentBuffer(document.url);
    if (buffer) {
      attachments.file(zipPath, buffer);
    } else {
      attachments.file(
        `${category}/${fileName}.missing.txt`,
        `Could not download: ${document.url}`
      );
    }
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export function zipDownloadFilename(record: ApplicationRecord): string {
  return `${record.trackingId}.zip`;
}

export { pdfFilename };
