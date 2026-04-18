import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminJoinUsSubmissionsPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to view submissions.
      </p>
    );
  }

  const { data, error } = await svc.from("join_us_submissions").select("*").order("created_at", { ascending: false }).limit(200);

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Join us submissions</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migrations to create join_us_submissions."
            : error.message}
        </p>
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Join us submissions</h1>
        <p className="mt-1 text-sm text-zinc-600">Career applications from the Contact page (read only).</p>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">Recent submissions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Preferred location</th>
                <th className="px-4 py-3">Current location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {r.created_at ? new Date(r.created_at as string).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{String(r.full_name)}</td>
                  <td className="px-4 py-3">{String(r.email)}</td>
                  <td className="px-4 py-3">{String(r.phone)}</td>
                  <td className="max-w-[200px] px-4 py-3">{String(r.position_applying_for)}</td>
                  <td className="max-w-[180px] px-4 py-3">{String(r.preferred_location)}</td>
                  <td className="max-w-[180px] px-4 py-3">{r.current_location ? String(r.current_location) : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No submissions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
