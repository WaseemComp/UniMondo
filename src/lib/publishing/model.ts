import { z } from "zod";
import { footerSchema, restoreFooter } from "@/lib/footer/model";
import { HOME_SECTIONS } from "@/lib/homepage/content";
export const resourceSchema = z
  .object({
    type: z.enum([
      "home",
      "countries",
      "universities",
      "programmes",
      "regions",
      "courses",
      "packages",
      "addons",
    ]),
    key: z.string().min(1).max(150),
  })
  .strict()
  .refine(
    (value) =>
      value.type !== "home" ||
      [
        ...HOME_SECTIONS.map((section) => section.id),
        "ticker",
        "footer",
        "hero_slides",
        "why_stats",
        "testimonials",
      ].includes(value.key),
    "Choose an existing homepage section",
  );
export type Resource = z.infer<typeof resourceSchema>;
export type ContentRow = Record<string, unknown>;
export type Payload = { tables: Record<string, ContentRow[]> };
export type WorkflowStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "archived"
  | "discarded";
export type Workflow = {
  id: string;
  content_type: Resource["type"];
  record_key: string;
  title: string;
  status: WorkflowStatus;
  version: number;
  owner_id: string;
  owner_label: string;
  last_editor_id: string;
  updated_by: string;
  updated_label: string;
  updated_at: string;
  approved_revision_id: string | null;
  base: Payload;
  proposed: Payload;
  note: string;
  published_revision_id: string | null;
};
export type ContentRevision = {
  id: string;
  document_id: string;
  revision_number: number;
  event: string;
  status: WorkflowStatus;
  author_id: string;
  author_label: string;
  created_at: string;
  previous?: Payload;
  proposed?: Payload;
  note: string;
};
export type WorkflowGrants = {
  view: boolean;
  edit: boolean;
  review: boolean;
  publish: boolean;
  isSuper: boolean;
};
export type WorkflowView = {
  resource: Resource;
  ready: boolean;
  publicationEnabled?: boolean;
  error?: string;
  document: Workflow | null;
  published: Payload;
  history: ContentRevision[];
  baseline?: Payload;
  versions?: Record<string, Record<string, string>>;
  permissions: WorkflowGrants;
};
export const TABLE_FOR = {
  countries: "countries",
  universities: "featured_universities",
  programmes: "programs",
  regions: "region_groups",
  courses: "language_courses",
  packages: "packages",
  addons: "add_ons",
} as const;
export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
  discarded: "Draft discarded",
};
export const rowsFor = (payload: Payload, table: string) =>
  payload.tables[table] ?? [];
export const isWorking = (document: Workflow | null) =>
  Boolean(
    document &&
    ["draft", "in_review", "changes_requested", "approved"].includes(
      document.status,
    ),
  );
