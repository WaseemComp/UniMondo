import type { AcademicKind } from "./model";
export type AcademicField = {
  path: string;
  label: string;
  section: string;
  type?:
    "textarea" | "image" | "number" | "date" | "select" | "checkbox" | "lines";
  options?: string[];
  hint?: string;
};
const fields = (section: string, items: Omit<AcademicField, "section">[]) =>
  items.map((field) => ({ ...field, section }));
export const ACADEMIC_FIELDS: Record<AcademicKind, AcademicField[]> = {
  countries: [
    ...fields("Destination information", [
      {
        path: "name",
        label: "Country name",
        hint: "Names used by other catalogue records or homepage selections are protected to preserve their references.",
      },
      {
        path: "slug",
        label: "Public page address",
        hint: "Existing addresses are preserved. For new destinations, use lowercase words separated by hyphens.",
      },
      { path: "flag_emoji", label: "Country flag" },
      { path: "description", label: "Introduction", type: "textarea" },
      { path: "why_study", label: "Why study here", type: "textarea" },
      { path: "catalogue.key_facts", label: "Key facts", type: "textarea" },
      {
        path: "catalogue.eligibility",
        label: "Eligibility guidance for international applicants",
        type: "textarea",
      },
      {
        path: "catalogue.image_url",
        label: "Destination image",
        type: "image",
      },
      { path: "catalogue.image_alt", label: "Image description" },
    ]),
    ...fields("Education, costs and scholarships", [
      {
        path: "destination_guide.overview.educationSystem",
        label: "Education system",
        type: "textarea",
      },
      {
        path: "destination_guide.overview.popularCitiesLifestyle",
        label: "Popular cities and lifestyle",
        type: "textarea",
      },
      {
        path: "destination_guide.overview.scholarships",
        label: "Scholarships",
        type: "textarea",
      },
      {
        path: "destination_guide.costs.tuitionBandNote",
        label: "Tuition information",
        type: "textarea",
      },
      { path: "living_cost", label: "Living costs" },
      {
        path: "destination_guide.costs.accommodation",
        label: "Accommodation",
        type: "textarea",
      },
      {
        path: "destination_guide.costs.foodTransport",
        label: "Food and transport",
        type: "textarea",
      },
      {
        path: "destination_guide.costs.proofOfFunds",
        label: "Required funds",
        type: "textarea",
      },
    ]),
    ...fields("Visa and university guidance", [
      {
        path: "visa_info",
        label: "General visa guidance",
        type: "textarea",
        hint: "Legacy guidance is retained; structured guidance below takes precedence where provided.",
      },
      {
        path: "destination_guide.visa.studentVisaType",
        label: "Student visa type",
      },
      {
        path: "destination_guide.visa.mainRequirements",
        label: "Visa requirements",
        type: "textarea",
      },
      {
        path: "destination_guide.visa.proofOfAdmission",
        label: "Proof of admission",
        type: "textarea",
      },
      {
        path: "destination_guide.visa.proofOfFunds",
        label: "Visa financial requirements",
        type: "textarea",
      },
      {
        path: "destination_guide.visa.insurance",
        label: "Health insurance",
        type: "textarea",
      },
      {
        path: "destination_guide.visa.accommodation",
        label: "Visa accommodation requirements",
        type: "textarea",
      },
      {
        path: "destination_guide.visa.embassyNote",
        label: "Embassy guidance",
        type: "textarea",
      },
      {
        path: "popular_unis",
        label: "Additional university names",
        type: "lines",
        hint: "One per line. Existing directory records remain separate and unchanged.",
      },
    ]),
    ...fields("Search engines and presentation", [
      { path: "catalogue.seo_title", label: "Search result title" },
      {
        path: "catalogue.seo_description",
        label: "Search result description",
        type: "textarea",
      },
      { path: "highlighted", label: "Priority destination", type: "checkbox" },
      { path: "sort_order", label: "Display order", type: "number" },
    ]),
  ],
  universities: [
    ...fields("Institution information", [
      {
        path: "name",
        label: "University name",
        hint: "Names used by existing programmes are protected to preserve their references.",
      },
      { path: "profile.location", label: "City or campus location" },
      {
        path: "profile.description",
        label: "Institution description",
        type: "textarea",
      },
      { path: "profile.official_url", label: "Official university website" },
      { path: "prestige_line", label: "Public introduction", type: "textarea" },
      {
        path: "qs_label",
        label: "Published ranking label",
        hint: "Only enter an approved, sourced ranking. Leave blank if unknown.",
      },
      { path: "flag_emoji", label: "Country flag" },
    ]),
    ...fields("Images and public presentation", [
      { path: "hero_image_url", label: "University image", type: "image" },
      { path: "hero_image_alt", label: "Image description" },
      { path: "logo_url", label: "University logo", type: "image" },
      { path: "logo_initials", label: "Initials shown without a logo" },
      { path: "apply_program_summary", label: "Application link description" },
      { path: "sort_order", label: "Display order", type: "number" },
    ]),
  ],
  programmes: [
    ...fields("Programme information", [
      { path: "title", label: "Programme title" },
      {
        path: "degree",
        label: "Degree level",
        type: "select",
        options: ["bachelor", "master", "doctorate", "other"],
      },
      { path: "details.discipline", label: "Academic discipline" },
      {
        path: "details.teaching_language",
        label: "Teaching language",
        hint: "Prioritise confirmed English-taught options. Do not assume a language for new records.",
      },
      { path: "details.duration", label: "Duration" },
      { path: "details.ects", label: "ECTS credits" },
      { path: "description", label: "Programme description", type: "textarea" },
    ]),
    ...fields("Tuition and funding", [
      {
        path: "tuition_range",
        label: "Public tuition information",
        hint: "Include currency and fee period. Leave blank when unconfirmed.",
      },
      {
        path: "details.tuition_amount",
        label: "Tuition amount (if officially known)",
        type: "number",
      },
      {
        path: "details.currency",
        label: "Currency",
        type: "select",
        options: [
          "",
          "EUR",
          "GBP",
          "USD",
          "CAD",
          "AUD",
          "CHF",
          "SEK",
          "NOK",
          "PLN",
          "Other",
        ],
      },
      {
        path: "details.scholarships",
        label: "Scholarship information",
        type: "textarea",
      },
    ]),
    ...fields("Admissions and requirements", [
      { path: "intake", label: "Intake" },
      {
        path: "details.admission_status",
        label: "Admission status",
        type: "select",
        options: ["unknown", "open", "closed", "upcoming"],
      },
      { path: "details.opens_on", label: "Applications open", type: "date" },
      { path: "deadline", label: "Applications close", type: "date" },
      {
        path: "details.eligibility",
        label: "Eligibility criteria",
        type: "textarea",
      },
      {
        path: "details.academic_requirements",
        label: "Academic requirements",
        type: "textarea",
      },
      {
        path: "details.language_requirements",
        label: "Language requirements",
        type: "textarea",
      },
      {
        path: "details.entrance_tests",
        label: "Entrance examinations or mandatory tests",
        type: "textarea",
      },
      {
        path: "details.non_eu_guidance",
        label: "Guidance for non-EU applicants",
        type: "textarea",
      },
    ]),
    ...fields("Sources and verification", [
      { path: "details.official_url", label: "Official programme page" },
      { path: "details.application_url", label: "Official application page" },
      {
        path: "details.verification",
        label: "Information status",
        type: "select",
        options: ["unverified", "incomplete", "verified"],
      },
      {
        path: "details.verified_on",
        label: "Last checked against official information",
        type: "date",
      },
      {
        path: "logo_url",
        label: "Programme or university logo",
        type: "image",
      },
      { path: "logo_text", label: "Initials shown without a logo" },
      { path: "sort_order", label: "Display order", type: "number" },
    ]),
  ],
};
