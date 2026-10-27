"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { safeImage } from "@/lib/homepage/validation";
import { getMediaAccess } from "@/lib/media/access";
import { validateManagedMediaSelection } from "@/lib/media/operations";
import { hideHomepageStory } from "./homepage-story-actions";
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
    await assertAdminScope("content");
    const user = await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = storySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const s = parsed.data;
    if (!await hasAdminPermission(user, "blog.view") || !await hasAdminPermission(user, s.id ? "blog.edit" : "blog.create")) return { ok: false, error: "Forbidden" };
    const current = s.id ? await svc.from("success_stories").select("is_published,updated_at,profile_image_url").eq("id",s.id).maybeSingle() : {data:null,error:null};
    if (current.error || s.id && !current.data) return {ok:false,error:"Story is no longer available."};
    if (s.is_published !== Boolean(current.data?.is_published) && !await hasAdminPermission(user,"blog.publish")) return {ok:false,error:"Publish permission is required."};
    if (!current.data || current.data.profile_image_url !== s.profile_image_url.trim()) { if (!safeImage(s.profile_image_url.trim(),process.env.NEXT_PUBLIC_SUPABASE_URL)) return {ok:false,error:"Choose a supported website image."}; await validateManagedMediaSelection(s.profile_image_url.trim(),await getMediaAccess(user)); }
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
      const { error } = await svc.from("success_stories").update(payload).eq("id", s.id).eq("updated_at", current.data!.updated_at);
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
    await assertAdminScope("content");
    const user = await requireAdminUser();
    if (!await hasAdminPermission(user,"blog.delete")) return {ok:false,error:"Forbidden"};
    const service=createSupabaseServiceClient();if(!service)return {ok:false,error:"Story saving is unavailable."};
    const {data,error}=await service.from("success_stories").select("updated_at").eq("id",id).maybeSingle();
    if(error||!data)return {ok:false,error:"Story is no longer available."};
    const result=await hideHomepageStory({id,expectedUpdatedAt:data.updated_at});
    return result.ok ? {ok:true} : result;
  } catch { return {ok:false,error:"Story could not be hidden."}; }
}
