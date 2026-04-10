import { SiteSettingsForm } from "@/components/admin/cms/site-settings-form";
import { getSiteSettings } from "@/lib/data/site-settings";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminSiteSettingsPage() {
  const fallback = await getSiteSettings();
  const svc = createSupabaseServiceClient();

  if (!svc) {
    return <SiteSettingsForm initial={fallback} />;
  }

  const { data, error } = await svc
    .from("site_settings")
    .select("ticker_text, ticker_active, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return <SiteSettingsForm key="fallback" initial={fallback} />;
  }

  return (
    <SiteSettingsForm
      key={String(data.updated_at ?? "1")}
      initial={{
        tickerText: String(data.ticker_text ?? ""),
        tickerActive: Boolean(data.ticker_active),
      }}
    />
  );
}
