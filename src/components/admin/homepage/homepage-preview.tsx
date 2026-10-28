"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone, Expand, X } from "lucide-react";
import { HomepageSection } from "@/components/home/homepage-section";
import type { HomepageEditorData } from "@/lib/admin/homepage-editor";
import type { HeroSlide, SectionId } from "@/lib/homepage/content";
import { safeImage } from "@/lib/homepage/validation";

const FRAME_DOCUMENT = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="section-preview"></div></body></html>';

/** Real components in an isolated document: viewport breakpoints and public fonts stay accurate. */
function PreviewFrame({ mode, children, onSelectItem, selectedItem, label = "homepage section" }: { label?: string; mode: "desktop" | "mobile"; children: ReactNode; onSelectItem?: (id:string)=>void; selectedItem?:string }) {
  const container = useRef<HTMLDivElement>(null);
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);
  const [width, setWidth] = useState(400);
  const viewportWidth = mode === "desktop" ? 1120 : 390;
  const viewportHeight = mode === "desktop" ? 800 : 844;
  const scale = Math.min(1, width / viewportWidth);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!frameDocument) return;
    const decorate = () => {
      frameDocument.querySelectorAll("a,button,input,select,textarea").forEach(element => { element.setAttribute("tabindex", "-1"); element.setAttribute("aria-disabled", "true"); if (element instanceof frameDocument.defaultView!.HTMLInputElement || element instanceof frameDocument.defaultView!.HTMLSelectElement || element instanceof frameDocument.defaultView!.HTMLTextAreaElement || element instanceof frameDocument.defaultView!.HTMLButtonElement) element.disabled = true; });
      frameDocument.querySelectorAll("[data-home-item]").forEach(element => { if (onSelectItem) {element.setAttribute("tabindex","0");element.setAttribute("role","button");element.setAttribute("aria-label",`Edit ${element.querySelector("h3")?.textContent || element.textContent?.trim().slice(0,100) || "homepage item"}`);} const selected = element.getAttribute("data-home-item")===selectedItem; if(selected)element.setAttribute("data-preview-selected","");else element.removeAttribute("data-preview-selected"); });
    };
    decorate(); const observer = new MutationObserver(decorate); observer.observe(frameDocument.body,{childList:true,subtree:true}); return () => observer.disconnect();
  }, [frameDocument, onSelectItem, selectedItem, children]);
  return <div ref={container} className="hp-preview-frame-wrap" style={{ height: viewportHeight * scale }}>
    <iframe title={`${mode === "desktop" ? "Desktop" : "Mobile"} ${label} preview`} className="hp-preview-frame" tabIndex={0} sandbox="allow-same-origin" srcDoc={FRAME_DOCUMENT}
      style={{ width: viewportWidth, height: viewportHeight, transform: `scale(${scale})`, left: Math.max(0, (width - viewportWidth * scale) / 2) }}
      onLoad={event => {
        const doc = event.currentTarget.contentDocument;
        if (!doc) return;
        doc.documentElement.className = document.documentElement.className;
        for (const property of ["--font-sans", "--font-editorial", "--font-heading"]) doc.documentElement.style.setProperty(property, getComputedStyle(document.documentElement).getPropertyValue(property));
        doc.querySelectorAll('[data-preview-style]').forEach(node => node.remove());
        for (const node of document.head.querySelectorAll('link[rel="stylesheet"],style')) {
          const clone = node.cloneNode(true) as HTMLElement;
          clone.setAttribute("data-preview-style", ""); doc.head.appendChild(clone);
        }
        const style = doc.createElement("style");
        style.textContent = 'a,button,input,select,textarea{pointer-events:none!important}[data-home-item]{cursor:pointer}[data-home-item][data-preview-selected]{outline:3px solid #2c786d;outline-offset:-3px}body{margin:0;background:#F8F7F3;background-image:none}*{scroll-behavior:auto!important;animation:none!important;transition:none!important}[style*="opacity: 0"]{opacity:1!important;transform:none!important}';
        style.setAttribute("data-preview-style", ""); doc.head.appendChild(style);
        setFrameDocument(doc);
      }} />
    {frameDocument?.getElementById("section-preview") && createPortal(<div className="um-public-theme" onClickCapture={event => { event.preventDefault(); event.stopPropagation(); const item = (event.target as Element).closest("[data-home-item]"); if(item && onSelectItem) onSelectItem(item.getAttribute("data-home-item")!); }} onKeyDownCapture={event=>{ if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();const item=(event.target as Element).closest("[data-home-item]");if(item&&onSelectItem)onSelectItem(item.getAttribute("data-home-item")!);}}} onSubmitCapture={event => {event.preventDefault();event.stopPropagation();}}>{children}</div>, frameDocument.getElementById("section-preview")!)}
  </div>;
}

