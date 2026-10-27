import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { contentLabel } from "@/lib/homepage/content";
import type { CmsNavItem } from "./navigation";

export type OverviewStat = { id: string; label: string; href: string; icon: string; count: number | null };
export type OverviewRecent = { id: string; title: string; section: string; href: string; icon: string; updatedAt: string; status: "published" | "draft" | "saved" };
export type OverviewQueue = { label: string; href: string; count: number };
export type CmsOverview = { stats: OverviewStat[]; recent: OverviewRecent[]; queue: OverviewQueue[]; unavailable: boolean };

/** Read-only presentation of existing records. No snapshots, identities or content values are loaded. */
export async function getCmsOverview(items: CmsNavItem[]): Promise<CmsOverview> {
  const visible = new Map(items.map(item => [item.id, item]));
  const definitions = [
    { id: "applications", table: "applications", label: "Applications" },
    { id: "agreements", table: "agreement_state", label: "Agreements" },
    { id: "universities", table: "programs", label: "Programs" },
    { id: "destinations", table: "countries", label: "Destinations" },
    { id: "blog", table: "blogs", label: "Blog posts" },
    { id: "packages", table: "packages", label: "Packages" },
  ].filter(definition => visible.has(definition.id));
  const result: CmsOverview = {
    stats: definitions.map(definition => ({ ...definition, href: visible.get(definition.id)!.href, icon: visible.get(definition.id)!.icon, count: null })),
    recent: [], queue: [], unavailable: false,
  };
  const service = createSupabaseServiceClient();
  if (!service) return { ...result, unavailable: true };
  const jobs: (() => Promise<void>)[] = definitions.map(definition => async () => {
    let query = service.from(definition.table).select(definition.id === "agreements" ? "agreement_id" : "id", { count: "exact", head: true });
    if (definition.id === "applications") query = query.in("application_type", ["university", "language_course"]);
    if (definition.id === "agreements") query = query.is("deleted_at", null);
    const { count, error } = await query;
    if (error || count == null) result.unavailable = true;
    else result.stats.find(stat => stat.id === definition.id)!.count = count;
  });
  for (const definition of [
    { id: "applications", table: "applications", field: "review_status", value: "Pending", label: "Applications awaiting review" },
    { id: "agreements", table: "agreement_state", field: "status", value: "draft", label: "Draft agreements" },
  ]) {
    if (!visible.has(definition.id)) continue;
    jobs.push(async () => {
      let query = service.from(definition.table).select(definition.id === "agreements" ? "agreement_id" : "id", { count: "exact", head: true }).eq(definition.field, definition.value);
      if (definition.id === "applications") query = query.in("application_type", ["university", "language_course"]);
      else query = query.is("deleted_at", null);
      const { count, error } = await query;
      if (error || count == null) result.unavailable = true;
      else result.queue.push({ label: definition.label, href: visible.get(definition.id)!.href, count });
    });
  }
  for (const definition of [
    { id: "universities", table: "programs", publication: "is_published" },
    { id: "blog", table: "blogs", publication: "published" },
  ]) {
    const item = visible.get(definition.id);
    if (!item) continue;
    jobs.push(async () => {
      const { data, error } = await service.from(definition.table).select(`id,title,updated_at,${definition.publication}`).order("updated_at", { ascending: false }).limit(5);
      if (error) { result.unavailable = true; return; }
      for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
        if (typeof row.updated_at !== "string") continue;
        result.recent.push({ id: `${definition.id}:${row.id}`, title: String(row.title || item.label), section: item.label, href: item.href, icon: item.icon, updatedAt: row.updated_at, status: row[definition.publication] ? "published" : "draft" });
      }
    });
  }
  const pages = ["home", "about", "contact"].filter(id => visible.has(id));
  if (pages.length) jobs.push(async () => {
    const { data, error } = await service.from("site_content").select("key,label,page,updated_at").in("page", pages).not("key", "like", "agreement:%").order("updated_at", { ascending: false }).limit(5);
    if (error) { result.unavailable = true; return; }
    for (const row of data ?? []) {
      const item = visible.get(row.page);
      if (!item || !row.updated_at) continue;
      result.recent.push({ id: `content:${row.key}`, title: contentLabel(row.key, row.label), section: item.label, href: item.href, icon: item.icon, updatedAt: row.updated_at, status: "saved" });
    }
  });
  const settled = await Promise.allSettled(jobs.map(job => job()));
  if (settled.some(job => job.status === "rejected")) result.unavailable = true;
  result.recent.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  result.recent = result.recent.slice(0, 7);
  result.queue.sort((a, b) => a.label.localeCompare(b.label));
  return result;
}
