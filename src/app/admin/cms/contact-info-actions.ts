"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional().default(""),
  lines: z.string().min(1, "Address is required"),
  sort_order: z.coerce.number().int().min(0).default(0),
});

const phoneSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional().default(""),
  number: z.string().min(1, "Number is required"),
  kind: z.enum(["landline", "fax"]),
  sort_order: z.coerce.number().int().min(0).default(0),
});

const emailSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional().default(""),
  email: z.string().email("Invalid email"),
  sort_order: z.coerce.number().int().min(0).default(0),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveContactAddress(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = addressSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const a = parsed.data;
    const payload = { label: a.label?.trim() ?? "", lines: a.lines.trim(), sort_order: a.sort_order };

    if (a.id) {
      const { error } = await svc.from("contact_addresses").update(payload).eq("id", a.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("contact_addresses").insert(payload);
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

export async function deleteContactAddress(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("contact_addresses").delete().eq("id", id);
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

export async function saveContactPhone(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = phoneSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const p = parsed.data;
    const payload = {
      label: p.label?.trim() ?? "",
      number: p.number.trim(),
      kind: p.kind,
      sort_order: p.sort_order,
    };

    if (p.id) {
      const { error } = await svc.from("contact_phones").update(payload).eq("id", p.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("contact_phones").insert(payload);
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

export async function deleteContactPhone(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("contact_phones").delete().eq("id", id);
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

export async function saveContactEmail(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = emailSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const e = parsed.data;
    const payload = {
      label: e.label?.trim() ?? "",
      email: e.email.trim().toLowerCase(),
      sort_order: e.sort_order,
    };

    if (e.id) {
      const { error } = await svc.from("contact_emails").update(payload).eq("id", e.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("contact_emails").insert(payload);
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

export async function deleteContactEmail(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("contact_emails").delete().eq("id", id);
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
