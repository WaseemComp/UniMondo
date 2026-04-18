"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/current-openings", label: "Featured Universities" },
  { href: "/destinations", label: "Countries" },
  { href: "/packages", label: "Our Packages" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
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
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">
          <span className="text-amber-400">Uni</span>Mondo
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium transition xl:px-3 xl:text-sm",
                isNavActive(pathname, item.href) ? "bg-white/10 text-amber-300" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
          <Link
            href="/admin/login"
            className={cn(
              "rounded-full px-3 py-2 text-xs font-medium transition",
              pathname.startsWith("/admin") ? "text-amber-300" : "text-slate-500 hover:bg-white/5 hover:text-amber-300/90",
            )}
          >
            Staff sign in
          </Link>
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/#eligibility"
            className="rounded-full border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/10"
          >
            Free Eligibility Check
          </Link>
          <Link
            href="/apply"
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0a1628] shadow-md shadow-amber-500/20 transition hover:bg-amber-400"
          >
            Start Application
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
                  key={`m-${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-slate-200 hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/#eligibility"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full border border-amber-500/40 px-4 py-3 text-center text-sm font-semibold text-amber-200"
              >
                Free Eligibility Check
              </Link>
              <Link
                href="/apply"
                onClick={() => setOpen(false)}
                className="rounded-full bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-[#0a1628]"
              >
                Start Application
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setOpen(false)}
                className="mt-3 border-t border-white/10 pt-3 text-center text-sm font-medium text-slate-500 hover:text-amber-300/90"
              >
                Staff sign in
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
