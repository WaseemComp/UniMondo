"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAdmin } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  Gift,
  Globe,
  GraduationCap,
  Home,
  Inbox,
  Landmark,
  LayoutDashboard,
  LogOut,
  Map,
  Newspaper,
  Phone,
  ScrollText,
  Settings,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/programs", label: "Programs", icon: FileText },
  { href: "/admin/featured-universities", label: "Featured universities", icon: Landmark },
  { href: "/admin/packages", label: "Packages", icon: Gift },
  { href: "/admin/countries", label: "Countries", icon: Globe },
  { href: "/admin/blogs", label: "Blogs", icon: BookOpen },
  { href: "/admin/settings", label: "Site settings", icon: Settings },
  { section: "More" },
  { href: "/admin/applications", label: "Applications", icon: GraduationCap },
  { section: "Site content" },
  { href: "/admin/content/success-stories", label: "Success stories", icon: Sparkles },
  { href: "/admin/content/about", label: "About page", icon: ScrollText },
  { href: "/admin/content/team", label: "Team members", icon: Users },
  { href: "/admin/content/contact", label: "Contact management", icon: Phone },
  { section: "Submissions" },
  { href: "/admin/submissions/work-with-us", label: "Work with us", icon: Inbox },
  { href: "/admin/submissions/join-us", label: "Join us", icon: UserCircle2 },
  { section: "Legacy content" },
  { href: "/admin/content/home", label: "Homepage", icon: Home },
  { href: "/admin/content/ticker", label: "News ticker (multi)", icon: Newspaper },
  { href: "/admin/data/regions", label: "Regions", icon: Map },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-r border-zinc-200 bg-white lg:min-h-screen lg:w-64 lg:shrink-0">
      <div className="border-b border-zinc-200 p-4">
        <Link href="/admin/dashboard" className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">
          <span className="text-amber-600">Uni</span>Mondo Admin
        </Link>
        <p className="mt-1 text-xs text-zinc-500">CMS dashboard</p>
      </div>
      <nav className="flex max-h-[calc(100vh-8rem)] flex-1 flex-col gap-1 overflow-y-auto p-3">
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
