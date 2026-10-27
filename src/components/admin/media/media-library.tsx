"use client";

/* eslint-disable @next/next/no-img-element -- Public image thumbnails include preserved external/repository assets. */
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { useDeferredValue, useId, useRef, useState } from "react";
import { Archive, ArrowLeft, ArrowRight, Check, ImageIcon, Search, Upload, X } from "lucide-react";
import { MEDIA_CATEGORIES, MAX_UPLOAD_BYTES, categoryLabel, mediaBytes, type MediaAsset, type MediaCatalogue, type MediaCategory, type MediaGrants } from "@/lib/media/types";
import { CmsEmptyState, CmsNotice, CmsPageHeader } from "@/components/admin/cms/cms-foundation";
import "./media-library.css";

async function libraryFetcher(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The image library could not be loaded.");
  return data;
}
const dateLabel = (date: string | null) => date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Existing website image";
type Props = { onSelect?: (asset: MediaAsset) => void; currentUrl?: string; initialSelectedId?: string };

export function MediaLibrary({ onSelect, currentUrl, initialSelectedId }: Props) {
  const { mutate: refreshCache } = useSWRConfig();
  const refreshLibrary = () => refreshCache(key => typeof key === "string" && key.startsWith("/api/admin/media"), undefined, { revalidate: true, populateCache: false });
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [category, setCategory] = useState("");
  const [archived, setArchived] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState<MediaAsset | null>(null);
  const [upload, setUpload] = useState(false);
  const [replacement, setReplacement] = useState<MediaAsset | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState("");
  const key = `/api/admin/media?q=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&archived=${archived}&offset=${offset}`;
  const { data, error, isLoading, mutate } = useSWR<MediaCatalogue>(key, libraryFetcher, { revalidateOnFocus: false });
  const [requestedId, setRequestedId] = useState(initialSelectedId);
  const requested = useSWR<{ asset: MediaAsset }>(requestedId ? `/api/admin/media/${encodeURIComponent(requestedId)}` : null, libraryFetcher, { revalidateOnFocus: false });
  const preferred = selection ?? requested.data?.asset;
  const active = (preferred && data?.assets.find(asset => asset.id === preferred.id)) ?? preferred ?? data?.assets.find(asset => asset.url === currentUrl) ?? null;
  const uploadAllowed = Boolean(data?.metadataReady && data.storageReady && Object.values(data.permissions).some(grant => grant.upload));
  const beginUpload = (asset?: MediaAsset, files: File[] = []) => {
    if (!uploadAllowed) { setDropError("Uploads are unavailable for this account or catalogue setup is pending."); return; }
    setDropError(""); setReplacement(asset ?? null); setDroppedFiles(files); setUpload(true);
  };
  return <div className="ml-library">
    {!onSelect && <CmsPageHeader eyebrow="WEBSITE / MEDIA" title="Media Library" description="Your website images, organized and ready to reuse. Existing files and website references stay intact." actions={<button type="button" className="cms-button-primary" disabled={!uploadAllowed} onClick={() => beginUpload()}><Upload size={16} aria-hidden />Upload image</button>} />}
    {data?.warning && <CmsNotice>{data.warning}</CmsNotice>}
    {message && <p className="ml-success" role="status"><Check size={16} aria-hidden />{message}</p>}
    {(dropError || requested.error) && <p className="ml-error" role="alert">{dropError || "The requested image is unavailable. Choose another image below."}</p>}
    <div className="ml-toolbar"><label className="ml-search"><Search size={17} aria-hidden /><span className="sr-only">Search images</span><input placeholder="Search images by name or description…" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); }} /></label>
      <label><span className="sr-only">Image category</span><select value={category} onChange={event => { setCategory(event.target.value); setOffset(0); }}><option value="">All categories</option>{MEDIA_CATEGORIES.filter(item => data?.permissions[item.id].view).map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      <label className="ml-archive-toggle"><input type="checkbox" checked={archived} onChange={event => { setArchived(event.target.checked); setOffset(0); setSelection(null); }} />Archived</label>
      {onSelect && <button type="button" className="cms-button-primary" disabled={!uploadAllowed} onClick={() => beginUpload()}><Upload size={15} aria-hidden />Upload image</button>}
    </div>
    {upload && data && <MediaUploader key={`${replacement?.id ?? "new"}:${droppedFiles.map(file => file.name).join(",")}`} permissions={data.permissions} initialCategory={replacement?.category ?? (onSelect && data.permissions.hero.upload ? "hero" : undefined)} initialAlt={replacement?.alt} files={droppedFiles} replacing={Boolean(replacement)} onClose={() => { setUpload(false); setDroppedFiles([]); }} onUploaded={asset => { setSelection(asset); setMessage("Image uploaded. Existing pages keep their current image until you choose a replacement and save the page."); void refreshLibrary(); }} />}
    <div className={`ml-workspace${active ? " has-selection" : ""}`}>
      <section className={`ml-gallery-panel${dragging ? " is-dragging" : ""}`} aria-label="Website image gallery"
        onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); beginUpload(undefined, Array.from(event.dataTransfer.files)); }}>
        <div className="ml-gallery-heading"><h2>{archived ? "Archived images" : "Website images"}</h2><span>{data ? `${data.total} ${data.total === 1 ? "image" : "images"}` : "Loading…"}</span></div>
        {isLoading && <div className="ml-loading" role="status">Loading your image library…</div>}
        {error && <div className="ml-error" role="alert"><p>{error.message}</p><button type="button" className="cms-button-secondary" onClick={() => void mutate()}>Try again</button></div>}
        {data && !data.assets.length && <CmsEmptyState title={archived ? "No archived images" : query || category ? "No matching images" : "Your image library is ready"} description={query || category ? "Try a different name or category." : "Upload a website image or reuse one from the existing website."} />}
        {Boolean(data?.assets.length) && <div className="ml-grid">{data!.assets.map(asset => <button type="button" className={`ml-image-card${active?.id === asset.id ? " is-selected" : ""}`} key={asset.id} aria-label={`Preview ${asset.name}`} aria-pressed={active?.id === asset.id} onClick={() => { setSelection(asset); setMessage(""); }}><div className="ml-card-image"><img src={asset.url} alt={asset.alt || asset.name} loading="lazy" />{active?.id === asset.id && <span className="ml-selected-mark"><Check size={15} aria-hidden /></span>}</div><span className="ml-card-name">{asset.name}</span><span className="ml-card-meta">{categoryLabel(asset.category)}{asset.width && asset.height ? ` · ${asset.width} × ${asset.height}` : ""}</span></button>)}</div>}
        {uploadAllowed && <button type="button" className="ml-drop-hint" onClick={() => beginUpload()}><Upload size={17} aria-hidden />Drop images here, or choose files to upload<span>JPG, PNG, WebP or AVIF · up to 4 MB each</span></button>}
        {data && data.total > 60 && <div className="ml-pagination"><button type="button" className="cms-button-secondary" disabled={!offset} onClick={() => { setOffset(Math.max(0, offset - 60)); setSelection(null); }}><ArrowLeft size={14} />Previous</button><span>{offset + 1}–{Math.min(offset + 60, data.total)} of {data.total}</span><button type="button" className="cms-button-secondary" disabled={offset + 60 >= data.total} onClick={() => { setOffset(offset + 60); setSelection(null); }}>Next<ArrowRight size={14} /></button></div>}
      </section>
      {active && data && <MediaDetails key={`${active.id}:${active.category}:${active.alt}:${active.archived}`} asset={active} permissions={data.permissions} metadataReady={data.metadataReady} canUpload={uploadAllowed && data.permissions[active.category].upload} onSelect={onSelect} onReplace={() => beginUpload(active)} onChanged={async () => { setSelection(null); setRequestedId(undefined); await refreshLibrary(); setMessage("Image details updated. Its address and existing website references are unchanged."); }} />}
    </div>
    {!onSelect && <p className="ml-safety-note">Removing an image from the library uses reversible archiving. Original files and addresses are retained. Images in use cannot be archived until their references have been replaced and saved.</p>}
  </div>;
}

