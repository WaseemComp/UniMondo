"use client";

/* eslint-disable @next/next/no-img-element -- Existing public image thumbnails; library and existing-image thumbnails. */

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ImageIcon, Monitor, Save } from "lucide-react";
import { saveHomepageEditor, type HomepageSaveInput } from "@/app/admin/cms/homepage-editor-actions";
import type { HomepageEditorData, HomepageSnapshot } from "@/lib/admin/homepage-editor";
import { DEFAULT_HERO_SLIDES, HERO_SITE_KEYS, HOME_SECTIONS, SLIDE_COPY_KEYS, english, firstHeroEditorTarget, heroSlideFromBlock, mergeEnglish, publicHeroSlides, record, resolveGlobalHero, resolveSection, resolveSlideCopy, sectionBlock, valuesOf, type CopySection, type EffectiveValue, type HeroSlide, type SectionId } from "@/lib/homepage/content";
import { safeImage, validateCopyPatch, validateSlidePatch } from "@/lib/homepage/validation";
import { CmsActionArea, CmsFieldContext, CmsNotice, CmsPageHeader } from "@/components/admin/cms/cms-foundation";
import { CmsIcon } from "@/components/admin/cms/cms-icons";
import { HomepagePreview, HomepageSectionRendering } from "./homepage-preview";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { COLLECTIONS, isSectionVisible, type CollectionId } from "@/lib/homepage/items";
import { HomepageItemsEditor, HomepagePresentationEditor } from "./homepage-items-editor";
import { HomepageStoriesEditor } from "./homepage-stories-editor";
import "./homepage-editor.css";

const leaveMessage = "You have unsaved homepage changes. Leave without saving?";
function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    let restoring = false;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      const element = event.target as Element;
      const anchor = element.closest<HTMLAnchorElement>("a[href]");
      const back = element.closest('button[aria-label="Go back"]');
      if ((!anchor || anchor.target === "_blank" || anchor.href === window.location.href || anchor.getAttribute("href")?.startsWith("#")) && !back) return;
      if (!window.confirm(leaveMessage)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const pop = (event: PopStateEvent) => {
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (!window.confirm(leaveMessage)) { event.stopImmediatePropagation(); restoring = true; history.go(1); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", click, true); window.addEventListener("popstate", pop, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); window.removeEventListener("popstate", pop, true); };
  }, [dirty]);
}

