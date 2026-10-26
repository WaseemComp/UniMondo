import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser } from "@/lib/auth/admin";
import { getAgreementsList } from "@/lib/agreements/persistence";
import { FileDown, FilePlus, FileText, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgreementsListPage() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    redirect("/admin/login");
  }

  const agreements = await getAgreementsList();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Student Retainer Agreements</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Authoritative educational consultancy retainer agreements · 0.7″ margins · Word, PDF &amp; Print
          </p>
        </div>
        <Link
          href="/admin/agreements/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#244B50] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a383c] transition"
        >
          <FilePlus className="h-4 w-4" />
          Create Agreement
        </Link>
      </div>

      {agreements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-3 text-base font-semibold text-zinc-900">No agreements generated yet</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Create a standalone agreement or create one directly from an existing application.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/admin/agreements/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#244B50] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a383c] transition"
            >
              <FilePlus className="h-4 w-4" />
              Create Standalone Agreement
            </Link>
            <Link
              href="/admin/applications"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            >
              Go to Applications
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Program &amp; Destination</th>
                  <th className="px-5 py-3.5">Currency &amp; Fee</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {agreements.map((agr) => {
                  const isPkr = agr.financials.paymentCurrency === "PKR";
                  return (
                    <tr key={agr.id} className="hover:bg-zinc-50/50 transition">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-zinc-900">
                        <Link href={`/admin/agreements/${agr.id}`} className="hover:text-teal-700 underline-offset-2 hover:underline">
                          {agr.referenceNumber}
                        </Link>
                        {agr.applicationId ? (
                          <span className="block text-[11px] font-normal text-zinc-400">
                            App: {agr.applicationId}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-zinc-900">{agr.studentFullName || "—"}</span>
                        {agr.studentEmail ? (
                          <span className="block text-xs text-zinc-500">{agr.studentEmail}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-600">
                        <span className="font-medium text-zinc-800">{agr.degreeLevel || "—"}</span>
                        {agr.preferredDestination ? <span> · {agr.preferredDestination}</span> : null}
                        {agr.academicYearIntake ? (
                          <span className="block text-zinc-400">{agr.academicYearIntake}</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs">
                        <span className="font-semibold text-zinc-900">
                          €{agr.financials.netFeeEUR.toLocaleString()}
                        </span>
                        {isPkr && agr.financials.netFeePKR != null ? (
                          <span className="block text-zinc-500">
                            Rs {agr.financials.netFeePKR.toLocaleString()}
                          </span>
                        ) : null}
                        {agr.financials.discountPercent > 0 ? (
                          <span className="inline-block mt-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            {agr.financials.discountPercent}% discount
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            agr.status === "finalized"
                              ? "bg-teal-50 text-teal-800"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {agr.status === "finalized" ? "Finalized" : "Draft"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-zinc-500">
                        {agr.agreementDate || new Date(agr.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/agreements/${agr.id}`}
                            className="rounded-lg border border-zinc-200 px-2.5 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 transition"
                          >
                            Edit
                          </Link>
                          <a
                            href={`/api/admin/agreements/${agr.id}/export?format=docx`}
                            title="Download Word (.docx)"
                            className="rounded-lg border border-amber-300 bg-amber-50 p-1.5 text-amber-900 hover:bg-amber-100 transition"
                          >
                            <FileDown className="h-4 w-4" />
                          </a>
                          <a
                            href={`/api/admin/agreements/${agr.id}/export?format=pdf`}
                            title="Download PDF"
                            className="rounded-lg bg-[#244B50] p-1.5 text-white hover:bg-[#1a383c] transition"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                          <Link
                            href={`/admin/agreements/${agr.id}/print`}
                            target="_blank"
                            title="Print Agreement"
                            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 transition"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
