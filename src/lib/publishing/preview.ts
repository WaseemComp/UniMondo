import type { HomepageEditorData } from "@/lib/admin/homepage-editor";
import type { AcademicRow } from "@/lib/academic/model";
import {
  TABLE_FOR,
  belongs,
  rowsFor,
  projectedRows,
  type WorkflowView,
  isWorking,
} from "./model";
export function homepageWorkflowPreview(
  data: HomepageEditorData,
  view: WorkflowView,
  published = false,
): HomepageEditorData {
  const privateVersion = !published && isWorking(view.document),
    payload = privateVersion ? view.document!.proposed : view.published,
    version = view.document?.version ?? 0;
  const source = (table: string): Record<string, unknown>[] =>
    privateVersion
      ? projectedRows(payload, table, version)
      : rowsFor(payload, table).map((row) => ({
          ...row,
          updated_at: view.versions?.[table]?.[String(row.id ?? row.key)] ?? "",
        }));
  const site = { ...data.site };
  for (const key of Object.keys(site))
    if (belongs(view.resource, "site_content", { key })) delete site[key];
  for (const row of source("site_content"))
    site[String(row.key)] = String(row.value ?? "");
  const blocks = [
    ...data.blocks.filter(
      (row) =>
        !belongs(view.resource, "cms_content_blocks", {
          ...row,
          page_slug: "home",
        }),
    ),
    ...(source(
      "cms_content_blocks",
    ) as unknown as HomepageEditorData["blocks"]),
  ];
  if (view.resource.key !== "testimonials") return { ...data, site, blocks };
  const rows = source(
    "success_stories",
  ) as unknown as HomepageEditorData["editableStories"]["rows"];
  return {
    ...data,
    site,
    blocks,
    editableStories: { rows, available: true },
    stories: rows
      .filter((row) => row.is_published)
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 6),
  };
}
export function academicWorkflowRow(view: WorkflowView, published = false) {
  const payload =
      !published && isWorking(view.document)
        ? view.document!.proposed
        : view.published,
    table = TABLE_FOR[view.resource.type as keyof typeof TABLE_FOR],
    row = rowsFor(payload, table)[0];
  if (!row) return undefined;
  return {
    ...row,
    updated_at:
      !published && isWorking(view.document)
        ? `draft:${view.document!.version}`
        : (view.versions?.[table]?.[String(row.id)] ?? ""),
  } as AcademicRow;
}