type Props = { initial: HomepageEditorData; initialMediaId?: string };
export function HomepageEditor({ initial, initialMediaId }: Props) {
  const [data, setData] = useState(initial);
  const [pendingMediaId, setPendingMediaId] = useState(initialMediaId);
  const [section, setSection] = useState<SectionId>("hero");
  const [target, setTarget] = useState(() => firstHeroEditorTarget(initial.blocks, initial.permissions.viewSlides));
  const [mode, setMode] = useState<string>("text");
  const [itemSelection, setItemSelection] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  useUnsavedChanges(dirty);
  const sections = HOME_SECTIONS.filter(item => item.id !== "journey_cta" || data.permissions.viewCta);
  const navigate = (nextSection: SectionId, nextTarget = nextSection === "hero" ? firstHeroEditorTarget(data.blocks, data.permissions.viewSlides) : "global") => {
    if (busy) return;
    if (section === nextSection && target === nextTarget) return;
    if (dirty && !window.confirm(leaveMessage)) return;
    setMode("text"); setItemSelection(undefined); setDirty(false); setSection(nextSection); setTarget(nextTarget); setSavedMessage("");
  };
  const selectMode = (nextMode:string, identity?:string) => {
    if(busy || mode===nextMode && !identity)return;
    if(dirty && !window.confirm(leaveMessage))return;
    setDirty(false);setMode(nextMode);setItemSelection(identity);setSavedMessage("");
  };
  const previewSelect = (identity:string) => {
    const separator = identity.indexOf(":"), group=identity.slice(0,separator), id=identity.slice(separator+1);
    if(group==="stories"&&section==="success_stories")selectMode("stories",id);
    else if(group in COLLECTIONS&&COLLECTIONS[group as CollectionId].section===section)selectMode(group,id);
  };
  const saved = (snapshot: HomepageSnapshot) => {
    setData(previous => ({ ...previous, ...snapshot })); setDirty(false); setRevision(value => value + 1); setSavedMessage("Changes saved. Public homepage content updates immediately after the website refreshes.");
    if(target === "new") { const previous = new Set(data.blocks.map(b=>b.id)); const row=snapshot.blocks.find(b=>b.section_key==="hero_slider"&&b.block_key==="slide"&&!previous.has(b.id)&&b.sort_order>=DEFAULT_HERO_SLIDES.length); if(row)setTarget(row.id); }
    if (target.startsWith("builtin:")) {
      const index = Number(target.split(":")[1]);
      const row = snapshot.blocks.find(block => block.section_key === "hero_slider" && block.block_key === "slide" && block.sort_order === index);
      if (row) setTarget(row.id);
    }
  };
  return <div className="hp-editor">
    <CmsPageHeader eyebrow="WEBSITE / HOME" title="Homepage editor" description="Shape your homepage one section at a time, with the content your visitors actually see." actions={<a href="/" target="_blank" rel="noopener noreferrer" className="cms-button-secondary">View public homepage<ArrowUpRight size={15} aria-hidden /></a>} />
    <div className="hp-save-explanation"><span className={`hp-work-state ${dirty ? "is-unsaved" : ""}`}><span />{dirty ? "Unsaved changes" : data.available ? "Current public content" : "Reference defaults"}</span><p>Save updates the public website. Changes in this preview stay private until you save.</p></div>
    {!data.available && <CmsNotice>Saved homepage content could not be loaded. Website defaults are shown for reference, and saving is disabled to protect existing content.</CmsNotice>}
    {!isSectionVisible(data.blocks, section) && <CmsNotice>This section is currently hidden on the public homepage. Its content remains visible here for editing.</CmsNotice>}
    {savedMessage && <p className="hp-success" role="status"><Check size={17} aria-hidden />{savedMessage}</p>}
    <nav className="hp-editor-tabs" aria-label="Section editing tools"><button type="button" aria-pressed={mode==="text"} disabled={busy} onClick={()=>selectMode("text")}>{section==="hero"?"Slide & text":"Section text"}</button>{Object.entries(COLLECTIONS).filter(([key,value])=>value.section===section&&(key!=="why_stats"||data.permissions.viewStats)).map(([key,value])=><button type="button" aria-pressed={mode===key} disabled={busy} key={key} onClick={()=>selectMode(key)}>{value.label}</button>)}{section==="success_stories"&&<button type="button" disabled={busy} aria-pressed={mode==="stories"} onClick={()=>selectMode("stories")}>Testimonials</button>}<button type="button" aria-pressed={mode==="settings"} disabled={busy} onClick={()=>selectMode("settings")}>Section settings</button></nav>
    <div className="hp-workspace"><nav className="hp-sections" aria-label="Homepage sections"><p className="cms-eyebrow">HOMEPAGE SECTIONS</p>{sections.map((item, index) => <button key={item.id} type="button" disabled={busy} className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "true" : undefined} onClick={() => navigate(item.id)}><CmsIcon name={item.icon} size={17} /><span>{item.label}</span><small>{String(index + 1).padStart(2, "0")}</small></button>)}</nav>
      {mode==="settings"?<HomepagePresentationEditor key={`${section}:settings:${revision}`} data={data} section={section} onDirty={setDirty} onBusy={setBusy} onSaved={saved}/>:mode==="stories"?<HomepageStoriesEditor key={`${section}:stories:${revision}`} data={data} section={section} initialSelection={itemSelection} onDirty={setDirty} onBusy={setBusy} onRows={(rows,selectedId)=>{setItemSelection(selectedId);setData(previous=>({...previous,editableStories:{rows,available:true},stories:rows.filter(row=>row.is_published).sort((a,b)=>a.sort_order-b.sort_order).slice(0,6)}));setDirty(false);setRevision(value=>value+1);setSavedMessage("Testimonial saved. Only approved featured information is shown publicly.");}}/>:mode in COLLECTIONS?<HomepageItemsEditor key={`${section}:${mode}:${revision}`} data={data} section={section} collection={mode as CollectionId} initialSelection={itemSelection} onRememberSelection={setItemSelection} onSelectOther={previewSelect} onDirty={setDirty} onBusy={setBusy} onSaved={saved}/>:<SectionEditor key={`${section}:${target}:${revision}`} data={data} section={section} target={target} onTarget={value => navigate(section, value)} onDirty={setDirty} onBusy={setBusy} onSaved={saved} suggestedMediaId={pendingMediaId} onMediaClose={() => setPendingMediaId(undefined)} onPreviewSelect={previewSelect} />}
    </div>
  </div>;
}

