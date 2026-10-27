import type { AdminAreaPermission } from "@/lib/auth/admin";

export const MEDIA_BUCKET = "featured-university-media";
export const MEDIA_PREFIX = "cms-library/";
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MEDIA_CATEGORIES = [
  { id: "hero", label: "Hero Banners", area: "content", view: ["home.hero_slider.view"], upload: ["home.hero_slider.create"], edit: ["home.hero_slider.edit"], archive: ["home.hero_slider.delete"] },
  { id: "destinations", label: "Destinations", area: "academic", view: ["countries.view"], upload: ["countries.create"], edit: ["countries.edit"], archive: ["countries.delete"] },
  { id: "universities", label: "Universities & Programs", area: "academic", view: ["universities.view"], upload: ["universities.create"], edit: ["universities.edit"], archive: ["universities.delete"] },
  { id: "stories", label: "Success Stories", area: "content", view: ["blog.view"], upload: ["blog.create"], edit: ["blog.edit"], archive: ["blog.delete"] },
  { id: "general", label: "General Website Images", area: "content", view: ["home.view", "about.view", "contact.view", "blog.view"], upload: ["home.edit", "about.edit", "contact.edit", "blog.create"], edit: ["home.edit", "about.edit", "contact.edit", "blog.edit"], archive: [] },
] as const satisfies readonly { id: string; label: string; area: AdminAreaPermission; view: readonly string[]; upload: readonly string[]; edit: readonly string[]; archive: readonly string[] }[];
export type MediaCategory = typeof MEDIA_CATEGORIES[number]["id"];
export type MediaGrants = Record<MediaCategory, { view: boolean; upload: boolean; edit: boolean; archive: boolean }>;
export type MediaAsset = {
  id: string; url: string; name: string; alt: string; category: MediaCategory;
  width: number | null; height: number | null; bytes: number | null; createdAt: string | null;
  source: "upload" | "legacy" | "repository"; archived: boolean; usage: string[]; usageVerified: boolean; heroCompatible: boolean;
};
export type MediaCatalogue = { assets: MediaAsset[]; permissions: MediaGrants; metadataReady: boolean; storageReady: boolean; usageVerified: boolean; warning: string | null; total: number };
export function categoryLabel(category: MediaCategory) { return MEDIA_CATEGORIES.find(item => item.id === category)!.label; }
export function mediaBytes(bytes: number | null) { return bytes == null ? "Not recorded" : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
