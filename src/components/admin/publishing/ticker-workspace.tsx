"use client";
import { useState, useEffect, useCallback } from "react";
import { WorkflowPanel } from "./workflow-panel";
import { TickerAdminClient } from "@/components/admin/ticker-admin";
import { TickerSiteStripForm } from "@/components/admin/ticker-site-strip-form";
import { isWorking, rowsFor, type WorkflowView } from "@/lib/publishing/model";
export function TickerWorkspace() {
  const [view, setView] = useState<WorkflowView>(),
    [refresh, setRefresh] = useState(0),
    [stripDirty, setStripDirty] = useState(false),
    [linesDirty, setLinesDirty] = useState(false),
    [showPublished, setShowPublished] = useState(false);
  const dirty = stripDirty || linesDirty;
  const clearDirty = () => {
    setStripDirty(false);
    setLinesDirty(false);
  };
  const onStripDirty = useCallback(
      (dirty: boolean) => setStripDirty(dirty),
      [],
    ),
    onLinesDirty = useCallback((dirty: boolean) => setLinesDirty(dirty), []);
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        (event.target as Element).closest("a[href]") &&
        !confirm("Leave without saving your announcement changes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  const payload = view
      ? !showPublished && isWorking(view.document)
        ? view.document!.proposed
        : view.published
      : { tables: {} },
    settings = rowsFor(payload, "site_settings")[0];
  const locked =
    !view?.ready ||
    showPublished ||
    !view.permissions.edit ||
    Boolean(
      view.document && ["in_review", "approved"].includes(view.document.status),
    );
  return (
    <div>
      <h1 className="mb-5 text-3xl font-semibold">Announcement strip</h1>
      <WorkflowPanel
        resource={{ type: "home", key: "ticker" }}
        dirty={dirty}
        refresh={refresh}
        onLoad={(next, published) => {
          setView(next);
          setShowPublished(published);
          clearDirty();
        }}
      />
      {view && (
        <fieldset
          disabled={locked}
          className="space-y-5"
          key={String(view.document?.version ?? 0) + showPublished}
        >
          <TickerSiteStripForm
            initial={{
              tickerText: String(settings?.ticker_text ?? ""),
              tickerActive: Boolean(settings?.ticker_active),
            }}
            expectedVersion={view.document?.version ?? 0}
            onDirty={onStripDirty}
            beforeSave={() =>
              !linesDirty ||
              confirm(
                "Saving strip settings reloads the workspace. Discard unsaved edits in the announcement lines?",
              )
            }
            onSaved={() => {
              clearDirty();
              setRefresh((value) => value + 1);
            }}
          />
          <TickerAdminClient
            initial={rowsFor(payload, "news_ticker_items") as never}
            expectedVersion={view.document?.version ?? 0}
            onDirty={onLinesDirty}
            beforeSave={() =>
              !stripDirty ||
              confirm(
                "Saving announcement lines reloads the workspace. Discard unsaved strip-setting edits?",
              )
            }
            onSaved={() => {
              clearDirty();
              setRefresh((value) => value + 1);
            }}
          />
        </fieldset>
      )}
    </div>
  );
}