export function HomepageSectionRendering({section,data,slide,selectedItem}:{section:SectionId;data:HomepageEditorData;slide:HeroSlide;selectedItem?:string}) {
  if(section==="hero"&&!safeImage(slide.src,process.env.NEXT_PUBLIC_SUPABASE_URL))return <p className="hp-preview-unavailable">Choose a supported image to preview this slide.</p>;
  const renderData={...data,countries:data.references?.countries??[],universities:data.references?.universities??[]};
  return <HomepageSection section={section} data={renderData} slide={section==="hero"?slide:undefined} selectedItem={selectedItem} preview/>;
}

export function HomepagePreview({ children, dirty, hidden, onSelectItem, selectedItem, label = "homepage section", hiddenMessage }: { label?: string; hiddenMessage?: string; children: ReactNode; dirty: boolean; hidden: boolean; onSelectItem?:(id:string)=>void; selectedItem?:string }) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const dialog = useRef<HTMLDialogElement>(null);
  const modes = <div className="hp-preview-modes" role="group" aria-label="Preview device"><button type="button" aria-pressed={mode === "desktop"} onClick={() => setMode("desktop")}><Monitor size={15} aria-hidden />Desktop</button><button type="button" aria-pressed={mode === "mobile"} onClick={() => setMode("mobile")}><Smartphone size={15} aria-hidden />Mobile</button></div>;
  return <aside className="hp-preview-panel" aria-label="Live section preview"><div className="hp-panel-heading"><div><p className="cms-eyebrow">LIVE PREVIEW</p><h2>Your website, as you edit</h2></div><button type="button" className="cms-icon-button" aria-label="Expand preview" onClick={() => dialog.current?.showModal()}><Expand size={17} /></button></div>
    <div className="hp-preview-toolbar">{modes}<span className={`hp-preview-state ${dirty ? "is-unsaved" : ""}`}>{dirty ? "Unsaved preview" : "Current content"}</span></div>
    {hidden && <p className="hp-preview-note">{hiddenMessage ?? "This slide is hidden. Preview shows how it would look if made visible."}</p>}
    <PreviewFrame label={label} mode={mode} onSelectItem={onSelectItem} selectedItem={selectedItem}>{children}</PreviewFrame>
    <button type="button" className="hp-edit-jump" onClick={() => document.querySelector(".hp-fields-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Back to editing</button>
    <p className="hp-preview-footnote">Actual website components · {mode === "desktop" ? "1120 × 800" : "390 × 844"} viewport. Links and forms are disabled. Select an editable item or use the item list.</p>
    <dialog ref={dialog} className="hp-expanded-preview" aria-labelledby="hp-expanded-title"><div className="hp-panel-heading"><h2 id="hp-expanded-title">{label === "homepage section" ? "Homepage section" : label} preview</h2><button type="button" className="cms-icon-button" onClick={() => dialog.current?.close()} aria-label="Close expanded preview"><X size={20} /></button></div><div className="hp-preview-toolbar">{modes}<span className="hp-preview-state">{dirty ? "Unsaved preview" : "Current content"}</span></div><PreviewFrame label={label} mode={mode} onSelectItem={onSelectItem} selectedItem={selectedItem}>{children}</PreviewFrame></dialog>
  </aside>;
}
