import { ACADEMIC_FIELDS } from "@/lib/academic/fields";
import { contentLabel } from "@/lib/homepage/content";
import { type Payload, type ContentRow } from "./model";
export type ContentDifference = {
  label: string;
  before: string;
  after: string;
  image: boolean;
};
const labels: Record<string, string> = {
  brandName: "Company name", logoUrl: "Branding image", logoAlt: "Image description",
  copyright: "Copyright line", href: "Link destination", kind: "Contact type", text: "Notice text",
  is_published: "Public visibility",
  is_active: "Section visibility",
  archived_at: "Archived",
  sort_order: "Display order",
  imageUrl: "Image",
  imageAlt: "Image description",
  profile_image_url: "Student image",
  full_name: "Student’s public name",
  ctaExplore: "Primary button text",
  ctaApply: "Secondary button text",
  buttonText: "Primary button text",
  secondaryButtonText: "Secondary button text",
  primaryHref: "Primary button destination",
  secondaryHref: "Secondary button destination",
  visible: "Visibility",
  reference: "Featured selection",
  recordType: "Item type",
  title: "Title",
  subtitle: "Description",
  line: "Caption",
  eyebrow: "Introductory label",
  icon: "Icon",
  value: "Value",
  key: "Website field",
  logo_url: "Logo",
  hero_image_url: "University image",
};
for (const fields of Object.values(ACADEMIC_FIELDS))
  for (const field of fields) {
    labels[field.path] = field.label;
    labels[field.path.split(".").at(-1)!] ??= field.label;
  }
function flattened(payload: Payload) {
  const result = new Map<
    string,
    { label: string; value: string; raw: string; image: boolean }
  >();
  for (const [table, rows] of Object.entries(payload.tables))
    for (const row of rows) {
      const identity = String(row.id ?? row.key),
        title = String(
          row.title ??
            row.name ??
            row.full_name ??
            (row.key
              ? contentLabel(String(row.key))
              : (row.section_key ?? "Homepage content")),
        );
      const walk = (value: unknown, path: string, label: string) => {
        const leaf = path.split(".").at(-1)!;
        if (
          [
            "id",
            "created_at",
            "updated_at",
            "page_slug",
            "section_key",
            "block_key",
            "block_type",
            "country_id",
            "university_id",
          ].includes(leaf)
        )
          return;
        if (Array.isArray(value)) {
          value.forEach((item, index) =>
            walk(item, `${path}.${index}`, `${label} · item ${index + 1}`),
          );
          return;
        }
        if (value && typeof value === "object") {
          for (const [key, item] of Object.entries(value as ContentRow))
            walk(item, path ? path + "." + key : key, label);
          return;
        }
        let display =
          value == null
            ? "Not set"
            : typeof value === "boolean"
              ? value
                ? "Yes"
                : "No"
              : String(value);
        if (leaf === "reference")
          display = String(row.title || "Existing catalogue selection");
        const field =
          labels[path] ??
          labels[leaf] ??
          leaf.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
        result.set(`${table}:${identity}:${path}`, {
          label: `${title} · ${label ? label + " · " : ""}${field}`,
          value: display,
          raw: JSON.stringify(value) ?? "undefined",
          image:
            /image|photo|logo|background/i.test(leaf) && display !== "Not set",
        });
      };
      walk(row, "", "");
    }
  return result;
}
export function compareContent(
  before: Payload,
  after: Payload,
): ContentDifference[] {
  const a = flattened(before),
    b = flattened(after);
  return [...new Set([...a.keys(), ...b.keys()])].flatMap((key) => {
    const old = a.get(key),
      next = b.get(key);
    return old?.raw === next?.raw
      ? []
      : [
          {
            label: next?.label ?? old!.label,
            before: old?.value ?? "Not present",
            after:
              next?.value === old?.value && old?.raw !== next?.raw
                ? "Different selected catalogue record"
                : (next?.value ?? "Not present"),
            image: Boolean(old?.image || next?.image),
          },
        ];
  });
}

// Baseline rows are private snapshots of the actual inherited defaults captured
// on first save. Missing storage overrides therefore compare as effective content.
export function withBaselineDefaults(
  stored: Payload,
  baseline: Payload,
): Payload {
  const tables: Record<string, ContentRow[]> = {};
  for (const table of new Set([
    ...Object.keys(stored.tables),
    ...Object.keys(baseline.tables),
  ])) {
    const rows = stored.tables[table] ?? [],
      defaults = baseline.tables[table] ?? [];
    const same = (a: ContentRow, b: ContentRow) =>
      table === "site_content"
        ? a.key === b.key
        : table === "cms_content_blocks"
          ? a.section_key === b.section_key &&
            a.block_key === b.block_key &&
            a.sort_order === b.sort_order
          : a.id === b.id;
    tables[table] = [
      ...rows,
      ...defaults.filter((row) => !rows.some((item) => same(item, row))),
    ];
  }
  return { tables };
}
