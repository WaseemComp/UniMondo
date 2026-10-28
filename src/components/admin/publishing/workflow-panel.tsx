"use client";
/* eslint-disable @next/next/no-img-element -- Comparison thumbnails preserve existing media hosts. */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  readContentWorkflow,
  transitionContent,
  readEarlierContentRevisions,
  readContentRevision,
} from "@/app/admin/cms/publishing-actions";
import {
  STATUS_LABELS,
  isWorking,
  type Resource,
  type WorkflowView,
} from "@/lib/publishing/model";
import {
  compareContent,
  withBaselineDefaults,
} from "@/lib/publishing/comparison";
import { safeDestination } from "@/lib/homepage/validation";
import { Button } from "@/components/ui/button";
export function WorkflowPanel({
  resource,
  dirty = false,
  busy = false,
  refresh = 0,
  onLoad,
}: {
  resource: Resource;
  dirty?: boolean;
  busy?: boolean;
  refresh?: number;
  onLoad: (view: WorkflowView, showPublished: boolean) => void;
}) {
  const [view, setView] = useState<WorkflowView>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [showPublished, setShowPublished] = useState(false);
  const { type: resourceType, key: resourceKey } = resource;
  const callback = useRef(onLoad);
  useEffect(() => {
    callback.current = onLoad;
  }, [onLoad]);
  useEffect(() => {
    let current = true;
    setView(undefined);
    setError("");
    setShowPublished(false);
    readContentWorkflow({ type: resourceType, key: resourceKey })
      .then((result) => {
        if (current) {
          setView(result);
          callback.current(result, false);
        }
      })
      .catch(() => {
        if (current)
          setError(
            "Private workflow information is unavailable. Reload before editing.",
          );
      });
    return () => {
      current = false;
    };
  }, [resourceType, resourceKey, refresh]);
  const d = view?.document,
    locked = busy || pending || dirty;
  async function act(action: string, revisionId?: string) {
    if (!view || !d || locked) return;
    if (
      action === "discard" &&
      !confirm(
        "Discard the saved private draft? Published content and revision history will remain intact.",
      )
    )
      return;
    if (
      action === "publish" &&
      !confirm("Publish this exact approved version to the live website now?")
    )
      return;
    setPending(true);
    setError("");
    try {
      const result = await transitionContent({
        resource,
        version: d.version,
        action,
        note,
        revisionId,
        approvedRevisionId: d.approved_revision_id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView(result.view);
      setNote("");
      setShowPublished(false);
      callback.current(result.view, false);
    } catch {
      setError("The action could not be confirmed. Reload before retrying.");
    } finally {
      setPending(false);
    }
  }
  const baseline = view?.baseline;
  const differences =
    view && d
      ? compareContent(
          baseline
            ? withBaselineDefaults(view.published, baseline)
            : view.published,
          baseline ? withBaselineDefaults(d.proposed, baseline) : d.proposed,
        )
      : [];
  return (
    <section
      aria-label="Content publishing workflow"
      className="mb-5 rounded-2xl border border-[#D9E5DE] bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2C786D]">
            Content workflow
          </p>
          <p className="mt-1 font-semibold" role="status">
            {dirty
              ? "Unsaved editing changes"
              : view
                ? d
                  ? STATUS_LABELS[d.status]
                  : "Current published content"
                : "Loading private workflow…"}
          </p>
          {d && (
            <p className="mt-1 text-xs text-zinc-500">
              Owner: {d.owner_label} · Updated by {d.updated_label} ·{" "}
              {new Date(d.updated_at).toLocaleString()}
            </p>
          )}
        </div>
        <Link
          href="/admin/publishing"
          className="text-sm font-semibold text-[#2C786D] underline"
        >
          Drafts & reviews
        </Link>
      </div>
      <p className="mt-3 text-sm text-zinc-600">
        Save Draft keeps changes private. Submit for review, then publish the
        approved version explicitly. Public visibility settings take effect only
        at publication.
      </p>
      {view && !view.ready && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {view.error}
        </p>
      )}
      {view?.ready && !view.publicationEnabled && (
        <p className="mt-3 rounded-xl bg-[#E1F2FC] p-3 text-sm">
          Private drafting and review are available. Live publication awaits the
          owner’s final activation after deployment.
        </p>
      )}
      {d?.note && (
        <p className="mt-3 rounded-lg bg-[#E1F2FC] p-3 text-sm">
          Reviewer’s note: {d.note}
        </p>
      )}
      {dirty && (
        <p className="mt-2 text-xs text-[#74855B]">
          Save or discard unsaved changes before using review or publishing
          controls.
        </p>
      )}
      {view?.ready && (
        <div className="mt-4 flex flex-wrap gap-2">
          {d &&
            ["draft", "changes_requested"].includes(d.status) &&
            view.permissions.edit && (
              <Button
                type="button"
                disabled={locked}
                onClick={() => act("submit")}
              >
                Submit for Review
              </Button>
            )}
          {d?.status === "in_review" && view.permissions.review && (
            <>
              <Button
                type="button"
                disabled={locked}
                onClick={() => act("approve")}
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={locked || !note.trim()}
                onClick={() => act("request_changes")}
              >
                Request Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={locked || !note.trim()}
                onClick={() => act("reject")}
              >
                Return Submission
              </Button>
            </>
          )}
          {d?.status === "approved" && view.permissions.publish && (
            <Button
              type="button"
              disabled={locked || !view.publicationEnabled}
              onClick={() => act("publish")}
            >
              Publish
            </Button>
          )}
          {d &&
            ["approved", "changes_requested"].includes(d.status) &&
            view.permissions.edit && (
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={() => act("return_to_draft")}
              >
                Return to Draft
              </Button>
            )}
          {d &&
            ["draft", "changes_requested", "approved"].includes(d.status) &&
            view.permissions.edit && (
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={() => act("discard")}
              >
                Discard Saved Draft
              </Button>
            )}
          {isWorking(d ?? null) && (
            <Button
              type="button"
              variant="outline"
              disabled={locked}
              onClick={() => {
                const next = !showPublished;
                setShowPublished(next);
                callback.current(view, next);
              }}
            >
              {showPublished ? "View Draft Preview" : "View Published Version"}
            </Button>
          )}
        </div>
      )}
      {view?.ready && d?.status === "in_review" && view.permissions.review && (
        <label className="mt-3 block text-sm font-medium">
          Explanation for requested changes
          <textarea
            value={note}
            maxLength={1500}
            rows={2}
            className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-sm"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      )}
      {showPublished && (
        <p className="mt-3 text-sm font-semibold text-[#3978A0]">
          Showing the current live version. Editing is disabled in this view.
        </p>
      )}
      {d?.status === "approved" && !showPublished && (
        <p className="mt-3 text-sm font-semibold text-[#74855B]">
          Approved but unpublished. The public website still uses the previous
          version.
        </p>
      )}
      {d && (
        <details className="mt-4 border-t border-zinc-200 pt-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Compare Changes · {differences.length}
          </summary>
          <div className="mt-3 space-y-3">
            {differences.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No value differences from the currently published content.
              </p>
            ) : (
              differences.map((change, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-200 p-3"
                >
                  <p className="text-sm font-semibold capitalize">
                    {change.label}
                  </p>
                  <div className="mt-2 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                    {[
                      ["Published", change.before],
                      ["Proposed", change.after],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-500">
                          {label}
                        </p>
                        {change.image && safeDestination(value) && (
                          <img
                            src={value}
                            alt={label + " image"}
                            className="my-2 h-20 max-w-full rounded-lg object-contain"
                          />
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      )}
      {view && (
        <details className="mt-3 border-t border-zinc-200 pt-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Revision History
          </summary>
          <p className="mt-2 text-xs text-zinc-500">
            History is retained. Restoring creates a new private draft and
            requires fresh review and approval.
          </p>
          <ol className="mt-3 space-y-3">
            {view.history.map((revision) => (
              <li
                key={revision.id}
                className="rounded-xl border border-zinc-200 p-3 text-sm"
              >
                <p className="font-semibold">
                  Revision {revision.revision_number} ·{" "}
                  {revision.event.replaceAll("_", " ")} ·{" "}
                  {STATUS_LABELS[revision.status]}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {revision.author_label} ·{" "}
                  {new Date(revision.created_at).toLocaleString()}
                </p>
                {revision.note && <p className="mt-2">{revision.note}</p>}
                <details
                  className="my-2"
                  onToggle={async (event) => {
                    if (!event.currentTarget.open || revision.proposed) return;
                    setPending(true);
                    try {
                      const loaded = await readContentRevision({
                        resource,
                        id: revision.id,
                      });
                      setView((current) =>
                        current
                          ? {
                              ...current,
                              history: current.history.map((row) =>
                                row.id === loaded.id ? loaded : row,
                              ),
                            }
                          : current,
                      );
                    } catch {
                      setError("Revision comparison could not be loaded.");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  <summary className="cursor-pointer text-xs">
                    View revision changes
                  </summary>
                  {revision.previous && revision.proposed ? (
                    compareContent(revision.previous, revision.proposed).map(
                      (change, index) => (
                        <p className="mt-2 break-words text-xs" key={index}>
                          <strong>{change.label}:</strong> {change.before} →{" "}
                          {change.after}
                        </p>
                      ),
                    )
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">
                      Loading revision comparison…
                    </p>
                  )}
                </details>
                {view.permissions.edit && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      locked ||
                      d?.status === "in_review" ||
                      d?.status === "approved"
                    }
                    onClick={() => act("restore", revision.id)}
                  >
                    Restore as Draft
                  </Button>
                )}
              </li>
            ))}
          </ol>
          {view.history.length > 0 &&
            view.history.at(-1)!.revision_number > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={async () => {
                  setPending(true);
                  try {
                    const older = await readEarlierContentRevisions({
                      resource,
                      before: view.history.at(-1)!.revision_number,
                    });
                    setView({ ...view, history: [...view.history, ...older] });
                  } catch {
                    setError("Earlier history could not be loaded.");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Load Earlier Revisions
              </Button>
            )}
          {!view.history.length && (
            <p className="mt-3 text-sm text-zinc-500">
              Existing public content has no new workflow revisions yet. No
              records have been reset.
            </p>
          )}
        </details>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </section>
  );
}
