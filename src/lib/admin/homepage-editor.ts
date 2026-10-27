import { redirect } from "next/navigation";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { requireAdminUser } from "@/app/admin/require-admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getOpenings } from "@/lib/data/openings";
import { getPublishedSuccessStories } from "@/lib/data/success-stories";
import type { HomeBlock } from "@/lib/homepage/content";

export type HomepageSnapshot = { site: Record<string, string>; blocks: HomeBlock[]; available: boolean };
export type HomepagePermissions = { editHome: boolean; viewSlides: boolean; editSlides: boolean; createSlides: boolean; viewCta: boolean; editCta: boolean };
export async function readHomepageSnapshot(): Promise<HomepageSnapshot> {
  const service = createSupabaseServiceClient();
  if (!service) return { site: {}, blocks: [], available: false };
  const [site, blocks] = await Promise.all([
    service.from("site_content").select("key,value").like("key", "home.%"),
    service.from("cms_content_blocks").select("id,section_key,block_key,is_active,sort_order,content,media,updated_at").eq("page_slug", "home").order("sort_order", { ascending: true }),
  ]);
  return { site: Object.fromEntries((site.data ?? []).map(row => [row.key, row.value])), blocks: (blocks.data ?? []) as HomeBlock[], available: !site.error && !blocks.error };
}
export async function loadHomepageEditor() {
  await assertAdminScope("content");
  const user = await requireAdminUser();
  if (!(await hasAdminPermission(user, "home.view"))) redirect("/admin/dashboard");
  const keys = ["home.edit", "home.hero_slider.view", "home.hero_slider.edit", "home.hero_slider.create", "home.cta.view", "home.cta.edit"];
  const grants = await Promise.all(keys.map(key => hasAdminPermission(user, key)));
  const permissions: HomepagePermissions = { editHome: grants[0], viewSlides: grants[1], editSlides: grants[2], createSlides: grants[3], viewCta: grants[4], editCta: grants[5] };
  const [snapshot, openings, stories] = await Promise.all([readHomepageSnapshot(), getOpenings(), getPublishedSuccessStories(6)]);
  return { ...snapshot, permissions, openings, stories };
}
export type HomepageEditorData = Awaited<ReturnType<typeof loadHomepageEditor>>;
