import JSZip from "jszip";
import PDFDocument from "pdfkit";
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

function writePdfSection(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  lines: Array<[string, string] | string>
) {
  doc.font("Helvetica-Bold").fontSize(12).text(title);
  doc.moveDown(0.35);
  doc.font("Helvetica").fontSize(10);

  for (const line of lines) {
    if (typeof line === "string") {
      doc.text(line);
      continue;
    }
    const [label, value] = line;
    doc.text(`${label}: ${value || "—"}`);
  }

  doc.moveDown(0.8);
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

export async function buildApplicationPdfBuffer(
  record: ApplicationRecord,
  context?: ExportContext
): Promise<Buffer> {
  const exportContext = context ?? (await buildExportContext(record));
  const type = (record.applicationType ?? "university") as ApplicationType;
  const personal = record.formData?.personalInfo ?? record.payload.personalInfo;
  const academic = record.formData?.academicInfo ?? {};
  const prefs = record.formData?.studyPreferences ?? record.payload.programPreferences;
  const programLevel = asString(prefs.programLevel);
  const levelLabel =
    programLevel && programLevel in PROGRAM_LEVEL_LABELS
      ? PROGRAM_LEVEL_LABELS[programLevel as keyof typeof PROGRAM_LEVEL_LABELS]
      : programLevel || "—";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(18).text("UniMondo Application Form", { align: "center" });
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(11).text(applicationTypeLabel(type), { align: "center" });
    doc.moveDown(1);

    writePdfSection(doc, "Application summary", [
      ["Tracking ID", record.trackingId],
      ["Submitted", new Date(record.submittedAt).toLocaleString()],
      ["Screening", record.screeningTag],
      ["Review status", record.reviewStatus],
      ["Filing status", record.pipelineStatus ?? "submitted"],
    ]);

    writePdfSection(doc, "1. Personal information", [
      ["Full name", asString(personal.fullName)],
      ["Email", asString(personal.email)],
      ["Phone", asString(personal.phone)],
      ["Date of birth", asString(personal.dateOfBirth)],
      ["Nationality", asString(personal.nationality)],
    ]);

    if (type === "university") {
      writePdfSection(doc, "2. Academic information", [
        ["Highest qualification", asString(academic.highestQualification) || record.payload.academicBackground.highestQualification],
        ["Institution", asString(academic.institutionName) || record.payload.academicBackground.institutionName],
        ...academicResultLines(record),
        ["IELTS score", String(asNumber(academic.ieltsScore) ?? record.payload.academicBackground.ieltsScore)],
        ...graduationLines(record),
      ]);

      const rawDestinations = Array.isArray((prefs as Record<string, unknown>).destinations)
        ? ((prefs as Record<string, unknown>).destinations as Array<{ rank?: number; country?: string }>)
        : null;
      const destinations = rawDestinations
        ? rawDestinations
            .map((d) => `#${d.rank ?? "?"} ${asString(d.country)}`)
            .filter((line) => line !== "#? ")
            .join(" · ")
        : record.payload.programPreferences.destinationChoices
            .map((d) => `#${d.rank} ${d.country}`)
            .join(" · ");

      writePdfSection(doc, "3. Study preferences", [
        ["Intake", asString(prefs.intake) || record.payload.programPreferences.intake],
        ["Program level", levelLabel],
        ["Preferred region", asString(prefs.preferredContinent) || record.payload.programPreferences.preferredContinent],
        ["Destinations", destinations || "—"],
        ["Program / field of interest", asString(prefs.programInterest) || record.payload.programPreferences.programInterest],
        ["Notes", asString(prefs.notes) || record.payload.programPreferences.notes || "—"],
      ]);
    } else {
      doc.font("Helvetica-Bold").fontSize(12).text("Submission details");
      doc.moveDown(0.35);
      doc.font("Helvetica").fontSize(10);
      doc.text(JSON.stringify(record.payload.submission?.data ?? {}, null, 2), {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });
      doc.moveDown(0.8);
    }

    writePdfSection(doc, "4. Support package", [
      ["Package", exportContext.packageName],
      ["Package slug", exportContext.packageSlug],
      [
        "Add-ons",
        exportContext.addonNames.length ? exportContext.addonNames.join(", ") : "None selected",
      ],
    ]);

    if (record.payload.sourceCountry || record.payload.sourceProgram) {
      writePdfSection(doc, "Apply source", [
        ["Source country", record.payload.sourceCountry ?? "—"],
        ["Source program", record.payload.sourceProgram ?? "—"],
      ]);
    }

    writePdfSection(
      doc,
      "5. Uploaded documents",
      record.documents.length
        ? record.documents.map(
            (document, index) =>
              `${index + 1}. ${document.name} (${docCategoryLabel(document.category)}${
                document.description?.trim() ? ` — ${document.description}` : ""
              })`
          )
        : ["No files attached."]
    );

    doc.end();
  });
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
