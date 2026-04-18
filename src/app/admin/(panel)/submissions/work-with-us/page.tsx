import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminWorkWithUsSubmissionsPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to view submissions.
      </p>
    );
  }

  const { data, error } = await svc
    .from("work_with_us_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Work with us submissions</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migrations to create work_with_us_submissions."
            : error.message}
        </p>
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Work with us submissions</h1>
        <p className="mt-1 text-sm text-zinc-600">Partnership inquiries from the Contact page (read only).</p>
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
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Collaboration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {r.created_at ? new Date(r.created_at as string).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{String(r.entity_type)}</td>
                  <td className="max-w-[180px] px-4 py-3">{r.organization_name ? String(r.organization_name) : "—"}</td>
                  <td className="max-w-[160px] px-4 py-3 font-medium text-zinc-900">{String(r.contact_person_name)}</td>
                  <td className="px-4 py-3">{String(r.email)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{String(r.phone)}</td>
                  <td className="max-w-xs px-4 py-3 text-zinc-700">
                    {String(r.collaboration_nature)}
                    {r.collaboration_other ? (
                      <span className="mt-1 block text-xs text-zinc-500">{String(r.collaboration_other)}</span>
                    ) : null}
                  </td>
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
