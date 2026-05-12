"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/require-permission";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const programSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  university: z.string().min(1, "University is required"),
  country: z.string().min(1, "Country is required"),
  degree: z.enum(["bachelor", "master"]),
  intake: z.string().min(1, "Intake is required"),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Deadline must be YYYY-MM-DD"),
  tuition_range: z.string().min(1, "Tuition range is required"),
  description: z.string().optional().default(""),
  logo_url: z
    .string()
    .optional()
    .default("")
    .refine((s) => !s.trim() || z.string().url().safeParse(s.trim()).success, "Invalid logo URL"),
  logo_text: z.string().optional().default(""),
  continent: z.string().optional().default("Europe"),
  region: z.string().optional().default(""),
  is_published: z.boolean(),
  sort_order: z.number().int(),
});

function newProgramId(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "program"}-${Date.now().toString(36)}`;
}

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveProgram(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("universities.edit");
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = programSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const p = parsed.data;
    const id = p.id?.trim() || newProgramId(p.title);
    const logoTrim = (p.logo_url ?? "").trim();
    const row = {
      id,
      title: p.title,
      university: p.university,
      country: p.country,
      degree: p.degree,
      intake: p.intake,
      deadline: p.deadline,
      tuition_range: p.tuition_range,
      description: p.description ?? "",
      logo_url: logoTrim || null,
      logo_text: p.logo_text?.trim() || null,
      continent: p.continent || "Europe",
      region: p.region || "",
      is_published: p.is_published,
      sort_order: p.sort_order,
    };

    const { error } = await svc.from("programs").upsert(row, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/destinations");
    revalidatePath("/admin/programs");
    revalidatePath("/admin/destinations");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteProgram(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("universities.delete");
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("programs").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/destinations");
    revalidatePath("/admin/programs");
    revalidatePath("/admin/destinations");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}
