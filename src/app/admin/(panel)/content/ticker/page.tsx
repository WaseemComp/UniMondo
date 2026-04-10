import { TickerAdminClient } from "@/components/admin/ticker-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminTickerPage() {
  const svc = createSupabaseServiceClient();
  const rows = svc
    ? (await svc.from("news_ticker_items").select("id, message, href, sort_order, is_published").order("sort_order"))
        .data ?? []
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">News ticker</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Lines appear under the main navigation on the public site when “Show ticker” is enabled on the homepage
          content screen.
        </p>
      </div>
      {!svc ? (
        <p className="text-sm text-amber-800">Set SUPABASE_SERVICE_ROLE_KEY to manage ticker items from here.</p>
      ) : (
        <TickerAdminClient initial={rows as never} />
      )}
    </div>
  );
}
