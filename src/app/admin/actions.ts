"use server";
import { planDraft, isPlanning } from "@/lib/publishing/planning";

import { revalidateContentPath as revalidatePath } from "@/lib/publishing/planning";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { HERO_SITE_KEYS, contentLabel } from "@/lib/homepage/content";
import { safeDestination } from "@/lib/homepage/validation";
import { validateCopyPatch } from "@/lib/homepage/validation";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/app/admin/require-admin";
import { createContentServiceClient as createSupabaseServiceClient } from "@/lib/publishing/planning";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export async function signOutAdmin() {
  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

async function applysaveSiteContent(updates: { key: string; value: string }[]) {
  await assertAdminScope("content");
  const user = await requireAdminUser();
  if (!(await hasAdminPermission(user, "home.edit")))
    throw new Error("You do not have permission to edit homepage content.");
  if (
    !Array.isArray(updates) ||
    !updates.length ||
    updates.length > 12 ||
    new Set(updates.map((row) => row.key)).size !== updates.length
  )
    throw new Error("Invalid homepage changes.");
  for (const row of updates) {
    if (!row || typeof row.value !== "string")
      throw new Error("Invalid homepage value.");
    if (row.key === "home.ticker.enabled") {
      if (!["true", "false"].includes(row.value))
        throw new Error("Choose whether the news ticker is visible.");
      continue;
    }
    const field = Object.entries(HERO_SITE_KEYS).find(
      ([, key]) => key === row.key,
    )?.[0];
    if (!field) throw new Error("This homepage field cannot be changed here.");
    const error = validateCopyPatch("hero", { [field]: row.value });
    if (error) throw new Error(error);
  }
  const svc = createSupabaseServiceClient();
  if (!svc) throw new Error("Homepage saving is temporarily unavailable.");
  // One existing-table upsert batch avoids partial global-copy saves.
  const { error } = await svc.from("site_content").upsert(
    updates.map(({ key, value }) => ({
      key,
      value,
      page: "home",
      section: key.split(".")[1] ?? "default",
      label: contentLabel(key),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/home");
}

export async function saveTickerEnabled(enabled: boolean) {
  await saveSiteContent([
    { key: "home.ticker.enabled", value: enabled ? "true" : "false" },
  ]);
}

async function applyupsertTickerItem(input: {
  id?: string;
  message: string;
  href: string;
  sortOrder: number;
  isPublished: boolean;
}) {
  await requireAdminUser();
  const svc = createSupabaseServiceClient();
  if (!svc)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server.");

  const payload = {
    message: input.message,
    href: input.href || null,
    sort_order: input.sortOrder,
    is_published: input.isPublished,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await svc
      .from("news_ticker_items")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await svc.from("news_ticker_items").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/");
}

async function applydeleteTickerItem(id: string) {
  await requireAdminUser();
  const svc = createSupabaseServiceClient();
  if (!svc)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server.");
  const { error } = await svc.from("news_ticker_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function saveSiteContent(
  updates: { key: string; value: string }[],
) {
  if (isPlanning()) return applysaveSiteContent(updates);
  throw new Error(
    "Use the homepage draft editor with its current content version.",
  );
}
export async function upsertTickerItem(input: {
  id?: string;
  message: string;
  href: string;
  sortOrder: number;
  isPublished: boolean;
  expectedVersion: number;
}) {
  if (!Number.isInteger(input.expectedVersion))
    throw new Error("Reload the announcement draft before saving.");
  const result = await planDraft(
    { type: "home", key: "ticker" },
    async () => {
      if (
        !input.message?.trim() ||
        input.message.length > 5000 ||
        !Number.isInteger(input.sortOrder) ||
        input.sortOrder < 0
      )
        throw new Error("Enter a valid announcement and order.");
      if (input.href && !safeDestination(input.href))
        throw new Error("Choose a valid announcement destination.");
      await applyupsertTickerItem(input);
      return { ok: true };
    },
    input.expectedVersion,
  );
  if (!result.ok) throw new Error("Draft saving failed.");
}
export async function deleteTickerItem(id: string, expectedVersion?: number) {
  if (!Number.isInteger(expectedVersion))
    throw new Error("Reload the announcement draft before saving.");
  const result = await planDraft(
    { type: "home", key: "ticker" },
    async () => {
      await applydeleteTickerItem(id);
      return { ok: true };
    },
    expectedVersion,
  );
  if (!result.ok) throw new Error("Draft saving failed.");
}
