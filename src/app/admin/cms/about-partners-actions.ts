"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const MAX_BYTES = 5 * 1024 * 1024;

const partnerSchema = z.object({
  id: z.string().uuid().optional(),
  organization_name: z.string().min(1, "Name is required").max(300),
  continent: z.string().max(120).optional().default(""),
  country: z.string().max(120).optional().default(""),
  region: z.string().max(120).optional().default(""),
  logo_url: z
    .string()
    .optional()
    .default("")
    .refine((s) => !s.trim() || z.string().url().safeParse(s.trim()).success, "Invalid logo URL"),
  short_description: z.string().max(800).optional().default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_published: z.boolean().optional().default(true),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveAboutPartner(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = partnerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const p = parsed.data;
    const logo = p.logo_url?.trim() ?? "";
    const payload = {
      organization_name: p.organization_name.trim(),
      continent: (p.continent ?? "").trim(),
      country: (p.country ?? "").trim(),
      region: (p.region ?? "").trim(),
      logo_url: logo || null,
      short_description: (p.short_description ?? "").trim(),
      sort_order: p.sort_order,
      is_published: p.is_published ?? true,
    };

    if (p.id) {
      const { error } = await svc.from("about_partners").update(payload).eq("id", p.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("about_partners").insert(payload);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/about");
    revalidatePath("/admin/content/about");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteAboutPartner(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("about_partners").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/about");
    revalidatePath("/admin/content/about");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}

export async function uploadAboutPartnerLogo(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return { ok: false, error: "No file uploaded" };
    }
    const f = file as File;
    if (f.size > MAX_BYTES) return { ok: false, error: "Image must be under 5 MB" };
    if (!ALLOWED_IMAGE.has(f.type)) {
      return { ok: false, error: "Use JPG, PNG, WebP, or SVG" };
    }

    const ext =
      f.type === "image/png"
        ? "png"
        : f.type === "image/webp"
          ? "webp"
          : f.type === "image/svg+xml"
            ? "svg"
            : "jpg";
    const path = `partners/${randomUUID()}.${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());

    const { error: upErr } = await svc.storage.from("documents").upload(path, buf, {
      contentType: f.type,
      upsert: false,
    });
    if (upErr) return { ok: false, error: upErr.message };

    const {
      data: { publicUrl },
    } = svc.storage.from("documents").getPublicUrl(path);
    return { ok: true, url: publicUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return { ok: false, error: msg };
  }
}
