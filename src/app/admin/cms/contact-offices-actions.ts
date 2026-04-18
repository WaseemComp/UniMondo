"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const phoneEntry = z.object({
  number: z.string().min(1, "Phone number required"),
  label: z.string().optional().default(""),
  kind: z.enum(["landline", "fax", "mobile"]).optional(),
});

const emailEntry = z.object({
  email: z.string().email("Invalid email"),
  label: z.string().optional().default(""),
});

const socialEntry = z.object({
  platform: z.string().min(1, "Platform name required"),
  url: z.string().url("Invalid URL"),
});

const officeSchema = z.object({
  id: z.string().uuid().optional(),
  office_type: z.enum(["head", "branch"]),
  title: z.string().optional().default(""),
  address_lines: z.string().min(1, "Address is required"),
  phones: z.array(phoneEntry).default([]),
  emails: z.array(emailEntry).default([]),
  social_links: z.array(socialEntry).default([]),
  sort_order: z.coerce.number().int().min(0).default(0),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveContactOffice(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = officeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const o = parsed.data;
    const payload = {
      office_type: o.office_type,
      title: o.title?.trim() || null,
      address_lines: o.address_lines.trim(),
      phones: o.phones.map((p) => ({
        number: p.number.trim(),
        ...(p.label?.trim() ? { label: p.label.trim() } : {}),
        ...(p.kind ? { kind: p.kind } : {}),
      })),
      emails: o.emails.map((e) => ({
        email: e.email.trim().toLowerCase(),
        ...(e.label?.trim() ? { label: e.label.trim() } : {}),
      })),
      social_links: o.social_links.map((s) => ({
        platform: s.platform.trim(),
        url: s.url.trim(),
      })),
      sort_order: o.sort_order,
    };

    if (o.id) {
      const { error } = await svc.from("contact_offices").update(payload).eq("id", o.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("contact_offices").insert(payload);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/contact");
    revalidatePath("/admin/content/contact");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteContactOffice(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("contact_offices").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/contact");
    revalidatePath("/admin/content/contact");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}
