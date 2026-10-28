import { staffIdentity } from "@/lib/auth/staff-identity";
import { redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser, isSuperAdmin } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getApplications } from "@/lib/persistence";
import { AgreementForm } from "@/components/admin/agreements/agreement-form";
import type { AgreementFormInput } from "@/types/agreement";

type Props = {
  searchParams: Promise<{ applicationId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function NewAgreementPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    redirect("/admin/login");
  }

  const { applicationId } = await searchParams;

  const isSuper = await isSuperAdmin(user);
  const canEditDiscount = isSuper || (await hasAdminPermission(user, "agreements.discount"));

  let prefill: Partial<AgreementFormInput> | null = null;

  if (applicationId) {
    try {
      const apps = await getApplications({});
      const app = apps.find((a) => a.trackingId === applicationId);
      if (app) {
        const payload = app.payload;
        const personal = payload.personalInfo;
        const academic = payload.academicBackground;
        const prefs = payload.programPreferences;

        prefill = {
          applicationId: app.trackingId,
          studentFullName: personal.fullName || "",
          studentEmail: personal.email || "",
          studentPhone: personal.phone || "",
          studentAddress: "",
          studentParentGuardian: "",
          studentCnicPassport: "",
          degreeLevel: academic.highestQualification || "Master's Degree",
          fieldOfStudy: prefs.programInterest || "",
          preferredDestination: prefs.destinationChoices?.[0]?.country || "Germany",
          academicYearIntake: prefs.intake || "Fall 2026",
          repName: user.email ? user.email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "UniMondo Admissions Team",
        };
      }
    } catch (err) {
      console.warn("[NewAgreementPage] Failed to prefill from application:", err);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <AgreementForm
        applicationId={applicationId}
        prefill={prefill}
        canEditDiscount={canEditDiscount}
        canEditProtectedClauses={isSuper}
        representativeDesignation={staffIdentity(user).designation || "Authorised representative"}
        representativeName={staffIdentity(user).fullName || "UniMondo Admissions Team"}
      />
    </div>
  );
}
