"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const programLineSchema = z.object({
  name: z.string().min(1, "Program name required"),
  tuition_range: z.string().min(1, "Tuition range required"),
});

const featuredSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
  flag_emoji: z.string().optional().default(""),
  prestige_line: z.string().optional().default(""),
  qs_label: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((s) => {
      if (s == null) return null;
      const t = String(s).trim();
      return t ? t : null;
    }),
  hero_image_url: z
    .string()
    .optional()
    .default("")
    .refine((s) => {
      const t = s.trim();
      return !t || z.string().url().safeParse(t).success;
    }, "Hero image must be a valid URL"),
  hero_image_alt: z.string().optional().default(""),
  logo_url: z
    .string()
    .optional()
    .default("")
    .refine((s) => {
      const t = s.trim();
      return !t || z.string().url().safeParse(t).success;
    }, "Logo must be a valid URL"),
  logo_initials: z.string().optional().default("UNI"),
  programs: z.array(programLineSchema).min(1, "Add at least one flagship program"),
  apply_program_summary: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((s) => {
      if (s == null) return null;
      const t = String(s).trim();
      return t ? t : null;
    }),
  is_published: z.boolean(),
  sort_order: z.number().int(),
});

const BUCKET = "featured-university-media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveFeaturedUniversity(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = featuredSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const p = parsed.data;
    const id = p.id ?? randomUUID();
    const logoTrim = (p.logo_url ?? "").trim();
    const heroTrim = (p.hero_image_url ?? "").trim();

    const row = {
      id,
      name: p.name.trim(),
      country: p.country.trim(),
      flag_emoji: p.flag_emoji?.trim() ?? "",
      prestige_line: p.prestige_line?.trim() ?? "",
      qs_label: p.qs_label,
      hero_image_url: heroTrim,
      hero_image_alt: p.hero_image_alt?.trim() ?? "",
      logo_url: logoTrim || null,
      logo_initials: (p.logo_initials?.trim() || "UNI").slice(0, 12),
      programs: p.programs.map((x) => ({ name: x.name.trim(), tuition_range: x.tuition_range.trim() })),
      apply_program_summary: p.apply_program_summary,
      is_published: p.is_published,
      sort_order: p.sort_order,
    };

    const { error } = await svc.from("featured_universities").upsert(row, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/current-openings");
    revalidatePath("/admin/featured-universities");
    revalidatePath("/admin/dashboard");
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteFeaturedUniversity(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("featured_universities").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/current-openings");
    revalidatePath("/admin/featured-universities");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}

export async function uploadFeaturedUniversityAsset(
  formData: FormData,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "No file uploaded." };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "Image must be 5MB or smaller." };
    }
    if (!ALLOWED.has(file.type)) {
      return { ok: false, error: "Use JPEG, PNG, WebP, or GIF." };
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const path = `cms/${Date.now()}-${randomBytes(6).toString("hex")}.${safeExt}`;

    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await svc.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) return { ok: false, error: upErr.message };

    const { data } = svc.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) return { ok: false, error: "Could not resolve public URL." };

    return { ok: true, publicUrl: data.publicUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return { ok: false, error: msg };
  }
}
