import Link from "next/link";
import { FileText, Globe, Home, LayoutDashboard, Map, Newspaper } from "lucide-react";

const cards = [
  { href: "/admin/content/home", title: "Homepage copy", desc: "Hero headline, subtext, button labels", icon: Home },
  { href: "/admin/content/ticker", title: "News ticker", desc: "Banner lines under the main navigation", icon: Newspaper },
  { href: "/admin/data/programs", title: "Programs / openings", desc: "Current openings board & featured list", icon: FileText },
  { href: "/admin/data/countries", title: "Countries", desc: "Destination pages content", icon: Globe },
  { href: "/admin/data/regions", title: "Regions", desc: "Region group labels for filters", icon: Map },
  { href: "/admin/applications", title: "Applications", desc: "Review student submissions", icon: LayoutDashboard },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Choose an area to edit. Changes to programs and copy sync to the public site (within about a minute, or
          immediately after save where noted).
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
            >
              <c.icon className="h-8 w-8 text-amber-700" />
              <h2 className="mt-3 font-semibold text-zinc-900">{c.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{c.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