type SectionProps = { onPreviewSelect: (identity:string)=>void; suggestedMediaId?: string; onMediaClose: () => void; data: HomepageEditorData; section: SectionId; target: string; onTarget: (value: string) => void; onDirty: (dirty: boolean) => void; onBusy: (busy: boolean) => void; onSaved: (snapshot: HomepageSnapshot) => void };
function SectionEditor({ data, section, target, onTarget, onDirty, onBusy, onSaved, suggestedMediaId, onMediaClose, onPreviewSelect }: SectionProps) {
  const definition = HOME_SECTIONS.find(item => item.id === section)!;
  const isSlide = section === "hero" && target !== "global";
  const isNew = isSlide && target === "new";
  const builtinIndex = target.startsWith("builtin:") ? Number(target.split(":")[1]) : null;
  const block = isSlide ? data.blocks.find(row => row.id === target && row.section_key === "hero_slider" && row.block_key === "slide") : undefined;
  const savedSlides = data.blocks.filter(row => row.section_key === "hero_slider" && row.block_key === "slide");
  const sourceSlide = block ? heroSlideFromBlock(block) : DEFAULT_HERO_SLIDES[builtinIndex ?? 0];
  const copySource: Record<string, EffectiveValue> = isSlide ? resolveSlideCopy(data.site, block) : section === "hero" ? resolveGlobalHero(data.site) : resolveSection(data.blocks, section);
  const initialValues = isSlide ? { ...valuesOf(copySource), line: sourceSlide.line, imageUrl: sourceSlide.src, imageAlt: sourceSlide.alt } : valuesOf(copySource);
  const initialInheritance = isSlide ? Object.fromEntries(Object.entries(copySource).map(([key, field]) => [key, field.source === "inherited"])) : {};
  const [values, setValues] = useState(initialValues);
  const [inheritance, setInheritance] = useState(initialInheritance);
  const [visible, setVisible] = useState(block?.is_active ?? true);
  const [order, setOrder] = useState(isNew ? Math.max(DEFAULT_HERO_SLIDES.length,...savedSlides.map(b=>b.sort_order+1)) : block?.sort_order ?? builtinIndex ?? 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [previewChoice, setPreviewChoice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(Boolean(suggestedMediaId && isSlide));
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues) || JSON.stringify(inheritance) !== JSON.stringify(initialInheritance) || visible !== (block?.is_active ?? true) || order !== (block?.sort_order ?? builtinIndex ?? 0) || isNew;
  const canSave = data.available && (isSlide ? isNew ? data.permissions.createSlides : data.permissions.editSlides && (builtinIndex === null || data.permissions.createSlides && !savedSlides.length) : section === "journey_cta" ? data.permissions.editCta : data.permissions.editHome);
  useEffect(() => { if (isNew) onDirty(true); }, [isNew, onDirty]);
  const locked = !canSave || pending;
  const changedPatch = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== initialValues[key] || isSlide && SLIDE_COPY_KEYS[key] && inheritance[key] !== initialInheritance[key]).filter(([key]) => !inheritance[key]));
  const validation = isSlide ? validateSlidePatch(changedPatch, process.env.NEXT_PUBLIC_SUPABASE_URL) : validateCopyPatch(section, changedPatch);
  const fields = isSlide ? [
    { key: "eyebrow", label: "Introductory label" }, { key: "title", label: "Main headline" }, { key: "subtitle", label: "Supporting paragraph", type: "textarea" }, { key: "ctaExplore", label: "Primary button text" }, { key: "ctaApply", label: "Secondary button text" }, { key: "primaryHref", label: "Primary button destination", type: "link" }, { key: "secondaryHref", label: "Secondary button destination", type: "link" }, { key: "line", label: "Caption beneath buttons" },
  ] : definition.fields.filter(field => section !== "why_europe" || !field.key.startsWith("quickFact"));
  function updateFields(patch: Record<string, string>, nextInheritance = inheritance, nextVisible = visible, nextOrder = order) {
    const next = { ...values, ...patch };
    setValues(next); setInheritance(nextInheritance); setVisible(nextVisible); setOrder(nextOrder); setError("");
    onDirty(JSON.stringify(next) !== JSON.stringify(initialValues) || JSON.stringify(nextInheritance) !== JSON.stringify(initialInheritance) || nextVisible !== (block?.is_active ?? true) || nextOrder !== (block?.sort_order ?? builtinIndex ?? 0));
  }
  function change(key: string, value: string) { updateFields({ [key]: value }); }
  // Always use the shared resolver and public renderer, with changes applied only in memory.
  const previewData: HomepageEditorData = { ...data, site: { ...data.site }, blocks: [...data.blocks] };
  let previewSlide: HeroSlide;
  if (section === "hero" && !isSlide) {
    for (const [key, value] of Object.entries(values)) previewData.site[HERO_SITE_KEYS[key as keyof typeof HERO_SITE_KEYS]] = value;
    const publicSlides = publicHeroSlides(data.blocks);
    previewSlide = publicSlides[Number(previewChoice) || 0] ?? publicSlides[0];
  } else if (isSlide) {
    previewSlide = { src: values.imageUrl, alt: values.imageAlt, line: values.line, isActive: true, title: inheritance.title ? undefined : values.title, subtitle: inheritance.subtitle ? undefined : values.subtitle, ctaExplore: inheritance.ctaExplore ? undefined : values.ctaExplore, ctaApply: inheritance.ctaApply ? undefined : values.ctaApply, eyebrow: inheritance.eyebrow ? undefined : values.eyebrow, primaryHref: inheritance.primaryHref ? undefined : values.primaryHref, secondaryHref: inheritance.secondaryHref ? undefined : values.secondaryHref };
  } else {
    const current = sectionBlock(data.blocks, section as CopySection);
    const content = { ...record(current?.content) };
    for (const [key, value] of Object.entries(values)) content[key] = mergeEnglish(content[key], value);
    previewData.blocks = data.blocks.filter(row => row.id !== current?.id);
    previewData.blocks.push({ id: "local-preview", section_key: section, block_key: "copy", content, media: {}, is_active: true, sort_order: current?.sort_order ?? 0, updated_at: "" });
    previewSlide = publicHeroSlides(data.blocks)[0];
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!canSave || pending || !(dirty || isNew)) return;
    if (validation) { setError(validation); return; }
    let input: HomepageSaveInput;
    if (isSlide) {
      const inherit = Object.keys(inheritance).filter(key => inheritance[key]) as ("title" | "subtitle" | "ctaExplore" | "ctaApply" | "eyebrow" | "primaryHref" | "secondaryHref")[];
      input = isNew ? {kind:"newSlide",patch:Object.fromEntries(Object.entries(values).filter(([key])=>!inheritance[key])),inherit,visible,order} : builtinIndex !== null ? { kind: "builtin", index: builtinIndex, patch: changedPatch, inherit, visible } : { kind: "slide", id: block!.id, expectedUpdatedAt: block!.updated_at, patch: changedPatch, inherit, visible, order };
    } else if (section === "hero") {
      input = { kind: "global", patch: changedPatch, expected: Object.fromEntries(Object.keys(changedPatch).map(key => [key, data.site[HERO_SITE_KEYS[key as keyof typeof HERO_SITE_KEYS]] ?? null])) };
    } else input = { kind: "copy", section, patch: changedPatch, expectedUpdatedAt: sectionBlock(data.blocks, section)?.updated_at ?? null };
    setPending(true); onBusy(true);
    try {
      const result = await saveHomepageEditor(input);
      if (!result.ok) { setError(result.error); return; }
      onDirty(false); onSaved(result.snapshot);
    } catch { setError("The connection was interrupted. Reload to check saved content before retrying."); }
    finally { setPending(false); onBusy(false); }
  }
  const sourceFor = (key: string): EffectiveValue => {
    if (key === "line" && block && !english(record(block.content).line)?.trim()) return { value: initialValues.line, source: "inherited", detail: "Uses the saved image description because no caption is set" };
    return copySource[key] ?? { value: initialValues[key], source: block ? "saved" : "default", detail: block ? "Saved slide image or caption" : "Built-in website slide" };
  };
  return <>
    <section className="hp-fields-panel" aria-label="Section editing controls"><div className="hp-panel-heading"><div><p className="cms-eyebrow">EDIT SECTION</p><h2>{definition.label}</h2></div><button type="button" className="hp-preview-jump" onClick={() => document.querySelector(".hp-preview-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Monitor size={15} aria-hidden />Preview</button></div>
      <form onSubmit={save} className="hp-section-form">
        {section === "hero" && data.permissions.viewSlides && <div className="hp-field-label"><label htmlFor="hp-target">Editing</label><select id="hp-target" value={target} disabled={pending} onChange={event => onTarget(event.target.value)}><option value="global">Global hero copy</option>{isNew&&<option value="new">New slide · unsaved</option>}{savedSlides.map((row, index) => <option key={row.id} value={row.id}>Slide {index + 1} · {heroSlideFromBlock(row).alt || "Saved image"}{row.is_active ? "" : " (hidden)"}</option>)}{(!savedSlides.length || !savedSlides.some(row => row.is_active && heroSlideFromBlock(row).src)) && DEFAULT_HERO_SLIDES.map((slide, index) => <option key={index} value={`builtin:${index}`}>Built-in slide {index + 1} · {slide.alt}</option>)}</select></div>}
        {section === "hero" && data.permissions.viewSlides && <button type="button" className="cms-button-secondary" disabled={pending || !data.permissions.createSlides} onClick={()=>onTarget("new")}>Add new slide</button>}
        {!canSave && <p className="hp-help">{!data.available ? "Saving is disabled until saved content can be loaded." : "You can preview this content. Your current permissions do not allow saving this selection."}</p>}
        {section === "hero" && <div className="hp-explainer">{isSlide ? "Slide overrides take priority over global headlines and button text. Choose ‘Use global copy’ to inherit the shared value." : "Shared copy is used unless a slide has its own override. The preview shows the selected public slide, including its overrides."}</div>}
        {builtinIndex !== null && <p className="hp-help">{savedSlides.length ? "Built-in slides currently provide the public fallback because no saved slide is visible. Edit an existing slide to restore it." : "Your website currently uses five built-in slides. The first slide save makes all five editable together, retaining every other image and caption. Later saves update the same records."}</p>}
        {section !== "hero" && sectionBlock(data.blocks, section)?.is_active === false && <p className="hp-help">The stored section copy is inactive, so visitors see website defaults. Saving here activates the edited copy.</p>}
        {fields.map(field => {
          const source = sourceFor(field.key), inherits = isSlide && field.key in SLIDE_COPY_KEYS;
          const fieldDirty = values[field.key] !== initialValues[field.key] || inheritance[field.key] !== initialInheritance[field.key];
          return <div className="hp-field" key={field.key}><label htmlFor={`hp-${field.key}`}>{field.label}{fieldDirty && <small>Unsaved change</small>}</label>
            {field.type === "textarea" ? <textarea id={`hp-${field.key}`} rows={4} value={values[field.key]} disabled={locked || inheritance[field.key]} onChange={event => change(field.key, event.target.value)} /> : <input id={`hp-${field.key}`} value={values[field.key]} disabled={locked || inheritance[field.key]} onChange={event => change(field.key, event.target.value)} autoComplete="off" />}
            {inherits && <label className="hp-inherit-toggle"><input type="checkbox" checked={inheritance[field.key]} disabled={locked} onChange={event => { const checked = event.target.checked; updateFields({ [field.key]: checked ? resolveGlobalHero(data.site)[field.key as keyof typeof HERO_SITE_KEYS].value : values[field.key] }, { ...inheritance, [field.key]: checked }); }} />Use global copy</label>}
            {inherits && !inheritance[field.key] && fieldDirty ? <p className="hp-help">Custom slide text · unsaved override</p> : <CmsFieldContext source={inheritance[field.key] ? "inherited" : source.source} description={inheritance[field.key] ? resolveSlideCopy(data.site)[field.key]?.detail ?? source.detail : source.detail} />}
            {field.type === "link" && <p className="hp-help">Use a website path such as /apply, a page anchor, or a secure https:// address.</p>}
          </div>;
        })}
        {isSlide && <>
          <div className="hp-field hp-image-field"><p className="hp-field-label"><ImageIcon size={16} aria-hidden />Background image</p>
            <div className="hp-image-thumbnail">{safeImage(values.imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL) ? <img src={values.imageUrl} alt={values.imageAlt || "Current slide image"} /> : <p className="hp-help">Your current image is preserved. Choose a supported library image to replace it.</p>}</div>
            <button type="button" className="cms-button-secondary" disabled={locked} onClick={() => setPickerOpen(true)}><ImageIcon size={16} aria-hidden />Change Image</button>
            {values.imageUrl !== initialValues.imageUrl ? <p className="hp-help">New image selection · unsaved. Save changes to update the website.</p> : <CmsFieldContext source={block ? "saved" : "default"} description={block ? "Existing saved slide image" : "Existing built-in website image"} />}
            <p className="hp-help">Choose or upload an image from the shared library. Your existing image stays public until you save changes.</p>
          </div>
          <div className="hp-field"><label htmlFor="hp-imageAlt">Image description</label><input id="hp-imageAlt" value={values.imageAlt} disabled={locked} onChange={event => change("imageAlt", event.target.value)} /><p className="hp-help">Describe the image for visitors using a screen reader.</p></div>
          <div className="hp-slide-controls"><label><input type="checkbox" checked={visible} disabled={locked} onChange={event => { updateFields({}, inheritance, event.target.checked); }} />Visible on homepage</label>{(block || isNew) && <label htmlFor="hp-order">Slide position<input id="hp-order" type="number" min={0} max={10000} value={Number.isFinite(order) ? order : ""} disabled={locked} onChange={event => { updateFields({}, inheritance, visible, event.target.value === "" ? NaN : Number(event.target.value)); }} /></label>}</div>
          <p className="hp-help">Lower positions appear first; each saved slide needs a distinct position. If all saved slides are hidden, the website uses its built-in carousel.</p>
          <p className="hp-help">The label and button destinations inherit global copy unless you set a slide override. Use an unused position to reorder slides; gaps are allowed.</p>
        </>}
        {section === "hero" && !isSlide && <div className="hp-field"><label htmlFor="hp-preview-slide">Public slide in preview</label><select id="hp-preview-slide" value={previewChoice} onChange={event => setPreviewChoice(event.target.value)}>{publicHeroSlides(data.blocks).map((slide, index) => <option value={index} key={index}>Slide {index + 1} · {slide.alt}</option>)}</select>{["title", "subtitle", "ctaExplore", "ctaApply"].some(key => Boolean(previewSlide[key as keyof HeroSlide])) && <p className="hp-help">This slide has saved text overrides. Global edits will appear on slides that inherit those fields. Select the slide under Editing to change its overrides.</p>}<div className="hp-image-thumbnail hp-reference-image"><img src={previewSlide.src} alt={previewSlide.alt} /></div><p className="hp-help">{previewSlide.line} · Select a slide under Editing to change its image or caption.</p></div>}
        {definition.note && <p className="hp-help hp-boundary">{definition.note}</p>}
        {(error || validation) && <p role="alert" className="hp-form-error">{error || validation}</p>}
        <CmsActionArea><button className="cms-button-secondary" type="button" disabled={locked || !dirty} onClick={() => { if (window.confirm("Discard your unsaved changes to this selection?")) { setValues(initialValues); setInheritance(initialInheritance); setVisible(block?.is_active ?? true); setOrder(block?.sort_order ?? builtinIndex ?? 0); setError(""); onDirty(false); } }}>Discard changes</button><button className="cms-button-primary" type="submit" disabled={locked || !(dirty || isNew) || Boolean(validation) || !Number.isFinite(order)}><Save size={15} aria-hidden />{pending ? "Saving…" : "Save changes"}</button></CmsActionArea>
      </form>
    </section>
    {pickerOpen && isSlide && <MediaPicker currentUrl={values.imageUrl} initialSelectedId={suggestedMediaId} onSelect={asset => updateFields({ imageUrl: asset.url, imageAlt: asset.alt || asset.name })} onClose={() => { setPickerOpen(false); onMediaClose(); }} />}
    <HomepagePreview dirty={dirty || isNew} hidden={isSlide && !visible} onSelectItem={onPreviewSelect}><HomepageSectionRendering section={section} data={previewData} slide={previewSlide} /></HomepagePreview>
  </>;
}
