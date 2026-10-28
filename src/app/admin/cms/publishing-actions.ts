"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { hasAdminPermission } from "@/lib/auth/permissions";
import {
  resourceSchema,
  restorePayload,
  type Resource,
  type WorkflowView,
} from "@/lib/publishing/model";
import { workflowAccess, workflowIdentity, requireRestorationAccess } from "@/lib/publishing/access";
import { workflowState, publishingService } from "@/lib/publishing/store";
import { validateProposed } from "@/lib/publishing/validation";
export async function readContentWorkflow(
  input: unknown,
): Promise<WorkflowView> {
  return workflowState(resourceSchema.parse(input));
}
const transitionSchema = z
  .object({
    resource: resourceSchema,
    version: z.number().int().positive(),
    action: z.enum([
      "submit",
      "approve",
      "request_changes",
      "reject",
      "return_to_draft",
      "discard",
      "publish",
      "restore",
    ]),
    note: z.string().trim().max(1500).default(""),
    revisionId: z.string().uuid().optional(),
    approvedRevisionId: z.string().uuid().nullable().optional(),
  })
  .strict();
export async function transitionContent(
  input: unknown,
): Promise<{ ok: true; view: WorkflowView } | { ok: false; error: string }> {
  try {
    const v = transitionSchema.parse(input),
      access = await workflowAccess(v.resource),
      view = await workflowState(v.resource),
      d = view.document;
    if (!view.ready || !d || d.version !== v.version)
      throw new Error("This content changed. Reload before continuing.");
    if (
      v.action === "approve" ||
      v.action === "request_changes" ||
      v.action === "reject"
    ) {
      if (!access.permissions.review)
        throw new Error("Content review permission is required.");
      if (
        v.action === "approve" &&
        !access.permissions.isSuper &&
        d.last_editor_id === access.user.id
      )
        throw new Error(
          "Another authorized reviewer must approve your changes.",
        );
    } else if (v.action === "publish") {
      if (!access.permissions.publish)
        throw new Error("Content publication permission is required.");
      if (v.approvedRevisionId !== d.approved_revision_id)
        throw new Error("This approval is stale. Reload before publishing.");
      if (v.resource.type !== "home") {
        const table =
          v.resource.type === "universities"
            ? "featured_universities"
            : v.resource.type === "programmes"
              ? "programs"
              : "countries";
        if (
          d.proposed.tables[table]?.[0]?.archived_at &&
          !(await hasAdminPermission(
            access.user,
            v.resource.type === "countries"
              ? "countries.delete"
              : "universities.delete",
          ))
        )
          throw new Error(
            "Archiving permission is required to publish this withdrawal.",
          );
      }
    } else if (!access.permissions.edit)
      throw new Error("Content editing permission is required.");
    if (["submit", "approve", "publish"].includes(v.action))
      await validateProposed(
        v.resource,
        d.proposed,
        access.user,
        view.published,
      );
    const service = publishingService();
    if (v.action === "restore") {
      if (["in_review", "approved"].includes(d.status))
        throw new Error(
          "Return the current version to Draft before restoring history.",
        );
      const historic = await service
        .from("cms_content_revisions")
        .select("*")
        .eq("document_id", d.id)
        .eq("id", v.revisionId ?? "")
        .single();
      const revision = historic.data;
      if (historic.error || !revision)
        throw new Error("Choose an available revision.");
      const proposed = restorePayload(revision.proposed, view.published);
      await requireRestorationAccess(v.resource, view.published, proposed, access.user);
      await validateProposed(v.resource, proposed, access.user, view.published);
      const saved = await service.rpc("cms_content_save_draft", {
        t: v.resource.type,
        k: v.resource.key,
        p_title: d.title,
        p_expected: d.version,
        p_base: view.published,
        p_proposed: proposed,
        p_actor: access.user.id,
        p_label: access.label,
      });
      if (saved.error) throw new Error(saved.error.message);
    } else {
      const result = await service.rpc("cms_content_transition", {
        p_id: d.id,
        p_expected: d.version,
        p_action: v.action,
        p_actor: access.user.id,
        p_label: access.label,
        p_note: v.note,
        p_revision: v.approvedRevisionId ?? null,
      });
      if (result.error) throw new Error(result.error.message);
    }
    if (v.action === "publish") {
      for (const path of [
        "/",
        "/destinations",
        "/current-openings",
        "/programs",
        "/admin/home",
        "/admin/destinations/countries",
        "/admin/universities",
        "/admin/programs",
        "/admin/content/ticker",
      ])
        revalidatePath(path);
      revalidatePath("/destinations/[countrySlug]", "page");
      if (v.resource.type === "home" && v.resource.key === "ticker")
        revalidatePath("/", "layout");
    }
    revalidatePath("/admin/publishing");
    const confirmation = await workflowState(v.resource);
    if (!confirmation.ready)
      throw new Error(
        "The action may have completed, but confirmation is unavailable. Reload before retrying.",
      );
    return { ok: true, view: confirmation };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The content action could not be confirmed. Reload before retrying.",
    };
  }
}
export async function listContentWorkflows() {
  const identity = await workflowIdentity();
  const service = publishingService(),
    { data, error } = await service
      .from("cms_content_workflows")
      .select(
        "content_type,record_key,title,status,owner_label,updated_at,version",
      )
      .order("updated_at", { ascending: false })
      .limit(500);
  if (error) return { ready: false, rows: [] };
  const rows = [];
  for (const row of data ?? []) {
    const access = await workflowAccess(
      {
        type: row.content_type,
        key: row.record_key,
      } as Resource,
      identity,
    );
    if (
      access.permissions.view &&
      (access.permissions.edit ||
        access.permissions.review ||
        access.permissions.publish)
    )
      rows.push(row);
  }
  return { ready: true, rows };
}

export async function readEarlierContentRevisions(input: unknown) {
  const v = z
      .object({ resource: resourceSchema, before: z.number().int().positive() })
      .strict()
      .parse(input),
    view = await workflowState(v.resource);
  if (
    !view.document ||
    !view.ready ||
    (!view.permissions.edit &&
      !view.permissions.review &&
      !view.permissions.publish)
  )
    throw new Error("Private history access is denied.");
  const result = await publishingService()
    .from("cms_content_revisions")
    .select(
      "id,document_id,revision_number,event,status,author_id,author_label,created_at,note",
    )
    .eq("document_id", view.document.id)
    .lt("revision_number", v.before)
    .order("revision_number", { ascending: false })
    .limit(20);
  if (result.error) throw new Error("Earlier history could not be loaded.");
  return result.data as import("@/lib/publishing/model").ContentRevision[];
}

export async function readContentRevision(input: unknown) {
  const v = z
      .object({ resource: resourceSchema, id: z.string().uuid() })
      .strict()
      .parse(input),
    view = await workflowState(v.resource);
  if (
    !view.document ||
    !view.ready ||
    (!view.permissions.edit &&
      !view.permissions.review &&
      !view.permissions.publish)
  )
    throw new Error("Private revision access is denied.");
  const result = await publishingService()
    .from("cms_content_revisions")
    .select("*")
    .eq("document_id", view.document.id)
    .eq("id", v.id)
    .single();
  if (result.error || !result.data)
    throw new Error("This revision could not be loaded.");
  return result.data as import("@/lib/publishing/model").ContentRevision & {
    previous: import("@/lib/publishing/model").Payload;
    proposed: import("@/lib/publishing/model").Payload;
  };
}
