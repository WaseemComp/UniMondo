"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronRight, X } from "lucide-react";
import { activeCmsItem, type CmsNavItem } from "@/lib/admin/navigation";
import { CmsIcon } from "./cms/cms-icons";

const subscribeHash = (callback: () => void) => { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); };

export function AdminSidebar({ items, mobileOpen, desktop, onClose }: { items: CmsNavItem[]; mobileOpen: boolean; desktop: boolean; onClose: () => void }) {
  const pathname = usePathname() || "/admin/dashboard";
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const active = activeCmsItem(items, pathname, hash);
  return <aside id="cms-sidebar" className="cms-sidebar" aria-label="Content Studio navigation"
    aria-hidden={!desktop && !mobileOpen} inert={!desktop && !mobileOpen}
    role={!desktop && mobileOpen ? "dialog" : undefined} aria-modal={!desktop && mobileOpen ? true : undefined}>
    <div className="cms-brand-row">
      <Link href="/admin/dashboard" className="cms-brand" onClick={onClose} aria-label="UniMondo Content Studio overview">
        <span className="cms-brand-mark"><CmsIcon name="destinations" size={27} /></span>
        <span><strong>UniMondo</strong><small>CONTENT STUDIO</small></span>
      </Link>
      <button type="button" className="cms-icon-button cms-mobile-only" aria-label="Close navigation" onClick={onClose}><X size={20} /></button>
    </div>
    <nav className="cms-navigation" aria-label="Administration">
      {["Workspace", "Website", "Operations", "Administration"].map(group => {
        const groupItems = items.filter(item => item.group === group);
        if (!groupItems.length) return null;
        return <div className="cms-nav-group" key={group}>
          <p className="cms-nav-heading">{group}</p>
          {groupItems.map(item => {
            const Anchor = item.href.includes("#") ? "a" : Link;
            return <Anchor key={item.id} href={item.href} className={`cms-nav-link${active === item.id ? " is-active" : ""}`}
              aria-current={active === item.id ? "page" : undefined} onClick={onClose}>
              <CmsIcon name={item.icon} /><span>{item.label}</span>{active === item.id && <ChevronRight className="cms-nav-chevron" size={14} aria-hidden />}
            </Anchor>;
          })}
        </div>;
      })}
    </nav>
    <div className="cms-sidebar-footer"><a href="/" target="_blank" rel="noopener noreferrer"><CmsIcon name="destinations" size={17} />Public website<ArrowUpRight size={15} aria-hidden /></a><p>A more open world.</p></div>
  </aside>;
}
