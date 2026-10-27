"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { CmsNavItem } from "@/lib/admin/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { AdminPortalNavigation } from "./admin-portal-navigation";

const desktopQuery = "(min-width: 1024px)";
const subscribeDesktop = (callback: () => void) => { const media = window.matchMedia(desktopQuery); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); };

export function AdminShell({ children, items, userName, roleLabel }: { children: ReactNode; items: CmsNavItem[]; userName: string; roleLabel: string }) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true);
  const shell = useRef<HTMLDivElement>(null);
  const isDocument = /^\/admin\/agreements\/[^/]+\/print\/?$/.test(pathname);
  useEffect(() => {
    if (!mobileOpen || desktop) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = shell.current?.querySelector<HTMLElement>("#cms-sidebar");
    const controls = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || []).filter(element => element.getClientRects().length);
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const elements = controls(); const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keyboard); previousFocus?.focus(); };
  }, [mobileOpen, desktop]);
  // Official print surfaces retain their own typography and pagination, outside the CMS theme.
  if (isDocument) return <>{children}</>;
  return <div ref={shell} className={`um-cms${mobileOpen ? " cms-navigation-open" : ""}`}>
    <a href="#cms-workspace" className="cms-skip-link">Skip to content</a>
    {mobileOpen && !desktop && <button type="button" className="cms-sidebar-backdrop" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}
    <AdminSidebar items={items} mobileOpen={mobileOpen} desktop={desktop} onClose={() => setMobileOpen(false)} />
    <div className="cms-main" inert={!desktop && mobileOpen}>
      <Suspense fallback={<div className="cms-topbar cms-shell-loading" aria-label="Loading navigation" />}><AdminPortalNavigation items={items} userName={userName} roleLabel={roleLabel} mobileOpen={mobileOpen} onOpenNavigation={() => setMobileOpen(true)} /></Suspense>
      <main id="cms-workspace" tabIndex={-1} className="cms-workspace">{children}</main>
    </div>
  </div>;
}
