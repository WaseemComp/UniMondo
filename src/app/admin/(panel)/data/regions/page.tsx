import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminRegionsPage() {
  const svc = createSupabaseServiceClient();
  const { data, error } = svc
    ? await svc.from("region_groups").select("id, label, sort_order").order("sort_order", { ascending: true })
    : { data: null, error: null };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Regions</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Region group labels (e.g. Western Europe). Linked from countries and used in program filters.
        </p>
      </div>
      {!svc ? (
        <p className="text-sm text-amber-800">Configure SUPABASE_SERVICE_ROLE_KEY to load regions here.</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
          {(data ?? []).map((row: Record<string, unknown>) => (
            <li key={String(row.id)} className="px-4 py-3 text-sm font-medium text-zinc-900">
              {String(row.label)}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-zinc-600">Add or rename carefully — existing programs reference these labels as text.</p>
    </div>
  );
}
