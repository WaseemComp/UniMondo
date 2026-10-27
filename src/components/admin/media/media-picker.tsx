"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { MediaLibrary } from "./media-library";
import type { MediaAsset } from "@/lib/media/types";

export function MediaPicker({ currentUrl, initialSelectedId, onSelect, onClose }: { currentUrl: string; initialSelectedId?: string; onSelect: (asset: MediaAsset) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="ml-picker-dialog" aria-labelledby="ml-picker-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="ml-picker-heading"><div><p className="cms-eyebrow">HERO & MAIN BANNER</p><h2 id="ml-picker-title">Choose your image</h2><p>Preview your selection now. The homepage changes only when you save the section.</p></div><button type="button" className="cms-icon-button" aria-label="Close image chooser" onClick={onClose}><X size={20} /></button></div><MediaLibrary currentUrl={currentUrl} initialSelectedId={initialSelectedId} onSelect={asset => { onSelect(asset); onClose(); }} /></dialog>;
}
