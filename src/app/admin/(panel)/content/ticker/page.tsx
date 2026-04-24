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
          When <strong className="font-medium text-zinc-800">Show ticker</strong> is on in{" "}
          <a href="/admin/settings" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Admin → Settings
          </a>
          , published lines below scroll in the gold strip <strong className="font-medium text-zinc-800">directly under the main navigation</strong> on
          every public page. If no lines are published here, the fallback single message from Settings is used instead.
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
