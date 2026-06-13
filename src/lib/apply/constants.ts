/** Maximum size per application attachment (2048 KB = 2 MB). */
export const APPLICATION_ATTACHMENT_MAX_KB = 2048;
export const APPLICATION_ATTACHMENT_MAX_BYTES = APPLICATION_ATTACHMENT_MAX_KB * 1024;

export function attachmentExceedsMaxSize(sizeInBytes: number): boolean {
  return sizeInBytes > APPLICATION_ATTACHMENT_MAX_BYTES;
}

/** Friendly prompt shown when a single attachment exceeds the size limit. */
export function formatOversizedAttachmentPrompt(fileName: string, sizeInBytes?: number): string {
  const sizePart = sizeInBytes != null ? ` (${Math.round(sizeInBytes / 1024)} KB)` : "";
  return `"${fileName}"${sizePart} is larger than ${APPLICATION_ATTACHMENT_MAX_KB} KB (2 MB). Please reduce its file size and attach it again. Your other form details are saved.`;
}

/** Friendly prompt when one or more attachments exceed the size limit. */
export function formatOversizedAttachmentsPrompt(
  files: Array<{ name: string; sizeInBytes?: number }>
): string {
  if (files.length === 1) {
    return formatOversizedAttachmentPrompt(files[0].name, files[0].sizeInBytes);
  }

  const names = files.map((file) => file.name).join(", ");
  return `These files are larger than ${APPLICATION_ATTACHMENT_MAX_KB} KB (2 MB): ${names}. Please reduce each file's size and attach them again. Your other form details are saved.`;
}

export const DOCUMENT_CATEGORIES = [
  "educational_certificates",
  "language_certificates",
  "extracurricular_certificates",
  "recommendation_letters",
  "passport",
  "photo",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  educational_certificates: "Educational Certificates",
  language_certificates: "Language Certificates",
  extracurricular_certificates: "Extracurricular Certificates",
  recommendation_letters: "Recommendation Letters",
  passport: "Passport",
  photo: "Photo",
};

export const PROGRAM_LEVEL_VALUES = ["bachelors_undergraduate", "masters_postgraduate"] as const;
export type ProgramLevelValue = (typeof PROGRAM_LEVEL_VALUES)[number];

export const PROGRAM_LEVEL_LABELS: Record<ProgramLevelValue, string> = {
  bachelors_undergraduate: "Bachelors / Undergraduate",
  masters_postgraduate: "Masters / Post Graduate",
};

export const DESTINATION_OPTIONS = [
  "Italy",
  "Germany",
  "France",
  "Spain",
  "Netherlands",
  "Poland",
  "Ireland",
  "Sweden",
  "Norway",
  "Finland",
  "Austria",
  "Belgium",
  "Denmark",
  "Hungary",
] as const;
