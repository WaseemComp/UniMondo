import { notFound, redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser } from "@/lib/auth/admin";
import { validateAgreementForExport } from "@/lib/agreements/financials";
import { getAgreementById, getAgreementRevision } from "@/lib/agreements/persistence";
import { PrintAgreementClient } from "@/components/admin/agreements/print-agreement-client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
};

export const dynamic = "force-dynamic";

export default async function PrintAgreementPage({ params, searchParams }: Props) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const { revision } = await searchParams;
  if (revision && !/^[1-9][0-9]*$/.test(revision)) notFound();
  const agreement = revision ? await getAgreementRevision(id, Number(revision)) : await getAgreementById(id);
  if (!agreement) {
    notFound();
  }

  const errors = validateAgreementForExport({ ...agreement, ...agreement.financials });
  if (agreement.status !== "finalized" && errors.length) return <p role="alert">Complete the required agreement fields before printing: {errors.map(error => error.message).join(" ")}</p>;

  return <PrintAgreementClient agreement={agreement} />;
}
