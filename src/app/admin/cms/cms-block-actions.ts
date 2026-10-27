"use server";

import { revalidatePath } from "next/cache";
import { HOME_SECTIONS, type CopySection, english, record } from "@/lib/homepage/content";
import { validateCopyPatch } from "@/lib/homepage/validation";
import { z } from "zod";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { requireAdminUser } from "@/app/admin/require-admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  expected_updated_at: z.string().optional(),
  page_slug: z.string().min(1),
  section_key: z.string().min(1),
  block_key: z.string().min(1),
  block_type: z.string().min(1),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  content: z.record(z.string(), z.unknown()).default({}),
  media: z.record(z.string(), z.unknown()).default({}),
  permission_key: z.string().min(1),
  revalidate_paths: z.array(z.string()).default([]),
});

export async function upsertCmsBlock(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdminScope("content");
    const me = await requireAdminUser();
    const parsed = upsertSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    const v = parsed.data;

    let permission = v.permission_key;
    if (v.page_slug === "home") {
      const section = HOME_SECTIONS.find(section => section.id === v.section_key && section.id !== "hero");
      if (!section || v.block_key !== "copy") return { ok: false, error: "Unsupported homepage section." };
      permission = section.permission;
    }
    if (!(await hasAdminPermission(me, permission))) return { ok: false, error: "Forbidden" };

    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    if (v.page_slug === "home") {
      const section = HOME_SECTIONS.find(section => section.id === v.section_key)!;
      const { data: previous, error: readError } = v.id ? await svc.from("cms_content_blocks").select("content").eq("id", v.id).eq("page_slug", "home").eq("section_key", v.section_key).eq("block_key", "copy").maybeSingle() : { data: null, error: null };
      if (v.id && (readError || !previous)) return { ok: false, error: "This section is no longer available. Reload before saving." };
      // Legacy empty fallback fields remain untouched; newly submitted blank values are rejected.
      const patch = Object.fromEntries(section.fields.filter(field => field.key in v.content && (!previous || english(v.content[field.key]) !== english(record(previous.content)[field.key]))).map(field => [field.key, english(v.content[field.key]) ?? ""]));
      const error = validateCopyPatch(v.section_key as CopySection, patch);
      if (error) return { ok: false, error };
    }

    const row = {
      page_slug: v.page_slug,
      section_key: v.section_key,
      block_key: v.block_key,
      block_type: v.block_type,
      is_active: v.is_active,
      sort_order: v.sort_order,
      content: v.content,
      media: v.media,
    };

    let q = v.id ? svc.from("cms_content_blocks").update(row).eq("id", v.id).eq("page_slug", v.page_slug).eq("section_key", v.section_key).eq("block_key", v.block_key) : svc.from("cms_content_blocks").insert(row);
    if (v.id && v.expected_updated_at) q = q.eq("updated_at", v.expected_updated_at);
    const { data, error } = await q.select("id");
    if (!error && !data?.length) return { ok: false, error: "This content changed or is no longer available. Reload before saving." };
    if (error) return { ok: false, error: error.message };

    for (const p of v.revalidate_paths) revalidatePath(p);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

const deleteSchema = z.object({
  id: z.string().uuid(),
  permission_key: z.string().min(1),
  revalidate_paths: z.array(z.string()).default([]),
});

export async function deleteCmsBlock(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdminScope("content");
    const me = await requireAdminUser();
    const parsed = deleteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid data" };

    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { data: target, error: readError } = await svc.from("cms_content_blocks").select("page_slug,section_key,block_key").eq("id", parsed.data.id).maybeSingle();
    if (readError || !target) return { ok: false, error: "Content is no longer available." };
    if (target.page_slug === "home" && (target.block_key.startsWith("collection_") || target.block_key === "presentation")) return {ok:false,error:"Use item archiving or section visibility. Homepage collection history is retained."};
    const homePermission = target.section_key === "hero_slider" ? "home.hero_slider.delete" : target.section_key === "journey_cta" ? "home.cta.edit" : "home.edit";
    if (!(await hasAdminPermission(me, target.page_slug === "home" ? homePermission : parsed.data.permission_key))) return { ok: false, error: "Forbidden" };
    const { error } = await svc.from("cms_content_blocks").delete().eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };

    for (const p of parsed.data.revalidate_paths) revalidatePath(p);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

