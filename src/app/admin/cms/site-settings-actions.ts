"use server";
import { planDraft } from "@/lib/publishing/planning";

import { revalidateContentPath as revalidatePath } from "@/lib/publishing/planning";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/require-permission";
import { createContentServiceClient as createSupabaseServiceClient } from "@/lib/publishing/planning";

const settingsSchema = z.object({
  ticker_text: z.string(),
  ticker_active: z.boolean(),
});

async function applysaveSiteSettings(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("settings.edit");
    const svc = createSupabaseServiceClient();
    if (!svc)
      return {
        ok: false,
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      };

    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid data" };
    }

    const { error } = await svc.from("site_settings").upsert(
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
    revalidatePath("/admin/content/ticker");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}

export async function saveSiteSettings(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const version = (input as { expectedVersion?: number })?.expectedVersion;
    if (!Number.isInteger(version))
      throw new Error("Reload the announcement draft before saving.");
    return await planDraft(
      { type: "home", key: "ticker" },
      () => applysaveSiteSettings(input),
      version,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Private draft saving failed.",
    };
  }
}
