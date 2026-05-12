import { Suspense } from "react";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { AdminApplicantDetail } from "@/components/admin/admin-applicant-detail";

type Props = {
  params: Promise<{ trackingId: string }>;
};

export default async function AdminApplicationDetailPage({ params }: Props) {
  await assertAdminScope("applications");
  const { trackingId } = await params;
  const decoded = decodeURIComponent(trackingId);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Applicant detail</h1>
        <p className="mt-1 font-mono text-sm text-zinc-600">{decoded}</p>
      </header>
      <Suspense fallback={<p className="text-sm text-zinc-600">Loading…</p>}>
        <AdminApplicantDetail
          trackingId={decoded}
          listBaseHref="/admin/applications"
          detailBasePath="/admin/applications"
        />
      </Suspense>
    </div>
  );
}
