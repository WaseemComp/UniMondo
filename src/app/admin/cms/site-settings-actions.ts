"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const settingsSchema = z.object({
  ticker_text: z.string(),
  ticker_active: z.boolean(),
});

export async function saveSiteSettings(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminUser();
    const svc = createSupabaseServiceClient();
    if (!svc) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid data" };
    }

    const { error } = await svc
      .from("site_settings")
      .upsert(
        {
          id: 1,
          ticker_text: parsed.data.ticker_text,
          ticker_active: parsed.data.ticker_active,
 },
        { onConflict: "id" },
      );

    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}
