import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CmsContentBlockRow = {
  id: string;
  page_slug: string;
  section_key: string;
  block_key: string;
  block_type: string;
  content: unknown;
  media: unknown;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function getCmsBlocks(pageSlug: string): Promise<CmsContentBlockRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("cms_content_blocks")
    .select("id, page_slug, section_key, block_key, block_type, content, media, is_active, sort_order, created_at, updated_at")
    .eq("page_slug", pageSlug)
    .order("section_key", { ascending: true })
    .order("sort_order", { ascending: true });

  // If the migration hasn't been applied yet, or table is missing, fall back silently.
  if (error || !data) return [];
  return data as CmsContentBlockRow[];
}

export function pickLocaleText(value: unknown, locale: "en" | "ar" | "de" | "fr" = "en"): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const rec = value as Record<string, unknown>;
  const v = rec[locale];
  return typeof v === "string" ? v : undefined;
}

