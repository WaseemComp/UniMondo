"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const regionSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().min(1, "Label is required").max(200),
  continent: z.string().max(120).optional().default("Europe"),
  sort_order: z.coerce.number().int().min(0).default(0),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join(".")}: ${first.message}` : "Invalid data";
}

export async function saveRegion(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = regionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

    const r = parsed.data;
    const continent = (r.continent ?? "Europe").trim() || "Europe";
    const payload = {
      label: r.label.trim(),
      continent,
      sort_order: r.sort_order,
    };

    if (r.id) {
      const { error } = await svc.from("region_groups").update(payload).eq("id", r.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("region_groups").insert(payload);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/admin/data/regions");
    revalidatePath("/admin/destinations/countries");
    revalidatePath("/destinations");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function deleteRegion(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const { error } = await svc.from("region_groups").delete().eq("id", id);
    if (error) {
      const msg = error.message.includes("violates foreign key")
        ? "Cannot delete: one or more countries still use this region. Reassign those countries first."
        : error.message;
      return { ok: false, error: msg };
    }

    revalidatePath("/admin/data/regions");
    revalidatePath("/admin/destinations/countries");
    revalidatePath("/destinations");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}
