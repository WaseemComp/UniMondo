import { z } from "zod";
import { english } from "@/lib/homepage/content";
import { coursesPageCopy } from "@/lib/site-copy";
export const PRICE_TABLES = {
  courses: "language_courses",
  packages: "packages",
  addons: "add_ons",
} as const;
export type PriceKind = keyof typeof PRICE_TABLES;
export const SOURCE_COURSE_KEYS = ["ielts", "german", "italianFrench"] as const;
export const sourceCourseId = (key: string) =>
  `c4700000-0000-4000-8000-${String(SOURCE_COURSE_KEYS.indexOf(key as (typeof SOURCE_COURSE_KEYS)[number]) + 1).padStart(12, "0")}`;
export function sourceCourseRows() {
  return SOURCE_COURSE_KEYS.map((key) => ({
    id: sourceCourseId(key),
    source_key: key,
    title: { en: coursesPageCopy.cards[key].title },
    description: { en: coursesPageCopy.cards[key].description },
    price: null,
    currency_code: null,
    is_active: true,
    sort_order: 0,
    archived_at: null,
    sourceDefault: true,
  }));
}
export function courseText(value: unknown): string {
  return (
    english(value) ||
    (Object.values(value && typeof value === "object" ? value : {}).find(
      (v) => typeof v === "string" && v.trim(),
    ) as string) ||
    ""
  );
}
export const displayTitle = (row: Record<string, unknown>) =>
  courseText(row.title) || String(row.name || row.label || "Untitled");
const money = z.number().finite().nonnegative().nullable();
export const priceRowSchema = z.object({
  id: z.string().uuid(),
  currency_code: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  sort_order: z.number().int().min(0).max(100000),
  archived_at: z.string().datetime().nullable(),
});
export function validatePriceRow(
  kind: PriceKind,
  row: Record<string, unknown>,
) {
  priceRowSchema.parse(row);
  const title = displayTitle(row);
  if (title === "Untitled" || !title.trim() || title.length > 250)
    throw new Error("Enter a title of up to 250 characters.");
  if (kind === "courses") {
    money.parse(row.price);
    if (
      row.source_key != null &&
      !SOURCE_COURSE_KEYS.includes(
        row.source_key as (typeof SOURCE_COURSE_KEYS)[number],
      )
    )
      throw new Error("Unknown existing course card.");
    if (typeof row.is_active !== "boolean")
      throw new Error("Choose course visibility.");
  } else {
    z.number().finite().nonnegative().parse(row.price_full);
    if (kind === "packages")
      z.array(z.string().max(2000)).max(100).parse(row.features);
    money.parse(row.price_installment);
    if (!/^[a-z0-9-]{1,150}$/.test(String(row.slug || "")))
      throw new Error(
        "Use an existing or unique page reference with lowercase letters, numbers and hyphens.",
      );
    if (typeof row.is_published !== "boolean")
      throw new Error("Choose package visibility.");
  }
  if (row.archived_at && row[kind === "courses" ? "is_active" : "is_published"])
    throw new Error("Archived records must be hidden.");
  for (const key of [
    "description",
    "teaser",
    "best_for",
    "duration",
    "country",
    "city",
  ]) {
    const value =
      key === "description" && kind === "courses"
        ? english(row[key])
        : row[key];
    if (value != null && (typeof value !== "string" || value.length > 10000))
      throw new Error("Text is too long or invalid.");
  }
}
