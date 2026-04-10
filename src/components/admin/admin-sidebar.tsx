"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAdmin } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import { FileText, Globe, GraduationCap, Home, LayoutDashboard, LogOut, Map, Newspaper } from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: GraduationCap },
  { section: "Content" },
  { href: "/admin/content/home", label: "Homepage", icon: Home },
  { href: "/admin/content/ticker", label: "News ticker", icon: Newspaper },
  { section: "Data" },
  { href: "/admin/data/programs", label: "Programs", icon: FileText },
  { href: "/admin/data/countries", label: "Countries", icon: Globe },
  { href: "/admin/data/regions", label: "Regions", icon: Map },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-r border-zinc-200 bg-white lg:min-h-screen lg:w-64">
      <div className="border-b border-zinc-200 p-4">
        <Link href="/admin/dashboard" className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">
          <span className="text-amber-600">Uni</span>Mondo Admin
        </Link>
        <p className="mt-1 text-xs text-zinc-500">Content & programs</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item, i) =>
          "section" in item ? (
            <p key={`s-${i}`} className="mt-3 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 first:mt-0">
              {item.section}
            </p>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-amber-50 text-amber-900"
                  : "text-zinc-700 hover:bg-zinc-50",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ),
        )}
      </nav>
      <div className="border-t border-zinc-200 p-3">
        <Link href="/" className="mb-2 block rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
          ← Public site
        </Link>
        <form action={signOutAdmin}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
