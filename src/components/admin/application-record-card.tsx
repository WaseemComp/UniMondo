"use client";

import Link from "next/link";
import { DOCUMENT_CATEGORY_LABELS, PROGRAM_LEVEL_LABELS } from "@/lib/apply/constants";
import type { DocumentCategory } from "@/lib/apply/constants";
import type { ApplicationRecord, ApplicationType, ReviewStatus } from "@/types/application";

const reviewStatuses: ReviewStatus[] = ["Pending", "Approved", "Need More Info", "Rejected", "Completed"];

function docCategoryLabel(category: string | undefined) {
  if (!category) return "Document";
  return DOCUMENT_CATEGORY_LABELS[category as DocumentCategory] ?? category.replace(/_/g, " ");
}

function humanizePipelineStatus(s: string | undefined) {
  const t = (s ?? "").trim();
  if (!t) return "—";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type ApplicationRecordCardProps = {
  application: ApplicationRecord;
  typeLabel: Record<ApplicationType, string>;
  /** Prefix before `/{trackingId}` (e.g. `/admin/applications` or `/admin/submissions/detail`). */
  detailBasePath: string;
  listQuery?: string;
  defaultOpenDetails?: boolean;
  onReviewStatus: (trackingId: string, reviewStatus: ReviewStatus) => void;
  onDelete: (trackingId: string) => void;
};

export function ApplicationRecordCard({
  application,
  typeLabel,
  detailBasePath,
  listQuery = "",
  defaultOpenDetails = false,
  onReviewStatus,
  onDelete,
}: ApplicationRecordCardProps) {
  const type = (application.applicationType ?? "university") as ApplicationType;
  const prefs = application.payload.programPreferences;
  const personal = application.payload.personalInfo;
  const academic = application.payload.academicBackground;
  const level = prefs.programLevel;
  const levelLabel =
    level && level in PROGRAM_LEVEL_LABELS ? PROGRAM_LEVEL_LABELS[level] : level ? level : "—";

  const base = detailBasePath.replace(/\/+$/, "");
  const detailHref = `${base}/${encodeURIComponent(application.trackingId)}${listQuery ? `?${listQuery.replace(/^\?/, "")}` : ""}`;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Tracking ID</p>
          <h3 className="text-lg font-semibold text-zinc-900">
            <Link
              href={detailHref}
              className="text-amber-900 hover:text-amber-950 hover:underline"
            >
              {application.trackingId}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-zinc-500">Submitted {new Date(application.submittedAt).toLocaleString()}</p>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
              {typeLabel[type]}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-700">{personal.fullName}</p>
          <p className="text-sm text-zinc-600">{personal.email}</p>
          <p className="mt-2 text-sm">
            <Link href={detailHref} className="font-medium text-amber-800 hover:underline">
              Open applicant detail →
            </Link>
          </p>
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
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/api/applications/${encodeURIComponent(application.trackingId)}/export?type=pdf`}
              className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:border-amber-500"
            >
              Application form (PDF)
            </a>
            <a
              href={`/api/applications/${encodeURIComponent(application.trackingId)}/export?type=zip`}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:border-zinc-500"
            >
              All attachments (ZIP)
            </a>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-semibold text-zinc-900">Screening:</span> {application.screeningTag}
          </p>
          <p>
            <span className="font-semibold text-zinc-900">Review:</span> {application.reviewStatus}
          </p>
          <p>
            <span className="font-semibold text-zinc-900">Filing:</span>{" "}
            {humanizePipelineStatus(application.pipelineStatus ?? "submitted")}
          </p>
        </div>
      </div>

      <details open={defaultOpenDetails} className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/90 text-sm text-zinc-800">
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
                  <li>Result (normalized to 4.0 scale for screening): {academic.gpa.toFixed(2)} / 4.0</li>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Downloads</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`/api/applications/${encodeURIComponent(application.trackingId)}/export?type=pdf`}
                className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:border-amber-500"
              >
                Download application form (PDF)
              </a>
              <a
                href={`/api/applications/${encodeURIComponent(application.trackingId)}/export?type=zip`}
                className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:border-zinc-500"
              >
                Download all attachments (ZIP)
              </a>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              ZIP includes all uploaded files, package and add-on details, and the application form PDF named with the
              tracking ID.
            </p>
          </div>
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

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Review actions</p>
        <div className="flex flex-wrap gap-2">
          {reviewStatuses.map((status) => (
            <button
              key={status}
              type="button"
              disabled={application.reviewStatus === status}
              onClick={() => onReviewStatus(application.trackingId, status)}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set review: {status}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onDelete(application.trackingId)}
            className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:border-red-400"
          >
            Delete application
          </button>
        </div>
      </div>
    </article>
  );
}
