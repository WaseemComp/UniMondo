"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { MediaLibrary } from "./media-library";
import type { MediaAsset, MediaCategory } from "@/lib/media/types";

export function MediaPicker({ currentUrl, initialSelectedId, onSelect, onClose, title = "Hero & Main Banner", category = "hero" }: { title?: string; category?: MediaCategory; currentUrl: string; initialSelectedId?: string; onSelect: (asset: MediaAsset) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="ml-picker-dialog" aria-labelledby="ml-picker-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="ml-picker-heading"><div><p className="cms-eyebrow">{title.toUpperCase()}</p><h2 id="ml-picker-title">Choose your image</h2><p>Selecting an image does not save it. Follow the editor’s saving and publishing controls to update public content.</p></div><button type="button" className="cms-icon-button" aria-label="Close image chooser" onClick={onClose}><X size={20} /></button></div><MediaLibrary preferredCategory={category} currentUrl={currentUrl} initialSelectedId={initialSelectedId} onSelect={asset => { onSelect(asset); onClose(); }} /></dialog>;
}
