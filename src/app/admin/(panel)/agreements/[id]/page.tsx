import { notFound, redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser, isSuperAdmin } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getAgreementById } from "@/lib/agreements/persistence";
import { AgreementForm } from "@/components/admin/agreements/agreement-form";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditAgreementPage({ params }: Props) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const agreement = await getAgreementById(id, true);
  if (!agreement) {
    notFound();
  }

  const isSuper = await isSuperAdmin(user);
  const canEditDiscount = isSuper || (await hasAdminPermission(user, "agreements.discount"));

  return (
    <div className="mx-auto max-w-5xl">
      <AgreementForm
        initialData={agreement}
        applicationId={agreement.applicationId}
        canEditDiscount={canEditDiscount}
        representativeDesignation={String(user.user_metadata?.designation || "Authorised representative")}
        representativeName={String(user.user_metadata?.full_name || user.email || "UniMondo Admissions Team")}
      />
    </div>
  );
}
