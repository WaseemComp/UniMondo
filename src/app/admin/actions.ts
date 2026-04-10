"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

async function requireAdmin() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user))) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function signOutAdmin() {
  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function saveSiteContent(updates: { key: string; value: string }[]) {
  await requireAdmin();
  const svc = createSupabaseServiceClient();
  if (!svc) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server.");

  for (const { key, value } of updates) {
    const { error } = await svc.from("site_content").upsert(
      {
        key,
        value,
        page: "home",
        section: key.split(".")[1] ?? "default",
        label: key,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
  }
  revalidatePath("/");
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
  await requireAdmin();
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
  await requireAdmin();
  const svc = createSupabaseServiceClient();
  if (!svc) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server.");
  const { error } = await svc.from("news_ticker_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