function MediaDetails({ asset, permissions, metadataReady, canUpload, onSelect, onReplace, onChanged }: { asset: MediaAsset; permissions: MediaGrants; metadataReady: boolean; canUpload: boolean; onSelect?: (asset: MediaAsset) => void; onReplace: () => void; onChanged: () => Promise<void> }) {
  const descriptionId = useId();
  const [alt, setAlt] = useState(asset.alt), [category, setCategory] = useState(asset.category);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const grant = permissions[asset.category];
  async function update(payload: object) {
    setBusy(true); setError("");
    try { const response = await fetch(`/api/admin/media/${encodeURIComponent(asset.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Image details could not be saved."); await onChanged(); }
    catch (error) { setError(error instanceof Error ? error.message : "The connection was interrupted. Please refresh."); }
    finally { setBusy(false); }
  }
  return <aside className={`ml-details${onSelect ? " is-picker" : ""}`} aria-label="Selected image details"><div className="ml-detail-preview"><img src={asset.url} alt={asset.alt || asset.name} /></div><div className="ml-detail-body"><p className="cms-eyebrow">{asset.source === "upload" ? "LIBRARY IMAGE" : "EXISTING WEBSITE IMAGE"}</p><h2>{asset.name}</h2>
    <details className="ml-information" open={!onSelect}><summary>Image information &amp; organization</summary><dl className="ml-metadata"><div><dt>Dimensions</dt><dd>{asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "Not recorded for this existing image"}</dd></div><div><dt>File size</dt><dd>{mediaBytes(asset.bytes)}</dd></div><div><dt>Uploaded</dt><dd>{dateLabel(asset.createdAt)}</dd></div><div><dt>Source</dt><dd>{asset.source === "upload" ? "Optimized WebP · website storage" : asset.source === "repository" ? "Existing website file" : "Existing image address · preserved"}</dd></div></dl>
    <label className="ml-field">Category<select value={category} disabled={busy || !metadataReady || !grant.edit} onChange={event => setCategory(event.target.value as MediaCategory)}>{MEDIA_CATEGORIES.filter(item => item.id === asset.category || permissions[item.id].edit).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <div className="ml-field"><label htmlFor={descriptionId}>Image description</label><textarea id={descriptionId} rows={3} value={alt} maxLength={500} disabled={busy || !metadataReady || !grant.edit} onChange={event => setAlt(event.target.value)} /></div><p className="ml-help">Used when this image is next selected. Existing pages keep their saved descriptions.</p>
    {metadataReady && grant.edit && <button type="button" className="cms-button-secondary" disabled={busy || alt === asset.alt && category === asset.category} onClick={() => void update({ operation: "details", category, alt })}>Save image details</button>}
    <div className="ml-usage"><h3>Where it’s used</h3>{asset.usage.length ? <ul>{asset.usage.map(label => <li key={label}>{label}</li>)}</ul> : <p>{asset.usageVerified ? "No current website references found." : "Usage could not be fully checked."}</p>}<p className="ml-help">Historical references may exist; original files are always kept.</p></div></details>
    {error && <p className="ml-error" role="alert">{error}</p>}
    <div className="ml-detail-actions">{!asset.archived && (onSelect ? <button type="button" className="cms-button-primary" disabled={!asset.heroCompatible || busy} onClick={() => onSelect({ ...asset, alt: asset.alt || asset.name })}>Use this image<Check size={15} aria-hidden /></button> : asset.heroCompatible && <Link className="cms-button-primary" href={`/admin/home?media=${encodeURIComponent(asset.id)}`}>Choose for homepage<ArrowRight size={15} aria-hidden /></Link>)}
      {!asset.archived && canUpload && <button type="button" className="cms-button-secondary" disabled={busy} onClick={onReplace}><Upload size={15} aria-hidden />Upload replacement</button>}
      {asset.archived ? <button type="button" className="cms-button-secondary" disabled={busy || !grant.edit || !metadataReady} onClick={() => void update({ operation: "restore" })}>Restore image</button> : <button type="button" className="ml-archive-button" disabled={busy || !metadataReady || !grant.archive || !asset.usageVerified || Boolean(asset.usage.length)} onClick={() => { if (window.confirm("Archive this image? It will be hidden from active selections. The original file and its address will be kept to protect historical content.")) void update({ operation: "archive", confirm: true }); }}><Archive size={15} aria-hidden />Archive image</button>}
    </div>{!asset.heroCompatible && <p className="ml-help">This existing image remains available, but its host is not supported by the hero renderer. Choose a supported library image for the banner.</p>}
    {asset.usage.length > 0 && <p className="ml-help">To archive, first choose a replacement in the relevant content editor and save it.</p>}
  </div></aside>;
}

function MediaUploader({ permissions, initialCategory, initialAlt, files, replacing, onClose, onUploaded }: { permissions: MediaGrants; initialCategory?: MediaCategory; initialAlt?: string; files: File[]; replacing: boolean; onClose: () => void; onUploaded: (asset: MediaAsset) => void }) {
  const allowed = MEDIA_CATEGORIES.filter(item => permissions[item.id].upload);
  const [category, setCategory] = useState<MediaCategory>(initialCategory && permissions[initialCategory].upload ? initialCategory : allowed[0].id);
  const [queue, setQueue] = useState(() => files.map(file => ({ file, alt: initialAlt || file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "), status: "pending", error: "" })));
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const choose = (chosen: File[]) => { setQueue(chosen.map(file => ({ file, alt: initialAlt || file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "), status: "pending", error: "" }))); setMessage(""); };
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage("");
    let count = 0;
    for (const [index, item] of queue.entries()) {
      if (item.status === "done") continue;
      const mark = (status: string, error = "") => setQueue(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, status, error } : row));
      if (item.file.size > MAX_UPLOAD_BYTES || !item.file.size) { mark("error", "Choose an image up to 4 MB."); continue; }
      if (!item.alt.trim()) { mark("error", "Add an image description."); continue; }
      mark("uploading");
      try {
        const form = new FormData(); form.append("file", item.file); form.append("category", category); form.append("alt", item.alt);
        const response = await fetch("/api/admin/media", { method: "POST", body: form }); const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The upload did not finish.");
        mark("done"); count++; onUploaded(data.asset);
      } catch (error) { mark("error", error instanceof Error ? error.message : "The upload connection was interrupted. Refresh before retrying."); }
    }
    setMessage(count ? `${count} ${count === 1 ? "image uploaded" : "images uploaded"}. Review any remaining files below.` : "Check the upload messages below."); setBusy(false);
  }
  return <section className="ml-uploader" aria-label="Image upload"><div className="ml-upload-heading"><div><h2>{replacing ? "Upload a replacement image" : "Add website images"}</h2><p>{replacing ? "A new file is created. The original image and all existing references stay unchanged until a new selection is saved in the content editor." : "Choose files or drop them into the gallery. Files are checked and optimized securely before becoming available."}</p></div><button type="button" className="cms-icon-button" disabled={busy} onClick={onClose} aria-label="Close upload"><X size={18} /></button></div>
    <form onSubmit={send}><div className="ml-upload-controls"><button type="button" className="cms-button-secondary" disabled={busy} onClick={() => picker.current?.click()}><ImageIcon size={16} aria-hidden />Choose files</button><input ref={picker} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" aria-label="Choose image files" disabled={busy} onChange={event => choose(Array.from(event.target.files ?? []))} /><label className="ml-field">Upload category<select value={category} disabled={busy} onChange={event => setCategory(event.target.value as MediaCategory)}>{allowed.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
      <ul className="ml-upload-queue">{queue.map((item, index) => <li key={`${item.file.name}:${index}`}><div><strong>{item.file.name}</strong><small>{mediaBytes(item.file.size)} · {item.status === "uploading" ? "Uploading…" : item.status === "done" ? "Uploaded" : item.status === "error" ? "Needs attention" : "Ready to upload"}</small></div><label>Image description<input value={item.alt} maxLength={500} disabled={busy || item.status === "done"} onChange={event => setQueue(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, alt: event.target.value } : row))} /></label>{item.error && <p className="ml-error" role="alert">{item.error}</p>}</li>)}</ul>
      <div className="ml-upload-footer"><p className="ml-help" role="status">{busy ? "Uploading selected images. Please keep this window open." : message || "JPG, PNG, WebP or AVIF · up to 4 MB each. Still images are optimized to WebP without enlarging them."}</p><button className="cms-button-primary" type="submit" disabled={busy || !queue.some(item => item.status !== "done")}><Upload size={15} />{busy ? "Uploading…" : "Upload selected images"}</button></div>
    </form>
  </section>;
}
