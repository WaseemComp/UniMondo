import { TickerAdminClient } from "@/components/admin/ticker-admin";
import { TickerSiteStripForm } from "@/components/admin/ticker-site-strip-form";
import { getSiteSettings } from "@/lib/data/site-settings";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminTickerPage() {
  const svc = createSupabaseServiceClient();
  const settings = await getSiteSettings();
  const rows = svc
    ? (await svc.from("news_ticker_items").select("id, message, href, sort_order, is_published").order("sort_order"))
        .data ?? []
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">News ticker</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Control the <strong>gold strip under the main navigation</strong> on every public page. Publish one or more
          lines here; the strip can link to a page (optional) or show text only. Use the block below to turn the strip
          on/off and set a fallback if no lines are published.
        </p>
      </div>
      {!svc ? (
        <p className="text-sm text-amber-800">Set SUPABASE_SERVICE_ROLE_KEY to save strip settings and ticker lines.</p>
      ) : (
        <>
          <TickerSiteStripForm
            initial={{
              tickerText: settings.tickerText,
              tickerActive: settings.tickerActive,
            }}
          />
          <div>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">Ticker lines</h2>
            <TickerAdminClient initial={rows as never} />
          </div>
        </>
      )}
    </div>
  );
}
