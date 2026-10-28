import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { workflowAccess } from "./access";
import {
  canonical,
  type Resource,
  type Payload,
  type Workflow,
  type ContentRevision,
  type WorkflowView,
} from "./model";
export function publishingService() {
  const service = createSupabaseServiceClient();
  if (!service)
    throw new Error("Content publishing is temporarily unavailable.");
  return service;
}
export async function workflowState(resource: Resource): Promise<WorkflowView> {
  const { permissions } = await workflowAccess(resource);
  if (!permissions.view)
    throw new Error("You do not have permission to view this content.");
  const empty = {
    resource,
    ready: false,
    document: null,
    published: { tables: {} },
    history: [],
    permissions,
  } as WorkflowView;
  const service = publishingService();
  const settings = await service
    .from("cms_publishing_settings")
    .select("enabled")
    .eq("id", 1)
    .maybeSingle();
  if (settings.error || !settings.data)
    return {
      ...empty,
      error:
        "Private drafting needs the owner’s publishing setup. Existing public content remains unchanged; saving is disabled.",
    };
  const live = await service.rpc(
    "cms_content_snapshot",
    { t: resource.type, k: resource.key },
    { get: true },
  );
  if (live.error)
    return {
      ...empty,
      error: "The published content could not be loaded. Saving is disabled.",
    };
  const published = canonical(live.data as Payload),
    versions: Record<string, Record<string, string>> = {};
  for (const [table, rows] of Object.entries(published.tables)) {
    const pk = table === "site_content" ? "key" : "id";
    versions[table] = {};
    for (let offset = 0; offset < rows.length; offset += 100) {
      const result = await service
        .from(table)
        .select(pk + ",updated_at")
        .in(
          pk,
          rows.slice(offset, offset + 100).map((row) => row[pk]),
        );
      if (result.error)
        return {
          ...empty,
          error: "Current content versions could not be checked.",
        };
      for (const row of result.data ?? [])
        versions[table][
          String((row as unknown as Record<string, unknown>)[pk])
        ] = String((row as unknown as Record<string, unknown>).updated_at);
    }
  }

  if (!permissions.edit && !permissions.review && !permissions.publish)
    return {
      ...empty,
      ready: true,
      published,
      versions,
      publicationEnabled: Boolean(settings.data.enabled),
    };
  const read = await service
    .from("cms_content_workflows")
    .select("*")
    .eq("content_type", resource.type)
    .eq("record_key", resource.key)
    .maybeSingle();
  if (read.error)
    return {
      ...empty,
      error:
        "Private draft information could not be loaded. Reload before editing.",
    };
  const document = read.data as Workflow | null;
  const revisions = document
    ? await service
        .from("cms_content_revisions")
        .select(
          "id,document_id,revision_number,event,status,author_id,author_label,created_at,note",
        )
        .eq("document_id", document.id)
        .order("revision_number", { ascending: false })
        .limit(20)
    : { data: [], error: null };
  if (revisions.error)
    return { ...empty, error: "Revision history could not be loaded." };
  const baseline = document
    ? await service
        .from("cms_content_revisions")
        .select("proposed")
        .eq("document_id", document.id)
        .eq("revision_number", 0)
        .maybeSingle()
    : { data: null, error: null };
  if (baseline.error)
    return { ...empty, error: "Existing baseline could not be loaded." };
  return {
    resource,
    ready: true,
    publicationEnabled: Boolean(settings.data.enabled),
    document,
    published,
    history: (revisions.data ?? []) as ContentRevision[],
    versions,
    baseline: baseline.data?.proposed as Payload | undefined,
    permissions,
  };
}
