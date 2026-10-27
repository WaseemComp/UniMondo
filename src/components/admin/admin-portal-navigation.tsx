"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronDown, ChevronRight, LogOut, Menu, Search, Settings, X } from "lucide-react";
import { signOutAdmin } from "@/app/admin/actions";
import { buildAdminBreadcrumbs, getAdminBackFallbackHref } from "@/lib/admin/breadcrumbs";
import type { CmsNavItem } from "@/lib/admin/navigation";
import { CmsIcon } from "./cms/cms-icons";

type Props = { items: CmsNavItem[]; userName: string; roleLabel: string; mobileOpen: boolean; onOpenNavigation: () => void };

export function AdminPortalNavigation({ items, userName, roleLabel, mobileOpen, onOpenNavigation }: Props) {
  const pathname = usePathname() || "/admin/dashboard";
  const router = useRouter();
  const searchParams = useSearchParams();
  const crumbs = buildAdminBreadcrumbs(pathname, /\/applications\/|\/submissions\/detail\//.test(pathname) ? searchParams.toString() : undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const account = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const filtered = items.filter(item => `${item.label} ${item.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  const initials = userName.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  function openFinder() { setQuery(""); if (!dialog.current?.open) dialog.current?.showModal(); search.current?.focus(); }

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openFinder(); }
      if (event.key === "Escape" && account.current) account.current.open = false;
    };
    const outside = (event: PointerEvent) => { if (account.current && !account.current.contains(event.target as Node)) account.current.open = false; };
    document.addEventListener("keydown", keyboard); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", keyboard); document.removeEventListener("pointerdown", outside); };
  }, []);

  return <>
    <header className="cms-topbar">
      <div className="cms-topbar-title"><button className="cms-icon-button cms-mobile-only" type="button" onClick={onOpenNavigation} aria-label="Open navigation" aria-controls="cms-sidebar" aria-expanded={mobileOpen}><Menu size={21} /></button><div><p>UniMondo Content Studio</p><span>{crumbs.at(-1)?.label || "Overview"}</span></div></div>
      <div className="cms-topbar-actions">
        <button type="button" className="cms-find-trigger" onClick={openFinder} aria-label="Find a section"><Search size={17} aria-hidden /><span>Find a section…</span><kbd>⌘ K</kbd></button>
        <a className="cms-public-link" href="/" target="_blank" rel="noopener noreferrer">View website<ArrowUpRight size={15} aria-hidden /></a>
        <details ref={account} className="cms-account-menu">
          <summary aria-label={`${userName}, ${roleLabel}. Account menu`}><span className="cms-avatar">{initials || "U"}</span><span className="cms-user-label"><strong>{userName}</strong><small>{roleLabel}</small></span><ChevronDown size={15} aria-hidden /></summary>
          <div className="cms-account-panel"><p>{userName}<small>{roleLabel}</small></p><a href="/admin/settings#account"><Settings size={16} aria-hidden />My account</a><form action={signOutAdmin}><button type="submit"><LogOut size={16} aria-hidden />Sign out</button></form></div>
        </details>
      </div>
    </header>
    <div className="cms-breadcrumb-row">
      {crumbs.length > 1 && <button className="cms-back-button" type="button" aria-label="Go back" onClick={() => window.history.length > 1 ? router.back() : router.push(getAdminBackFallbackHref(pathname))}><ArrowLeft size={15} aria-hidden /></button>}
      <nav aria-label="Breadcrumb"><ol>{crumbs.map((crumb, index) => <li key={`${crumb.href}-${index}`}>{index > 0 && <ChevronRight size={12} aria-hidden />}{index === crumbs.length - 1 ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}</li>)}</ol></nav>
    </div>
    <dialog ref={dialog} className="cms-find-dialog" aria-labelledby="cms-finder-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="cms-finder-heading"><div><p className="cms-eyebrow">JUMP TO YOUR WORK</p><h2 id="cms-finder-title">Find a section</h2></div><button type="button" className="cms-icon-button" aria-label="Close section finder" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
      <label className="cms-finder-input"><Search size={18} aria-hidden /><span className="sr-only">Search your available sections</span><input ref={search} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your available sections" /></label>
      <div className="cms-finder-results">{filtered.length ? filtered.map(item => <Link key={item.id} href={item.href} onClick={() => dialog.current?.close()}><span className="cms-shortcut-icon"><CmsIcon name={item.icon} /></span><span>{item.label}<small>{item.group}</small></span><ChevronRight size={15} aria-hidden /></Link>) : <p className="cms-finder-empty">No matching sections. Try another name.</p>}</div>
      <p className="cms-finder-footnote">Search navigates the sections available to your account.</p>
    </dialog>
  </>;
}
