"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Wide layout for directory-style content */
  wide?: boolean;
  /** Optional id for aria-labelledby */
  labelledBy?: string;
  /** If false, page can scroll behind the fixed overlay (modal stays centered in the viewport). Default true. */
  lockBodyScroll?: boolean;
  /** Softer, lighter dim (e.g. story-style detail on About). */
  lightBackdrop?: boolean;
};

/** Centered overlay modal with blur/dim backdrop (matches site navy + gold header). */
export function CenteredModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  wide,
  labelledBy,
  lockBodyScroll = true,
  lightBackdrop = false,
}: Props) {
  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockBodyScroll]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className={
          lightBackdrop
            ? "absolute inset-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity"
            : "absolute inset-0 bg-[#050814]/80 backdrop-blur-md transition-opacity"
        }
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(90vh,820px)] w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a1628] shadow-2xl shadow-black/40",
          wide ? "max-w-3xl" : "max-w-lg sm:max-w-xl",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#071525]/95 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 gap-3">
            {icon ? (
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 id={labelledBy} className="font-[family-name:var(--font-heading)] text-xl font-semibold text-white">
                {title}
              </h2>
              {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-5 py-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
