import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser } from "@/lib/auth/admin";
import { getAgreementById, getAgreementRevisions } from "@/lib/agreements/persistence";

export const dynamic = "force-dynamic";
export default async function AgreementHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await createSupabaseServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || !await isAdminUser(user)) redirect("/admin/login");
  const { id } = await params;
  const agreement = await getAgreementById(id);
  if (!agreement) notFound();
  const revisions = await getAgreementRevisions(id);
  return <div className="space-y-5">
    <Link href="/admin/agreements" className="underline">Back to Agreements</Link>
    <h1 className="text-xl font-bold">Finalized revisions — {agreement.referenceNumber}</h1>
    <p className="text-sm text-zinc-600">Each revision preserves the content and financial snapshot finalized at that time.</p>
    {!revisions.length ? <p>No finalized revisions yet.</p> : <table className="w-full text-left text-sm">
      <thead><tr><th>Revision</th><th>Finalized by</th><th>Date</th><th>Documents</th></tr></thead>
      <tbody>{revisions.map(revision => <tr key={revision.revision_no} className="border-b border-zinc-200">
        <td className="py-4">{revision.revision_no}{revision.revision_no < (agreement.revisionNumber || 0) ? " (superseded)" : ""}</td>
        <td>{revision.author}</td><td>{new Date(revision.finalized_at).toLocaleString("en-GB", { timeZone: "Europe/Rome" })}</td>
        <td className="space-x-3">
          <Link href={`/admin/agreements/${id}/print?revision=${revision.revision_no}`} target="_blank" className="underline">View</Link>
          <a href={`/api/admin/agreements/${id}/export?format=docx&revision=${revision.revision_no}`} className="underline">Download Word</a>
          <a href={`/api/admin/agreements/${id}/export?format=pdf&revision=${revision.revision_no}`} className="underline">Download PDF</a>
        </td>
      </tr>)}</tbody>
    </table>}
  </div>;
}
