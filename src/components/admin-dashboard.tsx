"use client";

import { useState } from "react";
import useSWR from "swr";
import { DOCUMENT_CATEGORY_LABELS, PROGRAM_LEVEL_LABELS } from "@/lib/apply/constants";
import type { DocumentCategory } from "@/lib/apply/constants";
import type { ApplicationRecord, ApplicationType, ReviewStatus } from "@/types/application";

function docCategoryLabel(category: string | undefined) {
  if (!category) return "Document";
  return DOCUMENT_CATEGORY_LABELS[category as DocumentCategory] ?? category.replace(/_/g, " ");
}

const reviewStatuses: ReviewStatus[] = ["Pending", "Approved", "Need More Info", "Rejected"];
const fetcher = async (url: string) => {
  const response = await fetch(url);
  const data = (await response.json()) as { applications: ApplicationRecord[] };
  return data.applications || [];
};

type Props = {
  allowedTypes?: ApplicationType[];
  defaultType?: ApplicationType | "All";
  hideTypeFilter?: boolean;
};

export function AdminDashboard({ allowedTypes, defaultType = "All", hideTypeFilter = false }: Props) {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<ApplicationType | "All">(defaultType);

  const typeLabel: Record<ApplicationType, string> = {
    university: "University",
    language_course: "Language Course",
    work_with_us: "Work With Us",
    join_us: "Join Us",
  };

  const query = (() => {
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (typeFilter !== "All") params.set("type", typeFilter);
    const s = params.toString();
    return s ? `?${s}` : "";
  })();
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
        <div className="flex flex-wrap gap-4">
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

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Filter by type</span>
            {hideTypeFilter ? (
              <p className="text-sm text-zinc-500">Locked for this view</p>
            ) : (
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as ApplicationType | "All")}
                className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2"
              >
                <option value="All">All</option>
                {(allowedTypes ?? (["university", "language_course"] as const)).map((t) => (
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
          {applications.map((application) => {
            const type = (application.applicationType ?? "university") as ApplicationType;
            const prefs = application.payload.programPreferences;
            const personal = application.payload.personalInfo;
            const academic = application.payload.academicBackground;
            const level = prefs.programLevel;
            const levelLabel =
              level && level in PROGRAM_LEVEL_LABELS ? PROGRAM_LEVEL_LABELS[level] : level ? level : "—";

            return (
              <article key={application.trackingId} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Tracking ID</p>
                    <h3 className="text-lg font-semibold text-zinc-900">{application.trackingId}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Submitted {new Date(application.submittedAt).toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                        {typeLabel[type]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">{personal.fullName}</p>
                    <p className="text-sm text-zinc-600">{personal.email}</p>
                    {type === "university" ? (
                      <p className="mt-2 text-sm text-zinc-700">
                        <span className="font-semibold text-zinc-900">Program level:</span> {levelLabel}
                      </p>
                    ) : null}
                    {application.payload.packageSelection?.packageName ? (
                      <p className="mt-1 text-sm text-zinc-700">
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

                <details className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/90 text-sm text-zinc-800">
                  <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-zinc-900">
                    Full application details &amp; attachments
                  </summary>
                  <div className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Contact</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-700">
                        <li>Phone: {personal.phone}</li>
                        {personal.dateOfBirth ? <li>Date of birth: {personal.dateOfBirth}</li> : null}
                        {personal.nationality ? <li>Nationality: {personal.nationality}</li> : null}
                      </ul>
                    </div>
                    {type === "university" ? (
                      <>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Academic</p>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-700">
                            <li>Highest qualification: {academic.highestQualification}</li>
                            <li>Institution: {academic.institutionName}</li>
                            <li>
                              Result (normalized to 4.0 scale for screening): {academic.gpa.toFixed(2)} / 4.0
                            </li>
                            <li>IELTS: {academic.ieltsScore}</li>
                            <li>Graduation year: {academic.graduationYear || "—"}</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Study preferences</p>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-700">
                            <li>Intake: {prefs.intake}</li>
                            <li>Program level: {levelLabel}</li>
                            <li>Preferred region: {prefs.preferredContinent}</li>
                            <li>
                              Destinations:{" "}
                              {prefs.destinationChoices.map((d) => `#${d.rank} ${d.country}`).join(" · ") || "—"}
                            </li>
                            <li>Program / field: {prefs.programInterest}</li>
                            {prefs.notes?.trim() ? <li>Notes: {prefs.notes}</li> : null}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Submission</p>
                        <pre className="mt-2 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-700">
                          {JSON.stringify(application.payload.submission?.data ?? {}, null, 2)}
                        </pre>
                      </div>
                    )}
                    {application.payload.sourceCountry || application.payload.sourceProgram ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Apply source</p>
                        <p className="mt-1 text-zinc-700">
                          {application.payload.sourceCountry ? <>Country: {application.payload.sourceCountry} </> : null}
                          {application.payload.sourceProgram ? <>· Program: {application.payload.sourceProgram}</> : null}
                        </p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Uploaded documents</p>
                      {application.documents.length === 0 ? (
                        <p className="mt-1 text-zinc-600">No files attached.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {application.documents.map((doc, i) => (
                            <li
                              key={`${doc.url}-${i}`}
                              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                            >
                              <div>
                                <p className="font-medium text-zinc-900">{doc.name}</p>
                                <p className="text-xs text-zinc-500">
                                  {docCategoryLabel(doc.category)}
                                  {doc.description?.trim() ? ` · ${doc.description}` : ""}
                                </p>
                              </div>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-500"
                              >
                                Open
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>

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
            );
          })}

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
