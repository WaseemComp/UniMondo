import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SiteSettings = {
  tickerText: string;
  tickerActive: boolean;
};

const FALLBACK: SiteSettings = {
  tickerText: "Fall 2026 & Spring 2027 intakes are open — explore programs and book a free consultation.",
  tickerActive: true,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return FALLBACK;

  const { data, error } = await supabase.from("site_settings").select("ticker_text, ticker_active").eq("id", 1).maybeSingle();

  if (error || !data) {
    if (error) console.error("[getSiteSettings]", error.message);
    return FALLBACK;
  }

  return {
    tickerText: (data.ticker_text as string) ?? FALLBACK.tickerText,
    tickerActive: Boolean(data.ticker_active),
  };
}
