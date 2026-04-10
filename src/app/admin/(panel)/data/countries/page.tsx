import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminCountriesPage() {
  const svc = createSupabaseServiceClient();
  const { data, error } = svc
    ? await svc.from("countries").select("id, name, highlighted, sort_order").order("sort_order", { ascending: true })
    : { data: null, error: null };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Countries</h1>
        <p className="mt-1 text-sm text-zinc-600">Destination content for the public Countries / Destinations experience.</p>
      </div>
      {!svc ? (
        <p className="text-sm text-amber-800">Configure SUPABASE_SERVICE_ROLE_KEY to load countries here.</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
          {(data ?? []).map((row: Record<string, unknown>) => (
            <li key={String(row.id)} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium text-zinc-900">{String(row.name)}</span>
              <span className="text-zinc-500">{row.highlighted ? "Priority" : ""}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-zinc-600">
        Edit full fields in Supabase → <strong>public.countries</strong> (why study, visa, universities array).
      </p>
      <Link
        href="https://supabase.com/dashboard"
        className="inline-flex text-sm font-medium text-amber-800 underline"
      >
        Supabase dashboard
      </Link>
    </div>
  );
}
