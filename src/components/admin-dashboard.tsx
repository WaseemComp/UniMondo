"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ApplicationRecord, ReviewStatus } from "@/types/application";

const reviewStatuses: ReviewStatus[] = ["Pending", "Approved", "Need More Info", "Rejected"];
const fetcher = async (url: string) => {
  const response = await fetch(url);
  const data = (await response.json()) as { applications: ApplicationRecord[] };
  return data.applications || [];
};

export function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "All">("All");
  const query = statusFilter === "All" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
  const { data: applications = [], isLoading, mutate } = useSWR<ApplicationRecord[]>(
    `/api/applications${query}`,
    fetcher
  );


  const updateStatus = async (trackingId: string, reviewStatus: ReviewStatus) => {
    await fetch(`/api/applications/${trackingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });

    await mutate();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="space-y-1 text-sm text-zinc-700">
          <span className="font-medium">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ReviewStatus | "All")}
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
      </section>

      {isLoading ? (
        <p className="text-sm text-zinc-600">Loading applications...</p>
      ) : (
        <section className="grid gap-4">
          {applications.map((application) => (
            <article key={application.trackingId} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Tracking ID</p>
                  <h3 className="text-lg font-semibold text-zinc-900">{application.trackingId}</h3>
                  <p className="mt-1 text-sm text-zinc-700">{application.payload.personalInfo.fullName}</p>
                  <p className="text-sm text-zinc-600">{application.payload.personalInfo.email}</p>
                  {application.payload.packageSelection?.packageName ? (
                    <p className="mt-2 text-sm text-zinc-700">
                      <span className="font-semibold text-zinc-900">Package:</span>{" "}
                      {application.payload.packageSelection.packageName}
                      {application.payload.packageSelection.addonIds?.length ? (
                        <span className="text-zinc-600">
                          {" "}
                          · {application.payload.packageSelection.addonIds.length} add-on(s)
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-semibold text-zinc-900">Screening:</span> {application.screeningTag}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-900">Review:</span> {application.reviewStatus}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(["Approved", "Need More Info", "Rejected"] as ReviewStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateStatus(application.trackingId, status)}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500"
                  >
                    Mark {status}
                  </button>
                ))}
              </div>
            </article>
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
