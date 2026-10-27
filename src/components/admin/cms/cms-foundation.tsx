import type { ReactNode } from "react";
import { Check, Circle, FileText, Info } from "lucide-react";

export function CmsPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="cms-page-header"><div>{eyebrow && <p className="cms-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="cms-page-description">{description}</p>}</div>{actions && <div className="cms-page-actions">{actions}</div>}</div>;
}

export function CmsStatusBadge({ status }: { status: "published" | "draft" | "pending" | "saved" }) {
  const Icon = status === "published" || status === "saved" ? Check : Circle;
  return <span className={`cms-status cms-status-${status}`}><Icon size={12} aria-hidden />{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export function CmsEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="cms-empty-state"><span className="cms-empty-icon"><FileText size={22} aria-hidden /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function CmsNotice({ children }: { children: ReactNode }) {
  return <div className="cms-notice" role="status"><Info size={18} aria-hidden /><span>{children}</span></div>;
}

/** Phase 02 composition slots; no save, publish, upload or preview behavior is invented here. */
export function CmsEditorWorkspace({ sections, children, preview }: { sections: ReactNode; children: ReactNode; preview?: ReactNode }) {
  return <div className={`cms-editor-workspace${preview ? " cms-editor-with-preview" : ""}`}><aside className="cms-editor-sections" aria-label="Page sections">{sections}</aside><section className="cms-editor-fields" aria-label="Content editor">{children}</section>{preview && <aside className="cms-editor-preview" aria-label="Page preview">{preview}</aside>}</div>;
}

export function CmsPreviewPanel({ title = "Live preview", children }: { title?: string; children: ReactNode }) {
  return <section className="cms-preview-panel"><h2>{title}</h2><div>{children}</div></section>;
}

export function CmsActionArea({ children }: { children: ReactNode }) {
  return <div className="cms-action-area" aria-label="Editor actions">{children}</div>;
}

/** Future editors must receive the effective displayed value, never an empty technical fallback. */
export function CmsFieldContext({ source, description, action }: { source: "saved" | "inherited" | "default"; description: string; action?: ReactNode }) {
  return <div className="cms-field-context"><span className="cms-value-source">{source === "saved" ? "Saved value" : source === "inherited" ? "Inherited value" : "Default value"}</span><p>{description}</p>{action}</div>;
}
