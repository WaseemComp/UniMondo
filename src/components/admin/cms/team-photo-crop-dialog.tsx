"use client";

import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { useCallback, useEffect, useState } from "react";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageBlob } from "@/lib/team-photo-crop";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  /** Called with a JPEG file ready for upload */
  onApply: (file: File) => void | Promise<void>;
  applying?: boolean;
};

export function TeamPhotoCropDialog({ open, imageSrc, onClose, onApply, applying }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!open || !imageSrc) return;
    const id = window.setTimeout(() => {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_c: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
    const file = new File([blob], "team-photo.jpg", { type: "image/jpeg" });
    await onApply(file);
  };

  if (!open || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="team-crop-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 id="team-crop-title" className="text-lg font-semibold text-zinc-900">
            Adjust photo
          </h2>
          <p className="mt-1 text-sm text-zinc-600">Drag to position your face. Use the zoom control to get closer or farther.</p>
        </div>

        <div className="relative h-[min(55vh,320px)] w-full bg-zinc-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            minZoom={1}
            maxZoom={4}
            objectFit="contain"
          />
        </div>

        <div className="space-y-4 border-t border-zinc-200 px-5 py-4">
          <div>
            <label htmlFor="team-crop-zoom" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Zoom
            </label>
            <input
              id="team-crop-zoom"
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-amber-600"
            />
            <div className="mt-1 flex justify-between text-xs text-zinc-400">
              <span>Wide</span>
              <span>Close-up</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={applying}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-amber-600 text-white hover:bg-amber-500"
              onClick={() => void handleApply()}
              disabled={applying || !croppedAreaPixels}
            >
              {applying ? "Uploading…" : "Use photo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}