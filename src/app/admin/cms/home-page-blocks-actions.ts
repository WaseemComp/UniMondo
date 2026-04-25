"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { requireAdminUser } from "@/app/admin/require-admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const localeTextSchema = z
  .union([z.string(), z.record(z.string(), z.string())])
  .optional()
  .nullable();

const heroSlideSchema = z.object({
  id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  imageUrl: z.string().url().min(1),
  imageAlt: z.string().min(1),
  line: localeTextSchema,
  title: localeTextSchema,
  subtitle: localeTextSchema,
  buttonText: localeTextSchema,
  secondaryButtonText: localeTextSchema,
});

export type HeroSlideInput = z.infer<typeof heroSlideSchema>;

export async function saveHomeHeroSlide(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdminScope("content");
    const me = await requireAdminUser();
    if (!(await hasAdminPermission(me, "home.hero_slider.edit"))) {
      return { ok: false, error: "Forbidden" };
    }
    const parsed = heroSlideSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };

    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const s = parsed.data;
    const row = {
      page_slug: "home",
      section_key: "hero_slider",
      block_key: "slide",
      block_type: "hero_slide",
      is_active: s.is_active,
      sort_order: s.sort_order,
      content: {
        line: s.line ?? "",
        title: s.title ?? "",
        subtitle: s.subtitle ?? "",
        buttonText: s.buttonText ?? "",
        secondaryButtonText: s.secondaryButtonText ?? "",
      },
      media: { imageUrl: s.imageUrl, imageAlt: s.imageAlt },
    };

    const q = s.id
      ? svc.from("cms_content_blocks").update(row).eq("id", s.id)
      : svc.from("cms_content_blocks").insert(row);
    const { error } = await q;
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/home");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteHomeHeroSlide(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdminScope("content");
    const me = await requireAdminUser();
    if (!(await hasAdminPermission(me, "home.hero_slider.delete"))) {
      return { ok: false, error: "Forbidden" };
    }
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
    const { error } = await svc.from("cms_content_blocks").delete().eq("id", id).eq("page_slug", "home").eq("section_key", "hero_slider");
    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/home");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

