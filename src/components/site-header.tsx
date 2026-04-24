"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { siteNav } from "@/lib/site-copy";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "home" as const },
  { href: "/current-openings", key: "featuredUniversities" as const },
  { href: "/courses", key: "languageCourses" as const },
  { href: "/destinations", key: "countries" as const },
  { href: "/packages", key: "packages" as const },
  { href: "/about", key: "about" as const },
  { href: "/contact", key: "contact" as const },
  { href: "/blog", key: "blog" as const },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/current-openings") {
    return pathname === "/current-openings" || pathname === "/programs";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a1628]/92 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-white sm:text-xl"
        >
          <span className="text-amber-400">Uni</span>Mondo
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={`${item.href}-${item.key}`}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-2.5 py-2 text-[12px] font-semibold tracking-wide transition xl:px-3 xl:text-[13px]",
                isNavActive(pathname, item.href) ? "bg-white/10 text-amber-300" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {siteNav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Link
            href="/#eligibility"
            className="rounded-full border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/10 lg:px-4 lg:text-sm"
          >
            {siteNav.freeEligibilityCheck}
          </Link>
          <Link
            href="/apply"
            className="rounded-full bg-amber-500 px-3 py-2 text-xs font-semibold text-[#0a1628] shadow-md shadow-amber-500/20 transition hover:bg-amber-400 lg:px-4 lg:text-sm"
          >
            {siteNav.startApplication}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-white lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/10 bg-[#071020] lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={`m-${item.href}-${item.key}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-slate-200 hover:bg-white/5"
                >
                  {siteNav[item.key]}
                </Link>
              ))}
              <Link
                href="/#eligibility"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full border border-amber-500/40 px-4 py-3 text-center text-sm font-semibold text-amber-200"
              >
                {siteNav.freeEligibilityCheck}
              </Link>
              <Link
                href="/apply"
                onClick={() => setOpen(false)}
                className="rounded-full bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-[#0a1628]"
              >
                {siteNav.startApplication}
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
