"use client";
import { useEffect, useState } from "react";
import { WorkflowPanel } from "./workflow-panel";
import { HomepageStoriesEditor } from "@/components/admin/homepage/homepage-stories-editor";
import { homepageWorkflowPreview } from "@/lib/publishing/preview";
import type { HomepageEditorData } from "@/lib/admin/homepage-editor";
import "@/components/admin/homepage/homepage-editor.css";
export function StoriesWorkspace({ initial }: { initial: HomepageEditorData }) {
  const [data, setData] = useState(initial),
    [published, setPublished] = useState(initial),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<string>(),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]");
      if (
        anchor &&
        anchor.getAttribute("target") !== "_blank" &&
        !confirm("Leave without saving these testimonial changes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  return (
    <div className="hp-editor">
      <h1 className="mb-5 text-3xl font-semibold">Success stories</h1>
      <WorkflowPanel
        resource={{ type: "home", key: "testimonials" }}
        dirty={dirty}
        busy={busy}
        refresh={refresh}
        onLoad={(view, showPublished) => {
          if (!view.ready) {
            setReady(false);
            return;
          }
          const live = homepageWorkflowPreview(published, view, true),
            working = homepageWorkflowPreview(live, view, showPublished),
            editable =
              !showPublished &&
              (!view.document ||
                !["in_review", "approved"].includes(view.document.status));
          setPublished(live);
          setData({
            ...working,
            permissions: {
              ...initial.permissions,
              storyCreate: editable && initial.permissions.storyCreate,
              storyEdit: editable && initial.permissions.storyEdit,
              storyArchive: editable && initial.permissions.storyArchive,
            },
          });
          setReady(true);
          setDirty(false);
          setRevision((value) => value + 1);
        }}
      />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <HomepageStoriesEditor
          key={revision}
          data={ready ? data : { ...data, available: false }}
          section="success_stories"
          initialSelection={selected}
          onDirty={setDirty}
          onBusy={setBusy}
          onRows={(_rows, id) => {
            setSelected(id);
            setDirty(false);
            setReady(false);
            setRefresh((value) => value + 1);
          }}
        />
      </div>
    </div>
  );
}
