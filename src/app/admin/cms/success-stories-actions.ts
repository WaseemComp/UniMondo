"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const storySchema = z.object({
  id: z.string().uuid().optional(),
  profile_image_url: z
    .string()
    .min(1, "Profile image URL is required")
    .refine((s) => z.string().url().safeParse(s.trim()).success, "Invalid image URL"),
  full_name: z.string().min(1, "Name is required"),
  testimonial: z.string().min(1, "Testimonial is required"),
  country: z.string().optional().default(""),
  program: z.string().optional().default(""),
  university: z.string().optional().default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveSuccessStory(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = storySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const s = parsed.data;
    const payload = {
      profile_image_url: s.profile_image_url.trim(),
      full_name: s.full_name.trim(),
      testimonial: s.testimonial.trim(),
      country: s.country?.trim() || null,
      program: s.program?.trim() || null,
      university: s.university?.trim() || null,
      sort_order: s.sort_order,
      is_published: s.is_published,
    };

    if (s.id) {
      const { error } = await svc.from("success_stories").update(payload).eq("id", s.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("success_stories").insert(payload);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/");
    revalidatePath("/admin/content/success-stories");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteSuccessStory(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("success_stories").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/content/success-stories");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}
