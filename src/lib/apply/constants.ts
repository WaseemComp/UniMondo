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
