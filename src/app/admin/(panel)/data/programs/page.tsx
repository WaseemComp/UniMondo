import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminProgramsPage() {
  const svc = createSupabaseServiceClient();
  const { data, error } = svc
    ? await svc.from("program_openings").select("*").order("sort_order", { ascending: true })
    : { data: null, error: null };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Programs & openings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Rows power <strong>Current Openings</strong> and the homepage featured block. For bulk edits you can also use
          Supabase Table Editor.
        </p>
      </div>
      {!svc ? (
        <p className="text-sm text-amber-800">Configure SUPABASE_SERVICE_ROLE_KEY to load programs here.</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Program</th>
                <th className="px-3 py-2">University</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Intake</th>
                <th className="px-3 py-2">Published</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row: Record<string, unknown>) => (
                <tr key={String(row.id)} className="border-b border-zinc-100">
                  <td className="px-3 py-2 font-medium text-zinc-900">{String(row.program_name)}</td>
                  <td className="px-3 py-2 text-zinc-700">{String(row.university)}</td>
                  <td className="px-3 py-2">{String(row.country)}</td>
                  <td className="px-3 py-2">{String(row.intake)}</td>
                  <td className="px-3 py-2">{row.is_published ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-zinc-600">
        <Link href="https://supabase.com/dashboard/project/_/editor" className="font-medium text-amber-800 underline">
          Open Supabase Table Editor
        </Link>{" "}
        → public.program_openings → add/edit rows. Then refresh the public site (or wait up to ~1 minute).
      </p>
    </div>
  );
}
