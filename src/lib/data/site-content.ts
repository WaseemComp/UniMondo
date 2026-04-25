import type { HeroCopy } from "@/components/home/hero-carousel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SiteContentMap = Record<string, string>;

const FALLBACK: SiteContentMap = {
  "home.hero.title": "Your Future Knows No Borders",
  "home.hero.subtitle":
    "Personalized admissions guidance, visa expertise, and full student support — from first call to campus arrival.",
  "home.hero.cta_explore": "Universities",
  "home.hero.cta_apply": "Begin Your Application",
  "home.ticker.enabled": "true",
};

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
  return {
    title: map["home.hero.title"] ?? FALLBACK["home.hero.title"],
    subtitle: map["home.hero.subtitle"] ?? FALLBACK["home.hero.subtitle"],
    ctaExplore: map["home.hero.cta_explore"] ?? FALLBACK["home.hero.cta_explore"],
    ctaApply: map["home.hero.cta_apply"] ?? FALLBACK["home.hero.cta_apply"],
  };
}
