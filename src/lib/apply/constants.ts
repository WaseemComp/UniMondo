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