export function belongs(resource: Resource, table: string, row: ContentRow) {
  if (resource.type === "regions")
    return (
      resource.key === "catalogue" &&
      ["region_groups", "countries"].includes(table)
    );
  if (resource.type !== "home")
    return (
      table === TABLE_FOR[resource.type] && String(row.id) === resource.key
    );
  if (table === "site_content")
    return resource.key === "hero"
      ? String(row.key).startsWith("home.hero.")
      : resource.key === "ticker" && String(row.key).startsWith("home.ticker.");
  if (table === "success_stories") return resource.key === "testimonials";
  if (table === "news_ticker_items" || table === "site_settings")
    return resource.key === "ticker";
  return (
    table === "cms_content_blocks" &&
    row.page_slug === "home" &&
    (resource.key === "hero_slides"
      ? row.section_key === "hero_slider"
      : resource.key === "why_stats"
        ? row.section_key === "why_unimondo" &&
          row.block_key === "collection_why_stats"
        : row.section_key === resource.key &&
          !(
            resource.key === "why_unimondo" &&
            row.block_key === "collection_why_stats"
          ))
  );
}
export function cleanRow(row: ContentRow) {
  const result = { ...row };
  delete result.updated_at;
  delete result.created_at;
  if (result.archived_at)
    result.archived_at = new Date(String(result.archived_at)).toISOString();
  return result;
}
export function canonical(payload: Payload): Payload {
  return {
    tables: Object.fromEntries(
      Object.keys(payload.tables)
        .sort()
        .map((table) => [
          table,
          payload.tables[table].map(cleanRow).sort((a, b) => {
            const x = String(a.id ?? a.key),
              y = String(b.id ?? b.key);
            return x < y ? -1 : x > y ? 1 : 0;
          }),
        ]),
    ),
  };
}
export function projectedRows(
  payload: Payload,
  table: string,
  version: number,
) {
  return rowsFor(payload, table).map((row) => ({
    ...row,
    updated_at: `draft:${version}`,
  }));
}
export function restorePayload(previous: Payload, current: Payload): Payload {
  previous = structuredClone(previous);
  const earlierFooter = rowsFor(previous, "cms_content_blocks").find(
    (row) => row.section_key === "footer" && row.block_key === "configuration",
  );
  const currentFooter = rowsFor(current, "cms_content_blocks").find(
    (row) => row.section_key === "footer" && row.block_key === "configuration",
  );
  const a = footerSchema.safeParse(
      (earlierFooter?.content as { footer?: unknown })?.footer,
    ),
    b = footerSchema.safeParse(
      (currentFooter?.content as { footer?: unknown })?.footer,
    );
  if (earlierFooter && a.success && b.success)
    earlierFooter.content = {
      ...(earlierFooter.content as Record<string, unknown>),
      footer: restoreFooter(a.data, b.data),
    };
  const result: Payload = { tables: {} };
  for (const table of Object.keys(current.tables)) {
    const now = rowsFor(current, table),
      historical = rowsFor(previous, table).map((row) => {
        if (table !== "cms_content_blocks") return row;
        const match = now.find(
          (value) =>
            value.section_key === row.section_key &&
            value.block_key === row.block_key &&
            value.sort_order === row.sort_order,
        );
        return match ? { ...row, id: match.id } : row;
      }),
      key = table === "site_content" ? "key" : "id";
    result.tables[table] = historical.map((row) => {
      const latest = now.find((value) => value[key] === row[key]);
      const merged: ContentRow =
        table === "countries" && current.tables.region_groups
          ? {
              ...latest,
              region_group_id: row.region_group_id,
              sort_order: row.sort_order,
            }
          : { ...latest, ...row };
      if (table === "cms_content_blocks") {
        const content = merged.content as Record<string, unknown> | undefined,
          latestContent = latest?.content as
            Record<string, unknown> | undefined;
        if (
          Array.isArray(content?.items) &&
          Array.isArray(latestContent?.items)
        ) {
          const retained = latestContent.items
            .filter(
              (item) =>
                !(content.items as ContentRow[]).some(
                  (old: ContentRow) =>
                    (old as ContentRow).id === (item as ContentRow).id,
                ),
            )
            .map((item: ContentRow) => ({ ...item, archived: true }));
          merged.content = {
            ...content,
            items: [...content.items, ...retained],
          };
        }
      }
      return merged;
    });
    for (const row of now)
      if (!historical.some((old) => old[key] === row[key])) {
        if (table === "site_content") continue;
        if (table === "countries" && current.tables.region_groups) {
          result.tables[table].push(row);
          continue;
        }
        result.tables[table].push({
          ...row,
          ...(["cms_content_blocks", "language_courses"].includes(table)
            ? { is_active: false }
            : { is_published: false }),
        });
      }
    // Site values introduced later must be explicitly retained (no deletion of legacy keys).
    if (table === "site_content")
      for (const row of now)
        if (!historical.some((old) => old[key] === row[key]))
          result.tables[table].push(row);
  }
  return canonical(result);
}
