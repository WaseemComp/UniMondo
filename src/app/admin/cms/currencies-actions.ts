"use server";
import { requireSuperAdmin } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { currencySchema } from "@/lib/currencies/model";
import { revalidatePath } from "next/cache";
export async function saveCurrency(input: unknown) {
  try {
    await requireSuperAdmin();
    const value = currencySchema.parse(input),
      svc = createSupabaseServiceClient();
    if (!svc) throw new Error("Currency settings are unavailable.");
    const result = await svc.rpc("cms_currency_save", { p_value: value });
    if (result.error) throw new Error(result.error.message);
    revalidatePath("/admin/settings/currencies");
    revalidatePath("/packages");
    revalidatePath("/courses");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Currency could not be saved.",
    };
  }
}
