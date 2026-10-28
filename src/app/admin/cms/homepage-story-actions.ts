"use server";
import { planDraft } from "@/lib/publishing/planning";
import { resourceSchema } from "@/lib/publishing/model";
import { z } from "zod";
import { revalidateContentPath as revalidatePath } from "@/lib/publishing/planning";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { requireAdminUser } from "@/app/admin/require-admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createContentServiceClient as createSupabaseServiceClient } from "@/lib/publishing/planning";
import {
  readEditableStories,
  type EditableStory,
} from "@/lib/admin/homepage-catalogue";
import { safeImage } from "@/lib/homepage/validation";
import { validateManagedMediaSelection } from "@/lib/media/operations";
import { getMediaAccess } from "@/lib/media/access";
const schema = z
  .object({
    id: z.string().uuid().optional(),
    expectedUpdatedAt: z.string().nullable(),
    profile_image_url: z.string().max(2500),
    full_name: z.string().trim().min(1).max(200),
    testimonial: z.string().trim().min(1).max(5000),
    country: z.string().max(200),
    program: z.string().max(300),
    university: z.string().max(300),
    sort_order: z.number().int().min(0).max(10000),
    is_published: z.boolean(),
    public_approved: z.boolean(),
  })
  .strict();
type Result =
  | { ok: true; rows: EditableStory[]; savedId: string }
  | { ok: false; error: string };
async function applysaveHomepageStory(input: unknown): Promise<Result> {
  try {
    await assertAdminScope("content");
    const user = await requireAdminUser();
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error:
          "Enter the public name, testimonial, image and valid display position.",
      };
    const v = parsed.data;
    if (
      !(await hasAdminPermission(user, "blog.view")) ||
      !(await hasAdminPermission(user, v.id ? "blog.edit" : "blog.create"))
    )
      return {
        ok: false,
        error: "You do not have permission to save this testimonial.",
      };
    const service = createSupabaseServiceClient();
    if (!service)
      return { ok: false, error: "Testimonial saving is unavailable." };
    const { data: current, error: readError } = v.id
      ? await service
          .from("success_stories")
          .select("id,profile_image_url,is_published,updated_at")
          .eq("id", v.id)
          .maybeSingle()
      : { data: null, error: null };
    if (
      readError ||
      (v.id && !current) ||
      (current?.updated_at ?? null) !== v.expectedUpdatedAt
    )
      return {
        ok: false,
        error:
          "This testimonial changed in another session. Reload before saving.",
      };
    // This visibility value is proposed privately; publication checks blog.publish separately.
    if (v.is_published && !v.public_approved)
      return {
        ok: false,
        error:
          "Confirm that this information and image are approved for public use before featuring the testimonial.",
      };
    if (!current || current.profile_image_url !== v.profile_image_url) {
      if (!safeImage(v.profile_image_url, process.env.NEXT_PUBLIC_SUPABASE_URL))
        return {
          ok: false,
          error: "Choose a supported image from the Media Library.",
        };
      await validateManagedMediaSelection(
        v.profile_image_url,
        await getMediaAccess(user),
      );
    }
    const { expectedUpdatedAt: _, public_approved: __, id: ___, ...row } = v;
    void _;
    void __;
    void ___;
    const query = v.id
      ? service
          .from("success_stories")
          .update(row)
          .eq("id", v.id)
          .eq("updated_at", v.expectedUpdatedAt!)
      : service.from("success_stories").insert(row);
    const { data, error } = await query.select("id");
    if (error || data?.length !== 1)
      return {
        ok: false,
        error: "Saving could not be confirmed. Reload before retrying.",
      };
    const confirmation = await service
      .from("success_stories")
      .select("*")
      .eq("id", data[0].id)
      .single();
    if (
      confirmation.error ||
      !confirmation.data ||
      Object.entries(row).some(([k, value]) => confirmation.data[k] !== value)
    )
      return {
        ok: false,
        error:
          "The testimonial may have saved, but confirmation is unavailable. Reload before retrying.",
      };
    revalidatePath("/");
    revalidatePath("/admin/home");
    revalidatePath("/admin/content/success-stories");
    const stories = await readEditableStories(user);
    if (!stories.available)
      return {
        ok: false,
        error:
          "The saved testimonial list could not be refreshed. Reload before retrying.",
      };
    return { ok: true, rows: stories.rows, savedId: data[0].id };
  } catch {
    return {
      ok: false,
      error:
        "Testimonial saving failed. Your existing content has not been replaced.",
    };
  }
}
async function applyhideHomepageStory(input: unknown): Promise<Result> {
  try {
    await assertAdminScope("content");
    const user = await requireAdminUser();
    if (
      !(await hasAdminPermission(user, "blog.view")) ||
      !(await hasAdminPermission(user, "blog.delete"))
    )
      return {
        ok: false,
        error: "You do not have permission to archive testimonials.",
      };
    const v = z
        .object({ id: z.string().uuid(), expectedUpdatedAt: z.string() })
        .strict()
        .parse(input),
      service = createSupabaseServiceClient();
    if (!service)
      return { ok: false, error: "Testimonial saving is unavailable." };
    const { data, error } = await service
      .from("success_stories")
      .update({ is_published: false })
      .eq("id", v.id)
      .eq("updated_at", v.expectedUpdatedAt)
      .select("id");
    if (error || data?.length !== 1)
      return {
        ok: false,
        error: "This testimonial changed. Reload before hiding it.",
      };
    revalidatePath("/");
    revalidatePath("/admin/home");
    revalidatePath("/admin/content/success-stories");
    const stories = await readEditableStories(user);
    if (
      !stories.available ||
      stories.rows.find((row) => row.id === v.id)?.is_published !== false
    )
      return {
        ok: false,
        error: "Hide confirmation is unavailable. Reload before retrying.",
      };
    return { ok: true, rows: stories.rows, savedId: v.id };
  } catch {
    return {
      ok: false,
      error: "This testimonial could not be hidden. Reload before retrying.",
    };
  }
}

export async function saveHomepageStory(input: unknown): Promise<Result> {
  try {
    const resource = { type: "home" as const, key: "testimonials" };
    const parsed = resourceSchema.parse(resource);
    return await planDraft(parsed, () => applysaveHomepageStory(input));
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Draft could not be saved.",
    };
  }
}

export async function hideHomepageStory(input: unknown): Promise<Result> {
  try {
    const resource = { type: "home" as const, key: "testimonials" };
    const parsed = resourceSchema.parse(resource);
    return await planDraft(parsed, () => applyhideHomepageStory(input));
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Draft could not be saved.",
    };
  }
}
