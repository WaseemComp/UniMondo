"use client";

import { Suspense, useCallback, useMemo } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ApplicationRecord, ApplicationType, ReviewStatus } from "@/types/application";
import { ApplicationRecordCard } from "@/components/admin/application-record-card";

const reviewStatuses: ReviewStatus[] = ["Pending", "Approved", "Need More Info", "Rejected", "Completed"];

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const data = (await response.json()) as { applications: ApplicationRecord[] };
  return data.applications || [];
};

type Props = {
  allowedTypes?: ApplicationType[];
  defaultType?: ApplicationType | "All";
  hideTypeFilter?: boolean;
  /** Base path for applicant detail URLs (Applications vs Submissions-backed list). */
  detailBasePath?: string;
};

const typeLabel: Record<ApplicationType, string> = {
  university: "University",
  language_course: "Language Course",
  work_with_us: "Work With Us",
  join_us: "Join Us",
};

function parseStatusParam(raw: string | null): ReviewStatus | "All" {
  if (!raw || raw === "All") return "All";
  return reviewStatuses.includes(raw as ReviewStatus) ? (raw as ReviewStatus) : "All";
}

function parseTypeParam(
  raw: string | null,
  allowed: ApplicationType[],
  hideTypeFilter: boolean,
  defaultType: ApplicationType | "All",
): ApplicationType | "All" {
  if (hideTypeFilter) {
    if (defaultType !== "All" && allowed.includes(defaultType as ApplicationType)) {
      return defaultType as ApplicationType;
    }
    return "All";
  }
  const t = raw as ApplicationType | null;
  if (t && allowed.includes(t)) return t;
  if (defaultType !== "All" && allowed.includes(defaultType as ApplicationType)) {
    return defaultType as ApplicationType;
  }
  return "All";
}

function AdminDashboardInner({
  allowedTypes,
  defaultType = "All",
  hideTypeFilter = false,
  detailBasePath = "/admin/applications",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowedList = allowedTypes ?? (["university", "language_course"] as ApplicationType[]);

  const statusFilter = useMemo(
    () => parseStatusParam(searchParams.get("status")),
    [searchParams],
  );

  const typeFilter = useMemo(
    () => parseTypeParam(searchParams.get("type"), allowedList, hideTypeFilter, defaultType),
    [searchParams, allowedList, hideTypeFilter, defaultType],
  );

  const syncQuery = useCallback(
    (patch: Partial<{ status: ReviewStatus | "All"; type: ApplicationType | "All" }>) => {
      const nextStatus = patch.status ?? statusFilter;
      const nextType = patch.type ?? typeFilter;
      const p = new URLSearchParams(searchParams.toString());

      if (nextStatus === "All") {
        p.delete("status");
      } else {
        p.set("status", nextStatus);
      }

      if (hideTypeFilter) {
        p.delete("type");
      } else if (nextType === "All") {
        p.delete("type");
      } else {
        p.set("type", nextType);
      }

      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, statusFilter, typeFilter, hideTypeFilter],
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (!hideTypeFilter && typeFilter !== "All") params.set("type", typeFilter);
    if (hideTypeFilter && typeFilter !== "All") params.set("type", typeFilter);
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [statusFilter, typeFilter, hideTypeFilter]);

  const listQuery = query.replace(/^\?/, "");

  const { data: applications = [], isLoading, mutate } = useSWR<ApplicationRecord[]>(
    `/api/applications${query}`,
    fetcher,
  );

  const updateStatus = async (trackingId: string, reviewStatus: ReviewStatus) => {
    const response = await fetch(`/api/applications/${encodeURIComponent(trackingId)}/status`, {
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
      toast.error(message || "Could not update review status. Check permissions or try again.");
      return;
    }

    toast.success(`Review status set to "${reviewStatus}"`);
    await mutate();
  };

  const deleteApplication = async (trackingId: string) => {
    if (
      !confirm(
        `Permanently delete application ${trackingId}? This removes the record and document metadata; uploaded files may remain in storage.`,
      )
    )
      return;

    const response = await fetch(`/api/applications/${encodeURIComponent(trackingId)}`, {
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
      toast.error(message || "Could not delete application. Check permissions or try again.");
      return;
    }

    toast.success("Application deleted.");
    await mutate();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                syncQuery({ status: event.target.value as ReviewStatus | "All" })
              }
              className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2"
            >
              <option value="All">All</option>
              {reviewStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Filter by type</span>
            {hideTypeFilter ? (
              <p className="text-sm text-zinc-500">Locked for this view</p>
            ) : (
              <select
                value={typeFilter}
                onChange={(event) =>
                  syncQuery({ type: event.target.value as ApplicationType | "All" })
                }
                className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2"
              >
                <option value="All">All</option>
                {allowedList.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel[t]}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      </section>

      {isLoading ? (
        <p className="text-sm text-zinc-600">Loading applications...</p>
      ) : (
        <section className="grid gap-4">
          {applications.map((application) => (
            <ApplicationRecordCard
              key={application.trackingId}
              application={application}
              typeLabel={typeLabel}
              detailBasePath={detailBasePath}
              listQuery={listQuery}
              onReviewStatus={updateStatus}
              onDelete={deleteApplication}
            />
          ))}

          {!applications.length && (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
              No applications available for this status.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export function AdminDashboard(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">Loading application filters…</p>}>
      <AdminDashboardInner {...props} />
    </Suspense>
  );
}
