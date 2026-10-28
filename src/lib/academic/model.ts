import { z } from "zod";
import { safeDestination } from "@/lib/homepage/validation";
export const PRIORITY_COUNTRIES = [
  "Italy",
  "Germany",
  "France",
  "Spain",
  "Austria",
  "Croatia",
  "Ireland",
  "Finland",
  "Sweden",
  "Netherlands",
  "Poland",
  "Norway",
];
export type AcademicKind = "countries" | "universities" | "programmes";
export const TABLES = {
  countries: "countries",
  universities: "featured_universities",
  programmes: "programs",
} as const;
export type AcademicRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
};
export type CataloguePermissions = Record<
  AcademicKind,
  Record<"view" | "create" | "edit" | "publish" | "delete", boolean>
>;
export type CatalogueData = {
  countries: AcademicRow[];
  universities: AcademicRow[];
  programmes: AcademicRow[];
  regions: { id: number; label: string }[];
  permissions: CataloguePermissions;
  ready: boolean;
  error?: string;
};
export const text = (value: unknown): string =>
  typeof value === "string" ? value : "";
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const prose = z
  .string()
  .trim()
  .max(15000)
  .refine(
    (s) => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s),
    "Use plain text without markup",
  );
const line = prose.pipe(z.string().max(600));
const url = line.refine(
  (s) => !s || (s.startsWith("https://") && safeDestination(s)),
  "Use a secure https:// address",
);
const image = line;
const date = z
  .string()
  .refine(
    (s) =>
      !s ||
      (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
        !Number.isNaN(Date.parse(s)) &&
        new Date(s).toISOString().slice(0, 10) === s),
    "Use a valid calendar date",
  );
export const countryExtraSchema = z
  .object({
    image_url: image.optional(),
    image_alt: line.optional(),
    eligibility: prose.optional(),
    key_facts: prose.optional(),
    seo_title: line.optional(),
    seo_description: line.optional(),
  })
  .strip();
export const universityExtraSchema = z
  .object({
    location: line.optional(),
    description: prose.optional(),
    official_url: url.optional(),
  })
  .strip();
export const programmeExtraSchema = z
  .object({
    discipline: line.optional(),
    teaching_language: line.optional(),
    duration: line.optional(),
    ects: line.optional(),
    tuition_amount: z
      .union([z.number().finite().min(0).max(10000000), z.null()])
      .optional(),
    currency: z
      .string()
      .refine(
        (value) =>
          value === "" || value === "Other" || /^[A-Z]{3}$/.test(value),
        "Choose a valid currency.",
      )
      .optional(),
    admission_status: z
      .enum(["unknown", "open", "closed", "upcoming"])
      .optional(),
    opens_on: date.optional(),
    eligibility: prose.optional(),
    academic_requirements: prose.optional(),
    language_requirements: prose.optional(),
    entrance_tests: prose.optional(),
    scholarships: prose.optional(),
    official_url: url.optional(),
    application_url: url.optional(),
    verification: z.enum(["unverified", "incomplete", "verified"]).optional(),
    verified_on: date.optional(),
    non_eu_guidance: prose.optional(),
  })
  .strip();
const guideGroup = z.record(z.string().max(80), prose);
export const countryValues = z
  .object({
    name: line.pipe(z.string().min(1)),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    flag_emoji: line,
    description: prose,
    why_study: prose,
    living_cost: line,
    visa_info: prose,
    popular_unis: z.array(line).max(150),
    region_group_id: z.number().int().positive(),
    highlighted: z.boolean(),
    sort_order: z.number().int().min(0).max(100000),
    is_published: z.boolean(),
    destination_guide: z
      .object({
        overview: guideGroup.optional(),
        costs: guideGroup.optional(),
        visa: guideGroup.optional(),
      })
      .strict(),
    catalogue: countryExtraSchema,
  })
  .strict();
export const universityValues = z
  .object({
    name: line.pipe(z.string().min(1)),
    country_id: z.string().uuid().nullable(),
    country: line,
    flag_emoji: line,
    prestige_line: prose,
    qs_label: line,
    hero_image_url: image,
    hero_image_alt: line,
    logo_url: image,
    logo_initials: line,
    programs: z
      .array(z.object({ name: line, tuition_range: line }).passthrough())
      .max(200),
    apply_program_summary: line,
    is_published: z.boolean(),
    sort_order: z.number().int().min(0).max(100000),
    profile: universityExtraSchema,
  })
  .strict();
export const programmeValues = z
  .object({
    title: line.pipe(z.string().min(1)),
    university_id: z.string().uuid().nullable(),
    university: line,
    country: line,
    degree: z.enum(["bachelor", "master", "doctorate", "other"]),
    intake: line,
    deadline: date,
    tuition_range: line,
    description: prose,
    logo_url: image,
    logo_text: line,
    continent: line,
    region: line,
    is_published: z.boolean(),
    sort_order: z.number().int().min(0).max(100000),
    details: programmeExtraSchema,
  })
  .strict();
export const academicInput = z
  .object({
    kind: z.enum(["countries", "universities", "programmes"]),
    id: z.string().min(1).max(200).optional(),
    expectedUpdatedAt: z.string().nullable(),
    operation: z.enum(["save", "archive", "restore"]).default("save"),
    values: z.unknown(),
    currencyChangeConfirmed: z.boolean().optional(),
  })
  .strict();
export function rowTitle(kind: AcademicKind, row: AcademicRow) {
  return text(kind === "programmes" ? row.title : row.name);
}
export function status(row: AcademicRow) {
  return row.archived_at
    ? "Archived"
    : row.is_published === false
      ? "Hidden"
      : "Published";
}
export function filterAcademic(
  rows: AcademicRow[],
  kind: AcademicKind,
  search: string,
  country: string,
  state: string,
  degree: string,
) {
  const q = search.trim().toLocaleLowerCase();
  return rows.filter(
    (row) =>
      (!q ||
        [
          rowTitle(kind, row),
          row.country,
          row.university,
          object(row.profile).location,
          object(row.details).discipline,
        ]
          .map(text)
          .join(" ")
          .toLocaleLowerCase()
          .includes(q)) &&
      (!country || row.country === country || row.name === country) &&
      (!state || status(row) === state) &&
      (!degree || row.degree === degree),
  );
}
