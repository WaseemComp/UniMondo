"use server";
import { planDraft } from "@/lib/publishing/planning";
import { resourceSchema } from "@/lib/publishing/model";
import { isDeepStrictEqual } from "node:util";
import { revalidateContentPath as revalidatePath } from "@/lib/publishing/planning";
import { requireAdminUser } from "@/app/admin/require-admin";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createContentServiceClient as createSupabaseServiceClient } from "@/lib/publishing/planning";
import {
  readHomepageSnapshot,
  type HomepageSnapshot,
} from "@/lib/admin/homepage-editor";
import { loadHomepageReferences } from "@/lib/admin/homepage-catalogue";
import {
  COLLECTIONS,
  presentationBlock,
  resolveCollection,
  type CollectionId,
} from "@/lib/homepage/items";
import {
  collectionInputSchema,
  presentationInputSchema,
  validateItems,
  validatePresentation,
} from "@/lib/homepage/item-validation";
import { record, type SectionId } from "@/lib/homepage/content";
import { getMediaAccess } from "@/lib/media/access";
import { validateManagedMediaSelection } from "@/lib/media/operations";
type Result =
  { ok: true; snapshot: HomepageSnapshot } | { ok: false; error: string };
async function writeBlock(
  section: SectionId,
  key: string,
  expected: string | null,
  content: object,
  before: HomepageSnapshot,
): Promise<Result> {
  const service = createSupabaseServiceClient();
  if (!service) return { ok: false, error: "Content saving is unavailable." };
  const current = before.blocks.find(
    (b) =>
      b.section_key === section && b.block_key === key && b.sort_order === 0,
  );
  if ((current?.updated_at ?? null) !== expected)
    return {
      ok: false,
      error: "This content changed in another session. Reload before saving.",
    };
  const row = {
    page_slug: "home",
    section_key: section,
    block_key: key,
    block_type: "homepage_collection",
    sort_order: 0,
    is_active: true,
    content: { ...record(current?.content), ...content },
    media: record(current?.media),
  };
  // A singleton sort=0 uses the existing unique constraint. Concurrent first saves cannot duplicate collections.
  const query = current
    ? service
        .from("cms_content_blocks")
        .update(row)
        .eq("id", current.id)
        .eq("page_slug", "home")
        .eq("section_key", section)
        .eq("block_key", key)
        .eq("updated_at", expected!)
    : service.from("cms_content_blocks").insert(row);
  const { data, error } = await query.select("id,content");
  if (error || data?.length !== 1)
    return {
      ok: false,
      error:
        "Saving was not confirmed. Content may have changed in another session; reload before retrying.",
    };
  revalidatePath("/");
  revalidatePath("/admin/home");
  const snapshot = await readHomepageSnapshot();
  if (!snapshot.available)
    return {
      ok: false,
      error:
        "Saving may have completed, but confirmation is unavailable. Reload before retrying.",
    };
  const stored = snapshot.blocks.find((b) => b.id === data[0].id);
  if (
    !stored ||
    Object.entries(content).some(
      ([k, v]) => !isDeepStrictEqual(record(stored.content)[k], v),
    )
  )
    return {
      ok: false,
      error: "Saved content could not be verified. Reload before retrying.",
    };
  return { ok: true, snapshot };
}
async function access(collection: CollectionId) {
  await assertAdminScope("content");
  const user = await requireAdminUser();
  const permission =
    collection === "why_stats" ? "home.stats.edit" : "home.edit";
  if (
    !(await hasAdminPermission(user, "home.view")) ||
    !(await hasAdminPermission(user, permission))
  )
    throw new Error(
      "You do not have permission to change these homepage items.",
    );
  return user;
}
async function applysaveHomepageCollection(input: unknown): Promise<Result> {
  try {
    const parsed = collectionInputSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: "Check the item fields and try again." };
    const { collection, items, expectedUpdatedAt } = parsed.data;
    const user = await access(collection);
    const before = await readHomepageSnapshot();
    if (!before.available)
      return {
        ok: false,
        error: "Existing content is unavailable. Saving is disabled.",
      };
    let references;
    if (collection === "destinations" || collection === "featured") {
      references = await loadHomepageReferences(user);
      if (
        !references.available ||
        !(collection === "destinations"
          ? references.permissions?.countries
          : references.permissions?.academic)
      )
        return {
          ok: false,
          error:
            "Existing destination or academic view permission is required.",
        };
    }
    const previous = resolveCollection(
      before.blocks,
      collection,
      references,
    ).items;
    const error = validateItems(collection, items, references, previous);
    if (error) return { ok: false, error };
    const media = await getMediaAccess(user);
    for (const item of items)
      if (
        item.imageUrl &&
        item.imageUrl !== previous.find((old) => old.id === item.id)?.imageUrl
      )
        await validateManagedMediaSelection(item.imageUrl, media);
    // No separate create/delete keys exist for copy-based cards; home.edit controls their non-destructive archival.
    return writeBlock(
      COLLECTIONS[collection].section,
      `collection_${collection}`,
      expectedUpdatedAt,
      { items },
      before,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Content could not be saved.",
    };
  }
}
async function applysaveHomepagePresentation(input: unknown): Promise<Result> {
  try {
    await assertAdminScope("content");
    const user = await requireAdminUser();
    const parsed = presentationInputSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: "Check the section settings." };
    const { section, values, expectedUpdatedAt } = parsed.data;
    const permission =
      section === "journey_cta" ? "home.cta.edit" : "home.edit";
    if (
      !(await hasAdminPermission(user, "home.view")) ||
      !(await hasAdminPermission(user, permission))
    )
      return {
        ok: false,
        error: "You do not have permission to change this section.",
      };
    const error = validatePresentation(section, values);
    if (error) return { ok: false, error };
    const before = await readHomepageSnapshot();
    if (!before.available)
      return { ok: false, error: "Existing content could not be loaded." };
    const current = presentationBlock(before.blocks, section);
    if (
      typeof values.imageUrl === "string" &&
      values.imageUrl !== record(current?.content).imageUrl
    )
      await validateManagedMediaSelection(
        values.imageUrl,
        await getMediaAccess(user),
      );
    return writeBlock(
      section,
      "presentation",
      expectedUpdatedAt,
      values,
      before,
    );
  } catch {
    return {
      ok: false,
      error: "Section settings could not be saved. Reload before retrying.",
    };
  }
}

export async function saveHomepageCollection(input: unknown): Promise<Result> {
  try {
    const v = record(input),
      collection = String(v.collection) as CollectionId;
    const resource = {
      type: "home" as const,
      key:
        collection === "why_stats"
          ? "why_stats"
          : (COLLECTIONS[collection]?.section ?? "invalid"),
    };
    const parsed = resourceSchema.parse(resource);
    return await planDraft(parsed, () => applysaveHomepageCollection(input));
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Draft could not be saved.",
    };
  }
}

export async function saveHomepagePresentation(
  input: unknown,
): Promise<Result> {
  try {
    const resource = {
      type: "home" as const,
      key: String(record(input).section),
    };
    const parsed = resourceSchema.parse(resource);
    return await planDraft(parsed, () => applysaveHomepagePresentation(input));
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Draft could not be saved.",
    };
  }
}
