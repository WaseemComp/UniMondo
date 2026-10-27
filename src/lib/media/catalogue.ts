import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { safeImage } from "@/lib/homepage/validation";
import { MEDIA_BUCKET, type MediaAsset, type MediaCategory, type MediaCatalogue, type MediaGrants } from "./types";
import { LEGACY_WEBSITE_IMAGES } from "./legacy";

export type MediaRow = { id: string; url: string; object_path: string | null; source: MediaAsset["source"]; original_name: string; alt_text: string; category: MediaCategory; width: number | null; height: number | null; byte_size: number | null; created_at: string; updated_at: string; archived_at: string | null; status: "uploading" | "ready" | "failed" };
export const MEDIA_COLUMNS = "id,url,object_path,source,original_name,alt_text,category,width,height,byte_size,created_at,updated_at,archived_at,status";
export class MediaError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function mediaService() { const service = createSupabaseServiceClient(); if (!service) throw new MediaError("The image library is temporarily unavailable.", 503); return service; }
export function imageIdentity(value: string): string {
  try {
    const url = new URL(value, "https://repository.invalid");
    const path = decodeURIComponent(url.pathname).replace("/storage/v1/render/image/public/", "/storage/v1/object/public/");
    return `${url.origin}${path}${url.hostname === "repository.invalid" || path.includes("/storage/v1/") ? "" : url.search}`;
  } catch { return value; }
}
function imageAddress(value: string) {
  if (/[\u0000-\u001f\\]/.test(value) || value.startsWith("//")) return false;
  try { const url = new URL(value, "https://repository.invalid"); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && (/\.(png|jpe?g|webp|avif|gif|svg)(?:$|\?)/i.test(url.pathname) || url.hostname === "images.unsplash.com" || url.pathname.includes("/storage/v1/object/public/")); } catch { return false; }
}
async function readRows(service: SupabaseClient, table: string, columns: string, siteOnly = false) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    let query = service.from(table).select(columns).range(offset, offset + 999);
    if (siteOnly) query = query.or("key.like.home.%,key.like.about.%,key.like.contact.%,key.like.footer.%,key.like.blog.%");
    const { data, error } = await query;
    if (error) return { rows, complete: ["42P01", "PGRST205"].includes(error.code), missing: ["42P01", "PGRST205"].includes(error.code) };
    rows.push(...(data as unknown as Record<string, unknown>[] ?? []));
    if (!data || data.length < 1000) return { rows, complete: true, missing: false };
  }
  return { rows, complete: false, missing: false };
}

export async function readImageInventory(service: SupabaseClient) {
  const images = new Map<string, MediaAsset>();
  let complete = true;
  const add = (url: string, category: MediaCategory, usage: string | null, name?: string, alt = "", meta?: { width?: number; height?: number; size?: number; createdAt?: string }) => {
    if (!imageAddress(url)) return;
    const key = imageIdentity(url), existing = images.get(key);
    if (existing) { if (usage && !existing.usage.includes(usage)) existing.usage.push(usage); return; }
    images.set(key, { id: `legacy:${createHash("sha256").update(key).digest("hex")}`, url, name: name || url.split("/").pop()?.split("?")[0] || "Existing website image", alt, category, width: meta?.width ?? null, height: meta?.height ?? null, bytes: meta?.size ?? null, createdAt: meta?.createdAt ?? null, source: url.startsWith("/") ? "repository" : "legacy", archived: false, usage: usage ? [usage] : [], usageVerified: true, heroCompatible: safeImage(url, process.env.NEXT_PUBLIC_SUPABASE_URL) });
  };
  for (const item of LEGACY_WEBSITE_IMAGES) add(item.url, item.category, item.usage, item.name, item.alt);
  const sources: [string, string, MediaCategory, string][] = [
    ["cms_content_blocks", "page_slug,section_key,content,media", "general", "Website content"],
    ["site_content", "key,value,page", "general", "Website copy"],
    ["featured_universities", "id,hero_image_url,logo_url", "universities", "Universities & Programs"],
    ["programs", "id,logo_url", "universities", "Programs"],
    ["success_stories", "id,profile_image_url", "stories", "Success Stories"],
    ["blogs", "id,image_url", "general", "Blog"],
    ["team_members", "id,image_url", "general", "About · team"],
    ["about_partners", "id,logo_url", "general", "About · partners"],
  ];
  const loaded = await Promise.all(sources.map(async ([table, columns, category, label]) => ({ table, category, label, result: await readRows(service, table, columns, table === "site_content") })));
  function walk(value: unknown, key: string, category: MediaCategory, label: string) {
    if (typeof value === "string") { if (/image|photo|logo|src|background|avatar|banner/i.test(key)) add(value, category, label); return; }
    if (Array.isArray(value)) value.forEach(item => walk(item, key, category, label));
    else if (value && typeof value === "object") for (const [child, item] of Object.entries(value)) walk(item, `${key}.${child}`, category, label);
  }
  for (const { table, category, label, result } of loaded) {
    complete &&= result.complete;
    for (const row of result.rows) {
      if (table === "cms_content_blocks") {
        const section = String(row.section_key ?? ""), page = String(row.page_slug ?? "");
        const kind: MediaCategory = section === "hero_slider" ? "hero" : section === "destinations" ? "destinations" : section === "universities" ? "universities" : section === "success_stories" ? "stories" : "general";
        walk(row.media, "media", kind, `${page === "home" ? "Homepage" : "Website"} · ${section === "hero_slider" ? "hero slide" : "section image"}`);
        walk(row.content, "content", kind, `${page === "home" ? "Homepage" : "Website"} · section content`);
      } else if (table === "site_content") {
        if (/^agreement/i.test(String(row.key))) continue;
        walk(row.value, String(row.key ?? ""), category, label);
      } else walk(row, "", category, label);
    }
  }
  // The existing website-image folder only. Never enumerate student application storage.
  for (let offset = 0; offset < 10000; offset += 1000) {
    const { data, error } = await service.storage.from(MEDIA_BUCKET).list("cms", { limit: 1000, offset });
    if (error) { complete = false; break; }
    for (const file of data ?? []) if (file.id) {
      const { data: address } = service.storage.from(MEDIA_BUCKET).getPublicUrl(`cms/${file.name}`);
      const metadata = (file.metadata ?? {}) as Record<string, unknown>;
      add(address.publicUrl, "universities", null, file.name, "", { size: Number(metadata.size) || undefined, width: Number(metadata.width) || undefined, height: Number(metadata.height) || undefined, createdAt: file.created_at ?? undefined });
    }
    if (!data || data.length < 1000) break;
    if (offset === 9000) complete = false;
  }
  return { images, complete };
}

