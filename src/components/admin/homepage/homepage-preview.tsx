"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone, Expand, X } from "lucide-react";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { HomeMarketingBanner } from "@/components/home/home-marketing-banner";
import { WhyUniMondo } from "@/components/home/why-unimondo";
import { PopularDestinations } from "@/components/home/popular-destinations";
import { FeaturedPrograms } from "@/components/home/featured-programs";
import { SuccessStoriesSection } from "@/components/home/success-stories-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { WhyEurope } from "@/components/home/why-europe";
import { JourneyCta } from "@/components/home/journey-cta";
import type { HomepageEditorData } from "@/lib/admin/homepage-editor";
import { resolveGlobalHero, resolveSection, valuesOf, type HeroCopy, type HeroSlide, type SectionId } from "@/lib/homepage/content";
import { safeImage } from "@/lib/homepage/validation";

const FRAME_DOCUMENT = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="section-preview"></div></body></html>';

/** Real components in an isolated document: viewport breakpoints and public fonts stay accurate. */
function PreviewFrame({ mode, children }: { mode: "desktop" | "mobile"; children: ReactNode }) {
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
  return <div ref={container} className="hp-preview-frame-wrap" style={{ height: viewportHeight * scale }}>
    <iframe title={`${mode === "desktop" ? "Desktop" : "Mobile"} homepage section preview`} className="hp-preview-frame" tabIndex={-1} sandbox="allow-same-origin" srcDoc={FRAME_DOCUMENT}
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
        style.textContent = 'body{margin:0;background:#F8F7F3;background-image:none}*{scroll-behavior:auto!important;animation:none!important;transition:none!important}[style*="opacity: 0"]{opacity:1!important;transform:none!important}';
        style.setAttribute("data-preview-style", ""); doc.head.appendChild(style);
        setFrameDocument(doc);
      }} />
    {frameDocument?.getElementById("section-preview") && createPortal(<div className="um-public-theme" style={{ pointerEvents: "none" }} onClickCapture={event => event.preventDefault()} onSubmitCapture={event => event.preventDefault()}>{children}</div>, frameDocument.getElementById("section-preview")!)}
  </div>;
}

export function HomepageSectionRendering({ section, data, slide }: { section: SectionId; data: HomepageEditorData; slide: HeroSlide }) {
  if (section === "hero") {
    if (!safeImage(slide.src, process.env.NEXT_PUBLIC_SUPABASE_URL)) return <p className="hp-preview-unavailable">Choose a supported image to preview this slide.</p>;
    return <HeroCarousel copy={valuesOf(resolveGlobalHero(data.site)) as HeroCopy} slides={[{ ...slide, isActive: true }]} preview />;
  }
  const copy = valuesOf(resolveSection(data.blocks, section));
  switch (section) {
    case "marketing_banner": return <HomeMarketingBanner copy={copy} />;
    case "why_unimondo": return <WhyUniMondo {...copy} />;
    case "destinations": return <PopularDestinations copy={copy} />;
    case "universities": return <FeaturedPrograms openings={data.openings} {...copy} />;
    case "success_stories": return data.stories.length ? <SuccessStoriesSection stories={data.stories} copy={copy} /> : <p className="hp-preview-unavailable">This section is not displayed publicly until a published success story is available.</p>;
    case "how_it_works": return <HowItWorks copy={copy} />;
    case "why_europe": return <WhyEurope copy={copy} />;
    case "journey_cta": return <JourneyCta copy={copy} />;
  }
}

export function HomepagePreview({ children, dirty, hidden }: { children: ReactNode; dirty: boolean; hidden: boolean }) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const dialog = useRef<HTMLDialogElement>(null);
  const modes = <div className="hp-preview-modes" role="group" aria-label="Preview device"><button type="button" aria-pressed={mode === "desktop"} onClick={() => setMode("desktop")}><Monitor size={15} aria-hidden />Desktop</button><button type="button" aria-pressed={mode === "mobile"} onClick={() => setMode("mobile")}><Smartphone size={15} aria-hidden />Mobile</button></div>;
  return <aside className="hp-preview-panel" aria-label="Live section preview"><div className="hp-panel-heading"><div><p className="cms-eyebrow">LIVE PREVIEW</p><h2>Your website, as you edit</h2></div><button type="button" className="cms-icon-button" aria-label="Expand preview" onClick={() => dialog.current?.showModal()}><Expand size={17} /></button></div>
    <div className="hp-preview-toolbar">{modes}<span className={`hp-preview-state ${dirty ? "is-unsaved" : ""}`}>{dirty ? "Unsaved preview" : "Current content"}</span></div>
    {hidden && <p className="hp-preview-note">This slide is hidden. Preview shows how it would look if made visible.</p>}
    <PreviewFrame mode={mode}>{children}</PreviewFrame>
    <button type="button" className="hp-edit-jump" onClick={() => document.querySelector(".hp-fields-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Back to editing</button>
    <p className="hp-preview-footnote">Actual website components · {mode === "desktop" ? "1120 × 800" : "390 × 844"} viewport. Links and forms are disabled in preview.</p>
    <dialog ref={dialog} className="hp-expanded-preview" aria-labelledby="hp-expanded-title"><div className="hp-panel-heading"><h2 id="hp-expanded-title">Homepage section preview</h2><button type="button" className="cms-icon-button" onClick={() => dialog.current?.close()} aria-label="Close expanded preview"><X size={20} /></button></div><div className="hp-preview-toolbar">{modes}<span className="hp-preview-state">{dirty ? "Unsaved preview" : "Current content"}</span></div><PreviewFrame mode={mode}>{children}</PreviewFrame></dialog>
  </aside>;
}
