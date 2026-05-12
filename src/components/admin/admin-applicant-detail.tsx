"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import type { ApplicationRecord, ApplicationType, ReviewStatus } from "@/types/application";
import { ApplicationRecordCard } from "@/components/admin/application-record-card";

const typeLabel: Record<ApplicationType, string> = {
  university: "University",
  language_course: "Language Course",
  work_with_us: "Work With Us",
  join_us: "Join Us",
};

async function fetchApplicant(url: string): Promise<ApplicationRecord> {
  const response = await fetch(url);
  const data = (await response.json()) as { message?: string; application?: ApplicationRecord };
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load application.");
  }
  return data.application as ApplicationRecord;
}

type Props = {
  trackingId: string;
  /** List page URL without query string (filters appended from current URL). */
  listBaseHref: string;
  detailBasePath: string;
};

export function AdminApplicantDetail({ trackingId, listBaseHref, detailBasePath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const listHref = `${listBaseHref.replace(/\/+$/, "")}${listQuery ? `?${listQuery}` : ""}`;

  const { data: application, error, isLoading, mutate } = useSWR<ApplicationRecord>(
    `/api/applications/${encodeURIComponent(trackingId)}`,
    fetchApplicant,
  );

  const updateStatus = async (id: string, reviewStatus: ReviewStatus) => {
    const response = await fetch(`/api/applications/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });

    let message = "";
    try {
      const j = (await response.json()) as { message?: unknown };
      message = typeof j.message === "string" ? j.message : "";
    } catch {
      /* ignore */
    }

    if (!response.ok) {
      toast.error(message || "Could not update review status.");
      return;
    }

    toast.success(`Review status set to "${reviewStatus}"`);
    await mutate();
  };

  const deleteApplication = async (id: string) => {
    if (
      !confirm(
        `Permanently delete application ${id}? This removes the record and document metadata; uploaded files may remain in storage.`,
      )
    )
      return;

    const response = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    let message = "";
    try {
      const j = (await response.json()) as { message?: unknown };
      message = typeof j.message === "string" ? j.message : "";
    } catch {
      /* ignore */
    }

    if (!response.ok) {
      toast.error(message || "Could not delete application.");
      return;
    }

    toast.success("Application deleted.");
    router.push(listHref);
  };

  if (isLoading) {
    return <p className="text-sm text-zinc-600">Loading applicant…</p>;
  }

  if (error || !application) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-900">
        {error instanceof Error ? error.message : "Could not load this application."}
        <div className="mt-4">
          <Link href={listHref} className="font-semibold text-amber-950 underline hover:no-underline">
            ← Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={listHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-950 hover:underline"
      >
        ← Back to list
      </Link>
      <ApplicationRecordCard
        application={application}
        typeLabel={typeLabel}
        detailBasePath={detailBasePath}
        listQuery={listQuery}
        defaultOpenDetails
        onReviewStatus={updateStatus}
        onDelete={deleteApplication}
      />
    </div>
  );
}
