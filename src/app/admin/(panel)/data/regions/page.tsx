import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { RegionsManager } from "@/components/admin/cms/regions-manager";
import type { RegionGroupRow } from "@/components/admin/cms/countries-manager";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminRegionsPage() {
  await assertAdminScope("academic");
  const svc = createSupabaseServiceClient();
  const { data, error } = svc
    ? await svc.from("region_groups").select("id, label, continent, sort_order").order("sort_order", { ascending: true })
    : { data: null, error: null };

  return (
    <div className="space-y-8">
      {!svc ? (
        <p className="text-sm text-amber-800">Configure SUPABASE_SERVICE_ROLE_KEY to load regions here.</p>
      ) : error ? (
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">Regions</h1>
          <p className="text-sm text-red-600">{error.message}</p>
          {error.message.includes("continent") ? (
            <p className="text-sm text-zinc-600">
              Apply the latest migration that adds <code className="rounded bg-zinc-100 px-1">continent</code> to{" "}
              <code className="rounded bg-zinc-100 px-1">region_groups</code>.
            </p>
          ) : null}
        </div>
      ) : (
        <RegionsManager regions={(data ?? []) as RegionGroupRow[]} />
      )}
    </div>
  );
}