export async function loadMediaCatalogue(permissions: MediaGrants): Promise<MediaCatalogue> {
  const service = mediaService();
  const [catalogue, inventory, bucket] = await Promise.all([
    readRows(service, "cms_media_assets", MEDIA_COLUMNS), readImageInventory(service), service.storage.getBucket(MEDIA_BUCKET),
  ]);
  const metadataReady = catalogue.complete && !catalogue.missing;
  if (!catalogue.complete) throw new MediaError("The image catalogue could not be loaded. Please retry.", 503);
  const storageReady = !bucket.error && Boolean(bucket.data?.public) && (!bucket.data?.allowed_mime_types || bucket.data.allowed_mime_types.includes("image/webp"));
  const assets = new Map<string, MediaAsset>(inventory.images);
  let unfinished = false;
  for (const raw of catalogue.rows) {
    const row = raw as unknown as MediaRow, key = imageIdentity(row.url), reference = inventory.images.get(key);
    if (row.status !== "ready") { unfinished = true; assets.delete(key); continue; }
    assets.set(key, { id: row.id, url: row.url, name: row.original_name, alt: row.alt_text, category: row.category, width: row.width, height: row.height, bytes: row.byte_size, createdAt: row.created_at, source: row.source, archived: Boolean(row.archived_at), usage: reference?.usage ?? [], usageVerified: inventory.complete, heroCompatible: safeImage(row.url, process.env.NEXT_PUBLIC_SUPABASE_URL) });
  }
  const visible = [...assets.values()].filter(asset => permissions[asset.category]?.view).map(asset => ({ ...asset, usageVerified: inventory.complete }));
  visible.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || a.name.localeCompare(b.name));
  const warning = !metadataReady ? "Library setup is pending. Existing images remain available; uploads and metadata changes are disabled until the catalogue migration is applied." : !storageReady ? "The existing image bucket needs to be checked before uploading. No storage settings have been changed." : !inventory.complete ? "Some usage information is unavailable. Archiving is disabled to protect existing content." : unfinished ? "An earlier upload did not finish. Refresh the library before retrying an interrupted upload." : null;
  return { assets: visible, permissions, metadataReady, storageReady, usageVerified: inventory.complete, warning, total: visible.length };
}
export async function selectedMediaAsset(id: string, permissions: MediaGrants) {
  const catalogue = await loadMediaCatalogue(permissions);
  const asset = catalogue.assets.find(asset => asset.id === id && !asset.archived);
  if (!asset) throw new MediaError("This image is unavailable or you do not have access to it.", 404);
  return asset;
}
