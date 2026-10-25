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
  { href: "/destinations", key: "destinations" as const },
  { href: "/courses", key: "languageCourses" as const },
  { href: "/packages", key: "packages" as const },
  { href: "/about", key: "about" as const },
  { href: "/contact", key: "contact" as const },
  { href: "/blog", key: "blog" as const },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/destinations") {
    return pathname === "/destinations" || pathname.startsWith("/destinations/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2DFD8]/80 bg-[#F8F7F3]/92 backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-editorial)] text-2xl font-bold tracking-tight text-[#244B50] sm:text-2xl transition hover:opacity-90"
        >
          <span>Uni</span>
          <span className="text-[#8A7345]">Mondo</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={`${item.href}-${item.key}`}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium tracking-normal transition xl:px-3",
                isNavActive(pathname, item.href)
                  ? "bg-[#244B50]/10 text-[#244B50] font-semibold"
                  : "text-[#4D5F64] hover:bg-[#E6EEE8]/70 hover:text-[#244B50]",
              )}
            >
              {siteNav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
          <Link
            href="/#eligibility"
            className="rounded-lg border border-[#244B50]/25 bg-white/60 px-3.5 py-2 text-xs font-semibold text-[#244B50] transition hover:bg-[#E6EEE8]/50 hover:border-[#244B50]/40 lg:px-4 lg:text-sm"
          >
            {siteNav.freeEligibilityCheck}
          </Link>
          <Link
            href="/apply"
            className="rounded-lg bg-[#244B50] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D3E42] lg:px-4 lg:text-sm"
          >
            {siteNav.startApplication}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-[#244B50] hover:bg-[#E6EEE8]/60 transition lg:hidden"
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
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-[#E2DFD8] bg-[#F8F7F3] shadow-xl lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={`m-${item.href}-${item.key}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-base font-medium transition",
                    isNavActive(pathname, item.href)
                      ? "bg-[#244B50]/10 text-[#244B50] font-semibold"
                      : "text-[#26343B] hover:bg-[#E6EEE8]/70",
                  )}
                >
                  {siteNav[item.key]}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-[#E2DFD8]">
                <Link
                  href="/#eligibility"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[#244B50]/30 bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#244B50]"
                >
                  {siteNav.freeEligibilityCheck}
                </Link>
                <Link
                  href="/apply"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-[#244B50] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm"
                >
                  {siteNav.startApplication}
                </Link>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
