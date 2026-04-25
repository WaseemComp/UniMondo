"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { requireAdminUser } from "@/app/admin/require-admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
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

    if (!(await hasAdminPermission(me, v.permission_key))) return { ok: false, error: "Forbidden" };

    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

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

    const q = v.id ? svc.from("cms_content_blocks").update(row).eq("id", v.id) : svc.from("cms_content_blocks").insert(row);
    const { error } = await q;
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

    if (!(await hasAdminPermission(me, parsed.data.permission_key))) return { ok: false, error: "Forbidden" };

    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { error } = await svc.from("cms_content_blocks").delete().eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };

    for (const p of parsed.data.revalidate_paths) revalidatePath(p);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

