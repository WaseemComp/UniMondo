"use server";

import { revalidatePath } from "next/cache";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { HERO_SITE_KEYS, contentLabel } from "@/lib/homepage/content";
import { validateCopyPatch } from "@/lib/homepage/validation";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export async function signOutAdmin() {
  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function saveSiteContent(updates: { key: string; value: string }[]) {
  await assertAdminScope("content");
  const user = await requireAdminUser();
  if (!(await hasAdminPermission(user, "home.edit"))) throw new Error("You do not have permission to edit homepage content.");
  if (!Array.isArray(updates) || !updates.length || updates.length > 12 || new Set(updates.map(row => row.key)).size !== updates.length) throw new Error("Invalid homepage changes.");
  for (const row of updates) {
    if (!row || typeof row.value !== "string") throw new Error("Invalid homepage value.");
    if (row.key === "home.ticker.enabled") {
      if (!["true", "false"].includes(row.value)) throw new Error("Choose whether the news ticker is visible.");
      continue;
    }
    const field = Object.entries(HERO_SITE_KEYS).find(([, key]) => key === row.key)?.[0];
    if (!field) throw new Error("This homepage field cannot be changed here.");
    const error = validateCopyPatch("hero", { [field]: row.value });
    if (error) throw new Error(error);
  }
  const svc = createSupabaseServiceClient();
  if (!svc) throw new Error("Homepage saving is temporarily unavailable.");
  // One existing-table upsert batch avoids partial global-copy saves.
  const { error } = await svc.from("site_content").upsert(updates.map(({ key, value }) => ({ key, value, page: "home", section: key.split(".")[1] ?? "default", label: contentLabel(key), updated_at: new Date().toISOString() })), { onConflict: "key" });
  if (error) throw new Error("Homepage changes could not be saved. Please try again.");
  revalidatePath("/");
  revalidatePath("/admin/home");
}

export async function saveTickerEnabled(enabled: boolean) {
  await saveSiteContent([{ key: "home.ticker.enabled", value: enabled ? "true" : "false" }]);
}

export async function upsertTickerItem(input: {
  id?: string;
  message: string;
  href: string;
  sortOrder: number;
  isPublished: boolean;
}) {
  await requireAdminUser();
  const svc = createSupabaseServiceClient();
  if (!svc) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server.");

  const payload = {
    message: input.message,
    href: input.href || null,
    sort_order: input.sortOrder,
    is_published: input.isPublished,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await svc.from("news_ticker_items").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await svc.from("news_ticker_items").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/");
}

export async function deleteTickerItem(id: string) {
  await requireAdminUser();
  const svc = createSupabaseServiceClient();
  if (!svc) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server.");
  const { error } = await svc.from("news_ticker_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
