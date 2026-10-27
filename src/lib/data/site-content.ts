import type { HeroCopy } from "@/components/home/hero-carousel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SiteContentMap = Record<string, string>;

import { HERO_DEFAULTS, HERO_SITE_KEYS, resolveGlobalHero, valuesOf } from "@/lib/homepage/content";

const FALLBACK: SiteContentMap = { ...Object.fromEntries(Object.entries(HERO_DEFAULTS).map(([key, value]) => [HERO_SITE_KEYS[key as keyof typeof HERO_SITE_KEYS], value])), "home.ticker.enabled": "true" };

export async function getSiteContent(): Promise<SiteContentMap> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ...FALLBACK };

  const { data, error } = await supabase.from("site_content").select("key, value");
  if (error || !data?.length) {
    return { ...FALLBACK };
  }

  const map: SiteContentMap = { ...FALLBACK };
  for (const row of data as { key: string; value: string }[]) {
    map[row.key] = row.value;
  }
  return map;
}

export function getTickerEnabled(map: SiteContentMap): boolean {
  return map["home.ticker.enabled"]?.toLowerCase() === "true";
}

export function siteContentToHeroCopy(map: SiteContentMap): HeroCopy {
  return valuesOf(resolveGlobalHero(map)) as HeroCopy;
}
