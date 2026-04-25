"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const blogSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, hyphens"),
  excerpt: z.string().optional().default(""),
  content: z.string().optional().default(""),
  image_url: z
    .string()
    .optional()
    .default("")
    .refine((s) => !s.trim() || z.string().url().safeParse(s.trim()).success, "Invalid image URL"),
  published: z.boolean(),
});

function slugFromTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveBlog(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("blog.edit");
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const raw = input as Record<string, unknown>;
    const slugInput = typeof raw.slug === "string" ? raw.slug.trim() : "";
    const title = typeof raw.title === "string" ? raw.title : "";
    const slug = slugInput || slugFromTitle(title) || `post-${Date.now().toString(36)}`;

    const parsed = blogSchema.safeParse({
      ...raw,
      slug,
    });
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const b = parsed.data;
    const img = b.image_url?.trim() ?? "";
    const payload = {
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt ?? "",
      content: b.content ?? "",
      image_url: img || null,
      published: b.published,
    };

    if (b.id) {
      const { error } = await svc.from("blogs").update(payload).eq("id", b.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("blogs").insert(payload);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/blog");
    revalidatePath(`/blog/${b.slug}`);
    revalidatePath("/admin/blogs");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteBlog(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("blog.delete");
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("blogs").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/blog");
    revalidatePath("/admin/blogs");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}
